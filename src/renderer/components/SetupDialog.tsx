/**
 * SetupDialog Component
 *
 * Shows a setup dialog for installing OpenCode on first run.
 * Displays progress during download and installation.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface InstallProgress {
  phase: 'checking' | 'downloading' | 'extracting' | 'verifying' | 'complete' | 'error';
  percent: number;
  message: string;
}

interface SetupDialogProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function SetupDialog({ onComplete, onSkip }: SetupDialogProps) {
  const [status, setStatus] = useState<'idle' | 'installing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for progress updates
  useEffect(() => {
    const cleanup = window.dexteria.opencode.onInstallProgress((progress) => {
      setProgress(progress);

      if (progress.phase === 'complete') {
        setStatus('complete');
        // Auto-close after 2 seconds
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else if (progress.phase === 'error') {
        setStatus('error');
        setError(progress.message);
      }
    });

    return cleanup;
  }, [onComplete]);

  const handleInstall = useCallback(async () => {
    setStatus('installing');
    setError(null);

    try {
      const result = await window.dexteria.opencode.install();

      if (!result.success) {
        setStatus('error');
        setError(result.error || 'Installation failed');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleSkip = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'checking':
        return '🔍';
      case 'downloading':
        return '⬇️';
      case 'extracting':
        return '📦';
      case 'verifying':
        return '✅';
      case 'complete':
        return '🎉';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Logo/Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome to Dexteria</h2>
          <p className="text-gray-400 mt-2">
            Let's set up your AI assistant
          </p>
        </div>

        {/* Content based on status */}
        {status === 'idle' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">OpenCode Setup</h3>
              <p className="text-gray-400 text-sm">
                Dexteria uses OpenCode as its AI engine. We'll download and install it
                automatically. This only needs to happen once.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleInstall}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Install OpenCode
              </button>

              {onSkip && (
                <button
                  onClick={handleSkip}
                  className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center">
              By installing, you agree to the{' '}
              <a
                href="https://github.com/sst/opencode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                OpenCode license
              </a>
            </p>
          </div>
        )}

        {status === 'installing' && progress && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-4">{getPhaseIcon(progress.phase)}</div>
              <p className="text-white font-medium">{progress.message}</p>
            </div>

            {/* Progress bar */}
            <div className="relative">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                {Math.round(progress.percent)}%
              </p>
            </div>
          </div>
        )}

        {status === 'complete' && (
          <div className="text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <div>
              <h3 className="text-xl font-semibold text-white">All Set!</h3>
              <p className="text-gray-400 mt-1">OpenCode is ready to use</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-lg font-semibold text-white">Installation Failed</h3>
              <p className="text-red-400 text-sm mt-2">{error}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleInstall}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>

              {onSkip && (
                <button
                  onClick={handleSkip}
                  className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors"
                >
                  Continue without OpenCode
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SetupDialog;
