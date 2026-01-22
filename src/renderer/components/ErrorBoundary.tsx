/**
 * Error Boundary
 *
 * Catches React errors and displays them via toast notifications
 * instead of crashing the entire app.
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from 'adnia-ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showFallback?: boolean; // If true, shows fallback UI; if false, returns null to recover
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Global error handler for toast notifications
let globalErrorHandler: ((error: Error, context?: string) => void) | null = null;

export function setGlobalErrorHandler(handler: (error: Error, context?: string) => void) {
  globalErrorHandler = handler;
}

export function clearGlobalErrorHandler() {
  globalErrorHandler = null;
}

/**
 * Report an error to the global handler (shows as toast)
 */
export function reportError(error: Error | string, context?: string) {
  const err = typeof error === 'string' ? new Error(error) : error;
  if (globalErrorHandler) {
    globalErrorHandler(err, context);
  } else {
    console.error('[ErrorBoundary] No global handler set:', err);
  }
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Report to global handler for toast
    if (globalErrorHandler) {
      const componentStack = errorInfo.componentStack?.split('\n')[1]?.trim() || '';
      const context = componentStack ? `in ${componentStack}` : undefined;
      globalErrorHandler(error, context);
    }

    // Log to console
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showFallback = true } = this.props;

    if (hasError) {
      // If showFallback is false, try to continue (useful for non-critical components)
      if (!showFallback) {
        return null;
      }

      // Custom fallback
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="max-w-md w-full bg-red-950/30 border border-red-500/30 rounded-lg p-6">
            <AlertTriangle size={40} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-red-300 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-red-400/80 mb-4">
              {error?.message || 'An unexpected error occurred'}
            </p>

            {errorInfo && (
              <details className="text-left mb-4">
                <summary className="text-xs text-red-400/60 cursor-pointer hover:text-red-400">
                  Show details
                </summary>
                <pre className="mt-2 text-xs text-red-400/50 overflow-auto max-h-32 bg-red-950/50 p-2 rounded">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={this.handleRetry}
            >
              <RefreshCw size={14} className="mr-2" />
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-friendly wrapper for catching errors in async operations
 * and event handlers (which ErrorBoundary doesn't catch)
 */
export function withErrorHandling<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context?: string
): T {
  return ((...args: unknown[]) => {
    try {
      const result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          reportError(error, context);
        });
      }

      return result;
    } catch (error) {
      reportError(error as Error, context);
    }
  }) as T;
}

/**
 * Safe wrapper that catches errors and returns fallback instead of throwing
 */
export function safeCall<T>(
  fn: () => T,
  fallback: T,
  context?: string
): T {
  try {
    return fn();
  } catch (error) {
    reportError(error as Error, context);
    return fallback;
  }
}
