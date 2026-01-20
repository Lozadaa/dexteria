/**
 * Jira OAuth 2.0 Authentication Manager
 *
 * Handles the OAuth 2.0 (3LO) flow for Jira Cloud.
 * https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
 */

const {
  ATLASSIAN_AUTH_URL,
  ATLASSIAN_TOKEN_URL,
  ATLASSIAN_API_URL,
  OAUTH_SCOPES
} = require('./constants');

class AuthManager {
  constructor(storage, log) {
    this.storage = storage;
    this.log = log;
    this.callbackServer = null;
  }

  /**
   * Get OAuth configuration from storage or use defaults
   */
  async getOAuthConfig() {
    const settings = await this.storage.get('settings') || {};
    return {
      clientId: settings.clientId || '',
      clientSecret: settings.clientSecret || '',
      redirectUri: settings.redirectUri || 'http://localhost:19846/callback'
    };
  }

  /**
   * Check if OAuth is configured
   */
  async isConfigured() {
    const config = await this.getOAuthConfig();
    return !!(config.clientId && config.clientSecret);
  }

  /**
   * Generate the authorization URL for the OAuth flow
   */
  async getAuthorizationUrl() {
    const config = await this.getOAuthConfig();

    if (!config.clientId) {
      throw new Error('OAuth Client ID not configured');
    }

    const state = this.generateState();
    await this.storage.set('oauth_state', state);

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: config.clientId,
      scope: OAUTH_SCOPES.join(' '),
      redirect_uri: config.redirectUri,
      response_type: 'code',
      prompt: 'consent',
      state: state
    });

    return `${ATLASSIAN_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code, state) {
    // Verify state
    const savedState = await this.storage.get('oauth_state');
    if (state !== savedState) {
      throw new Error('Invalid OAuth state - possible CSRF attack');
    }
    await this.storage.delete('oauth_state');

    const config = await this.getOAuthConfig();

    const response = await fetch(ATLASSIAN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.text();
      this.log.error(`Token exchange failed: ${error}`);
      throw new Error(`Failed to exchange code for tokens: ${response.status}`);
    }

    const tokens = await response.json();
    this.log.info('Successfully obtained access tokens');

    // Get accessible resources (Jira sites)
    const sites = await this.getAccessibleResources(tokens.access_token);

    if (sites.length === 0) {
      throw new Error('No accessible Jira sites found');
    }

    // Store connection info (using first site)
    const site = sites[0];
    await this.storage.set('connection', {
      cloudId: site.id,
      siteUrl: site.url,
      siteName: site.name,
      accessToken: this.encrypt(tokens.access_token),
      refreshToken: this.encrypt(tokens.refresh_token),
      tokenExpiry: Date.now() + (tokens.expires_in * 1000),
      connectedAt: new Date().toISOString()
    });

    this.log.info(`Connected to Jira site: ${site.name} (${site.url})`);
    return { site, sites };
  }

  /**
   * Get list of accessible Jira sites
   */
  async getAccessibleResources(accessToken) {
    const response = await fetch(
      `${ATLASSIAN_API_URL}/oauth/token/accessible-resources`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get accessible Jira sites');
    }

    const resources = await response.json();

    // Filter to only Jira sites
    return resources.filter(r =>
      r.scopes && r.scopes.some(s => s.includes('jira'))
    );
  }

  /**
   * Refresh the access token
   */
  async refreshTokens() {
    const connection = await this.storage.get('connection');
    if (!connection?.refreshToken) {
      throw new Error('No refresh token available - please reconnect');
    }

    const config = await this.getOAuthConfig();

    const response = await fetch(ATLASSIAN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: this.decrypt(connection.refreshToken)
      })
    });

    if (!response.ok) {
      this.log.error('Token refresh failed - user needs to reconnect');
      await this.disconnect();
      throw new Error('Token refresh failed - please reconnect to Jira');
    }

    const tokens = await response.json();

    // Update stored tokens
    await this.storage.set('connection', {
      ...connection,
      accessToken: this.encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token
        ? this.encrypt(tokens.refresh_token)
        : connection.refreshToken,
      tokenExpiry: Date.now() + (tokens.expires_in * 1000)
    });

    this.log.info('Access token refreshed');
    return tokens.access_token;
  }

  /**
   * Get a valid access token, refreshing if needed
   */
  async getAccessToken() {
    const connection = await this.storage.get('connection');
    if (!connection) {
      throw new Error('Not connected to Jira');
    }

    // Refresh if token expires in less than 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (connection.tokenExpiry < Date.now() + fiveMinutes) {
      this.log.info('Token expiring soon, refreshing...');
      return this.refreshTokens();
    }

    return this.decrypt(connection.accessToken);
  }

  /**
   * Check if connected to Jira
   */
  async isConnected() {
    const connection = await this.storage.get('connection');
    return !!(connection?.accessToken && connection?.cloudId);
  }

  /**
   * Get connection info
   */
  async getConnectionInfo() {
    const connection = await this.storage.get('connection');
    if (!connection) return null;

    return {
      cloudId: connection.cloudId,
      siteUrl: connection.siteUrl,
      siteName: connection.siteName,
      connectedAt: connection.connectedAt,
      tokenExpiry: connection.tokenExpiry
    };
  }

  /**
   * Disconnect from Jira
   */
  async disconnect() {
    await this.storage.delete('connection');
    await this.storage.delete('oauth_state');
    this.log.info('Disconnected from Jira');
  }

  /**
   * Simple encryption for token storage
   * In production, use a proper encryption library or OS keychain
   */
  encrypt(value) {
    if (!value) return value;
    return Buffer.from(value).toString('base64');
  }

  decrypt(value) {
    if (!value) return value;
    return Buffer.from(value, 'base64').toString('utf-8');
  }

  /**
   * Generate a random state parameter for CSRF protection
   */
  generateState() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = { AuthManager };
