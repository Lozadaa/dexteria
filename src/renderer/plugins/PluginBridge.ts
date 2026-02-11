/**
 * Plugin Bridge
 *
 * Provides secure communication between the main application and plugin iframes.
 * Uses postMessage for cross-origin communication.
 */

// Message types for plugin communication
export type PluginMessageType =
  | 'dexteria:init'
  | 'dexteria:context'
  | 'dexteria:call'
  | 'dexteria:result'
  | 'dexteria:event'
  | 'dexteria:resize';

interface PluginMessage {
  type: PluginMessageType;
  pluginId: string;
  payload: unknown;
  requestId?: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Bridge for communicating with a plugin iframe.
 * Provides a typed API for sending messages and receiving responses.
 */
export class PluginBridge {
  private pluginId: string;
  private iframe: HTMLIFrameElement;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestIdCounter = 0;
  private destroyed = false;

  constructor(pluginId: string, iframe: HTMLIFrameElement) {
    this.pluginId = pluginId;
    this.iframe = iframe;
    this.setupMessageHandler();
  }

  /**
   * Set up the message event handler
   */
  private setupMessageHandler(): void {
    this.messageHandler = (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (event.source !== this.iframe.contentWindow) return;

      try {
        const message = event.data as PluginMessage;

        // Validate message structure
        if (!message || typeof message.type !== 'string') return;
        if (message.pluginId !== this.pluginId) return;

        this.handleMessage(message);
      } catch (err) {
        console.error(`[PluginBridge:${this.pluginId}] Error handling message:`, err);
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Handle incoming messages from the plugin
   */
  private handleMessage(message: PluginMessage): void {
    switch (message.type) {
      case 'dexteria:result':
        // Handle response to a call we made
        if (message.requestId) {
          const pending = this.pendingRequests.get(message.requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(message.requestId);

            const payload = message.payload as { success: boolean; result?: unknown; error?: string };
            if (payload.success) {
              pending.resolve(payload.result);
            } else {
              pending.reject(new Error(payload.error || 'Unknown error'));
            }
          }
        }
        break;

      case 'dexteria:call':
        // Plugin is calling an API method
        this.handlePluginCall(message);
        break;

      case 'dexteria:resize':
        // Plugin wants to resize its container
        this.handleResize(message.payload as { height: number });
        break;

      case 'dexteria:event':
        // Plugin is emitting an event
        this.handlePluginEvent(message.payload as { event: string; data: unknown });
        break;
    }
  }

  /**
   * Handle API calls from the plugin
   */
  private async handlePluginCall(message: PluginMessage): Promise<void> {
    const { method, args, requestId } = message.payload as {
      method: string;
      args: unknown[];
      requestId: string;
    };

    try {
      // Only allow specific safe API calls
      const result = await this.executeApiCall(method, args);
      this.sendMessage('dexteria:result', {
        success: true,
        result,
        requestId,
      });
    } catch (err) {
      this.sendMessage('dexteria:result', {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        requestId,
      });
    }
  }

  /**
   * Execute a safe API call requested by the plugin
   */
  private async executeApiCall(method: string, args: unknown[]): Promise<unknown> {
    // Whitelist of allowed API methods
    const allowedMethods: Record<string, (...args: unknown[]) => Promise<unknown>> = {
      // Task read operations
      'tasks.getAll': async () => window.dexteria.tasks.getAll(),
      'tasks.get': async (taskId: unknown) => window.dexteria.tasks.get(taskId as string),

      // Plugin API calls (plugin can call its own API)
      'plugin.callApi': async (pluginId: unknown, methodName: unknown, ...rest: unknown[]) => {
        // Only allow calling own plugin API
        if (pluginId !== this.pluginId) {
          throw new Error('Plugins can only call their own API');
        }
        return window.dexteria.plugin.callApi(pluginId as string, methodName as string, ...rest);
      },
    };

    const handler = allowedMethods[method];
    if (!handler) {
      throw new Error(`Method not allowed: ${method}`);
    }

    return handler(...args);
  }

  /**
   * Handle resize requests from the plugin
   */
  private handleResize(payload: { height: number }): void {
    if (typeof payload.height === 'number' && payload.height > 0) {
      // Cap the height to a reasonable maximum
      const maxHeight = 500;
      const height = Math.min(payload.height, maxHeight);
      this.iframe.style.height = `${height}px`;
    }
  }

  /**
   * Handle events emitted by the plugin
   */
  private handlePluginEvent(payload: { event: string; data: unknown }): void {
    // Dispatch a custom event that parent components can listen to
    const customEvent = new CustomEvent(`plugin:${this.pluginId}:${payload.event}`, {
      detail: payload.data,
      bubbles: true,
    });
    this.iframe.dispatchEvent(customEvent);
  }

  /**
   * Send a message to the plugin iframe
   */
  private sendMessage(type: PluginMessageType, payload: unknown, requestId?: string): void {
    if (this.destroyed) return;
    if (!this.iframe.contentWindow) return;

    const message: PluginMessage = {
      type,
      pluginId: this.pluginId,
      payload,
      requestId,
    };

    this.iframe.contentWindow.postMessage(message, '*');
  }

  /**
   * Send initialization message to the plugin
   */
  sendInit(): void {
    this.sendMessage('dexteria:init', {
      pluginId: this.pluginId,
      version: '1.0.0',
    });
  }

  /**
   * Send context data to the plugin
   */
  sendContext(context: Record<string, unknown>): void {
    this.sendMessage('dexteria:context', context);
  }

  /**
   * Call a method on the plugin and wait for response
   */
  async call(method: string, ...args: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = `req-${++this.requestIdCounter}`;

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Plugin call timeout: ${method}`));
      }, 10000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.sendMessage('dexteria:call', { method, args }, requestId);
    });
  }

  /**
   * Send an event to the plugin
   */
  emit(event: string, data: unknown): void {
    this.sendMessage('dexteria:event', { event, data });
  }

  /**
   * Clean up the bridge
   */
  destroy(): void {
    this.destroyed = true;

    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    // Reject all pending requests
    for (const [_requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Plugin bridge destroyed'));
    }
    this.pendingRequests.clear();
  }
}

export default PluginBridge;
