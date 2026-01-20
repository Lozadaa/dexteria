/**
 * PolicyGuard Tests
 *
 * Security-critical tests for path validation, command validation,
 * and limit enforcement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyGuard } from '../PolicyGuard';
import type { Policy } from '../../../shared/types';

// Test fixture: default policy
function createTestPolicy(overrides?: Partial<Policy>): Policy {
  return {
    allowedPaths: ['src/**', 'tests/**', 'package.json'],
    allowedOperations: ['read', 'write'],
    blockedPaths: ['node_modules/**', '.git/**'],
    blockedPatterns: ['*.env', '*.pem', '*.key', 'credentials.*', 'secrets.*'],
    maxFileSize: 1024 * 1024, // 1MB
    shellCommands: {
      allowed: ['npm', 'git', 'node', 'npx', 'tsc'],
      blocked: ['rm -rf', 'sudo', 'chmod', 'curl', 'wget'],
      requireConfirmation: ['git push', 'npm publish'],
    },
    requireConfirmation: ['delete', 'git push'],
    limits: {
      maxStepsPerRun: 50,
      maxFilesPerRun: 20,
      maxDiffLinesPerRun: 1000,
      maxRuntimeMinutes: 30,
      allowedGlobs: ['**/*'],
      blockedGlobs: [],
    },
    ...overrides,
  };
}

describe('PolicyGuard', () => {
  let guard: PolicyGuard;
  const projectRoot = '/project';

  beforeEach(() => {
    guard = new PolicyGuard(projectRoot, createTestPolicy());
  });

  describe('Path Validation', () => {
    describe('validatePath', () => {
      it('should allow paths within project root', () => {
        const result = guard.validatePath('src/index.ts');
        expect(result.allowed).toBe(true);
      });

      it('should allow absolute paths within project root', () => {
        const result = guard.validatePath('/project/src/index.ts');
        expect(result.allowed).toBe(true);
      });

      it('should block path traversal with ../', () => {
        const result = guard.validatePath('../outside/file.ts');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('traversal');
      });

      it('should block path traversal with absolute path outside root', () => {
        const result = guard.validatePath('/etc/passwd');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('traversal');
      });

      it('should block paths matching blocked patterns', () => {
        const result = guard.validatePath('config/.env');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('blocked pattern');
      });

      it('should block .pem files', () => {
        const result = guard.validatePath('keys/server.pem');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('blocked pattern');
      });

      it('should block .key files', () => {
        const result = guard.validatePath('certs/private.key');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('blocked pattern');
      });

      it('should block credentials files', () => {
        const result = guard.validatePath('credentials.json');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('blocked pattern');
      });

      it('should block secrets files', () => {
        const result = guard.validatePath('secrets.yaml');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('blocked pattern');
      });

      it('should block paths in blocked directories', () => {
        const result = guard.validatePath('node_modules/lodash/index.js');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('blocked by policy');
      });

      it('should block .git directory access', () => {
        const result = guard.validatePath('.git/config');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('blocked by policy');
      });
    });

    describe('validateRead', () => {
      it('should allow reading files in allowed paths', () => {
        const result = guard.validateRead('src/index.ts');
        expect(result.allowed).toBe(true);
      });

      it('should block reading when read operation is disabled', () => {
        guard = new PolicyGuard(projectRoot, createTestPolicy({
          allowedOperations: ['write'], // No read
        }));
        const result = guard.validateRead('src/index.ts');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('not allowed');
      });

      it('should block reading files outside allowed paths', () => {
        guard = new PolicyGuard(projectRoot, createTestPolicy({
          allowedPaths: ['src/**'], // Only src
        }));
        const result = guard.validateRead('config/settings.json');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('not in allowed');
      });
    });

    describe('validateWrite', () => {
      it('should allow writing files in allowed paths', () => {
        const result = guard.validateWrite('src/new-file.ts');
        expect(result.allowed).toBe(true);
      });

      it('should block writing when write operation is disabled', () => {
        guard = new PolicyGuard(projectRoot, createTestPolicy({
          allowedOperations: ['read'], // No write
        }));
        const result = guard.validateWrite('src/index.ts');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('not allowed');
      });

      it('should block writing files that exceed max size', () => {
        const result = guard.validateWrite('src/large-file.ts', 2 * 1024 * 1024); // 2MB
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('exceeds limit');
      });

      it('should allow writing files under max size', () => {
        const result = guard.validateWrite('src/small-file.ts', 1024); // 1KB
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('Command Validation', () => {
    describe('validateCommand', () => {
      it('should allow commands with allowed prefixes', () => {
        expect(guard.validateCommand('npm install').allowed).toBe(true);
        expect(guard.validateCommand('npm test').allowed).toBe(true);
        expect(guard.validateCommand('git status').allowed).toBe(true);
        expect(guard.validateCommand('node script.js').allowed).toBe(true);
        expect(guard.validateCommand('tsc --build').allowed).toBe(true);
      });

      it('should block commands not in allowed list', () => {
        const result = guard.validateCommand('python script.py');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('not in the allowed list');
      });

      it('should block commands with blocked patterns', () => {
        expect(guard.validateCommand('rm -rf /').allowed).toBe(false);
        expect(guard.validateCommand('sudo npm install').allowed).toBe(false);
        expect(guard.validateCommand('curl http://example.com').allowed).toBe(false);
        expect(guard.validateCommand('wget http://example.com').allowed).toBe(false);
      });

      it('should block rm -rf even when disguised (via metacharacter)', () => {
        // This now gets blocked by the shell metacharacter check first
        // because && contains a single & which is a background/chaining char
        const result = guard.validateCommand('npm install && rm -rf /');
        expect(result.allowed).toBe(false);
        // Command is blocked due to shell metacharacters, not the 'rm -rf' pattern
        expect(result.reason).toContain('shell metacharacter');
      });

      it('should block sudo even in the middle of command', () => {
        const result = guard.validateCommand('npm run sudo-task');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('blocked pattern');
      });

      it('should handle commands with full paths', () => {
        const result = guard.validateCommand('/usr/bin/npm install');
        expect(result.allowed).toBe(true);
      });

      // Shell metacharacter security tests
      describe('shell metacharacter blocking', () => {
        it('should block backtick command substitution', () => {
          const result = guard.validateCommand('npm install `whoami`');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('backtick');
        });

        it('should block $() command substitution', () => {
          const result = guard.validateCommand('npm install $(whoami)');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('command substitution');
        });

        it('should block ${} variable expansion', () => {
          const result = guard.validateCommand('npm install ${MALICIOUS}');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('variable expansion');
        });

        it('should block pipe commands', () => {
          const result = guard.validateCommand('npm list | grep lodash');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('pipe');
        });

        it('should block output redirection', () => {
          const result = guard.validateCommand('npm list > output.txt');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('output redirection');
        });

        it('should block input redirection', () => {
          const result = guard.validateCommand('npm install < packages.txt');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('input redirection');
        });

        it('should block semicolon command chaining', () => {
          const result = guard.validateCommand('npm install; rm -rf /');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('semicolon');
        });

        it('should block newline command chaining', () => {
          const result = guard.validateCommand('npm install\nrm -rf /');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('newline');
        });

        it('should block single & for background execution', () => {
          const result = guard.validateCommand('npm install & rm -rf /');
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('background');
        });

        it('should allow safe npm commands without metacharacters', () => {
          expect(guard.validateCommand('npm install lodash').allowed).toBe(true);
          expect(guard.validateCommand('npm test').allowed).toBe(true);
          expect(guard.validateCommand('npm run build').allowed).toBe(true);
        });
      });
    });
  });

  describe('Limit Enforcement', () => {
    describe('enforceDiffLimits', () => {
      it('should allow changes within limits', () => {
        const result = guard.enforceDiffLimits({
          filesChanged: 5,
          linesAdded: 100,
          linesRemoved: 50,
        });
        expect(result.allowed).toBe(true);
      });

      it('should block when files changed exceeds limit', () => {
        const result = guard.enforceDiffLimits({
          filesChanged: 25, // exceeds 20
          linesAdded: 100,
          linesRemoved: 50,
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('exceeds limit');
      });

      it('should block when diff lines exceed limit', () => {
        const result = guard.enforceDiffLimits({
          filesChanged: 5,
          linesAdded: 800,
          linesRemoved: 500, // total 1300 exceeds 1000
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('exceeds limit');
      });
    });

    describe('enforceRuntimeLimits', () => {
      it('should allow execution within limits', () => {
        const result = guard.enforceRuntimeLimits({
          startTime: Date.now() - 60000, // 1 minute ago
          stepsExecuted: 10,
          filesModified: ['file1.ts', 'file2.ts'],
        });
        expect(result.allowed).toBe(true);
      });

      it('should block when steps exceed limit', () => {
        const result = guard.enforceRuntimeLimits({
          startTime: Date.now() - 60000,
          stepsExecuted: 60, // exceeds 50
          filesModified: [],
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('exceeds limit');
      });

      it('should block when files modified exceed limit', () => {
        const result = guard.enforceRuntimeLimits({
          startTime: Date.now() - 60000,
          stepsExecuted: 10,
          filesModified: Array(25).fill('file.ts'), // exceeds 20
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('exceeds limit');
      });

      it('should block when runtime exceeds limit', () => {
        const result = guard.enforceRuntimeLimits({
          startTime: Date.now() - 35 * 60 * 1000, // 35 minutes ago (exceeds 30)
          stepsExecuted: 10,
          filesModified: [],
        });
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('exceeds limit');
      });
    });
  });

  describe('Utility Methods', () => {
    it('should check if path is within project', () => {
      expect(guard.isWithinProject('src/index.ts')).toBe(true);
      expect(guard.isWithinProject('../outside/file.ts')).toBe(false);
      expect(guard.isWithinProject('/etc/passwd')).toBe(false);
    });

    it('should check if operation requires confirmation', () => {
      expect(guard.requiresConfirmation('delete')).toBe(true);
      expect(guard.requiresConfirmation('git push')).toBe(true);
      expect(guard.requiresConfirmation('read')).toBe(false);
    });

    it('should redact sensitive content', () => {
      const content = 'password: secret123\napi_key: abcd1234\ntoken: bearer xyz';
      const redacted = guard.redactSecrets(content);
      expect(redacted).not.toContain('secret123');
      expect(redacted).not.toContain('abcd1234');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact private keys', () => {
      const content = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANB...\n-----END PRIVATE KEY-----';
      const redacted = guard.redactSecrets(content);
      expect(redacted).toBe('[REDACTED]');
    });

    it('should redact bearer tokens', () => {
      const content = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const redacted = guard.redactSecrets(content);
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });
});
