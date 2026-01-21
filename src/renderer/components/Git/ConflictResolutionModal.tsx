/**
 * ConflictResolutionModal Component
 *
 * Modal for resolving Git merge conflicts with three-way diff view.
 */

import React, { useState, useEffect } from 'react';
import type { ConflictInfo } from '../../../shared/types';

interface ConflictResolutionModalProps {
  conflicts: ConflictInfo[];
  onResolve: (filePath: string, resolution: 'ours' | 'theirs' | 'manual', content?: string) => Promise<boolean>;
  onAbort: () => Promise<boolean>;
  onComplete: () => void;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflicts,
  onResolve,
  onAbort,
  onComplete,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [resolving, setResolving] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConflict = conflicts[selectedIndex];
  const resolvedCount = conflicts.filter((c) => c.status === 'resolved').length;
  const allResolved = resolvedCount === conflicts.length;

  // Update manual content when selection changes
  useEffect(() => {
    if (selectedConflict) {
      setManualContent(selectedConflict.oursContent || '');
      setShowManualEditor(false);
    }
  }, [selectedIndex, selectedConflict]);

  const handleResolve = async (resolution: 'ours' | 'theirs' | 'manual') => {
    if (!selectedConflict) return;

    try {
      setResolving(true);
      setError(null);

      const content = resolution === 'manual' ? manualContent : undefined;
      const success = await onResolve(selectedConflict.filePath, resolution, content);

      if (success) {
        setShowManualEditor(false);
        // Move to next unresolved conflict
        const nextUnresolved = conflicts.findIndex(
          (c, i) => i > selectedIndex && c.status === 'unresolved'
        );
        if (nextUnresolved >= 0) {
          setSelectedIndex(nextUnresolved);
        }
      } else {
        setError('Failed to resolve conflict');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  };

  const handleAbort = async () => {
    try {
      setResolving(true);
      const success = await onAbort();
      if (success) {
        onClose();
      } else {
        setError('Failed to abort merge');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to abort merge');
    } finally {
      setResolving(false);
    }
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-[90vw] h-[85vh] max-w-6xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Resolve Merge Conflicts</h2>
            <p className="text-sm text-gray-400 mt-1">
              {resolvedCount} of {conflicts.length} conflicts resolved
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAbort}
              disabled={resolving}
              className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Abort Merge
            </button>
            <button
              type="button"
              onClick={onComplete}
              disabled={!allResolved || resolving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Complete Merge
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* File List */}
          <div className="w-64 border-r border-gray-700 overflow-y-auto">
            <div className="p-2">
              {conflicts.map((conflict, index) => (
                <button
                  key={conflict.filePath}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg mb-1 text-sm
                    ${index === selectedIndex ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300 hover:bg-white/5'}
                    transition-colors
                  `}
                >
                  <div className="flex items-center gap-2">
                    {conflict.status === 'resolved' ? (
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : conflict.isBinary ? (
                      <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className="truncate font-mono text-xs">
                      {conflict.filePath.split('/').pop()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1 ml-6">
                    {conflict.filePath}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {selectedConflict && (
              <>
                {/* File Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border-b border-gray-700">
                  <div>
                    <span className="font-mono text-sm text-gray-300">
                      {selectedConflict.filePath}
                    </span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                      selectedConflict.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {selectedConflict.status}
                    </span>
                  </div>
                  {selectedConflict.isBinary && (
                    <span className="text-xs text-yellow-400">Binary file</span>
                  )}
                </div>

                {/* Diff View or Binary Warning */}
                {selectedConflict.isBinary ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-lg mb-2">Binary file conflict</p>
                      <p className="text-sm">Choose which version to keep</p>
                    </div>
                  </div>
                ) : showManualEditor ? (
                  /* Manual Editor */
                  <div className="flex-1 flex flex-col min-h-0">
                    <textarea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none"
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  /* Three-way diff view */
                  <div className="flex-1 flex min-h-0">
                    {/* Ours */}
                    <div className="flex-1 flex flex-col border-r border-gray-700">
                      <div className="px-3 py-2 bg-blue-500/10 text-blue-400 text-xs font-medium">
                        Ours (current branch)
                      </div>
                      <pre className="flex-1 p-4 overflow-auto bg-gray-900 text-gray-300 font-mono text-xs">
                        {selectedConflict.oursContent || '(empty)'}
                      </pre>
                    </div>

                    {/* Base (if available) */}
                    {selectedConflict.baseContent && (
                      <div className="flex-1 flex flex-col border-r border-gray-700">
                        <div className="px-3 py-2 bg-gray-500/10 text-gray-400 text-xs font-medium">
                          Base (common ancestor)
                        </div>
                        <pre className="flex-1 p-4 overflow-auto bg-gray-900 text-gray-300 font-mono text-xs">
                          {selectedConflict.baseContent}
                        </pre>
                      </div>
                    )}

                    {/* Theirs */}
                    <div className="flex-1 flex flex-col">
                      <div className="px-3 py-2 bg-purple-500/10 text-purple-400 text-xs font-medium">
                        Theirs (incoming branch)
                      </div>
                      <pre className="flex-1 p-4 overflow-auto bg-gray-900 text-gray-300 font-mono text-xs">
                        {selectedConflict.theirsContent || '(empty)'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedConflict.status !== 'resolved' && (
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolve('ours')}
                        disabled={resolving}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                      >
                        Use Ours
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve('theirs')}
                        disabled={resolving}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                      >
                        Use Theirs
                      </button>
                      {!selectedConflict.isBinary && (
                        <button
                          type="button"
                          onClick={() => setShowManualEditor(!showManualEditor)}
                          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                        >
                          {showManualEditor ? 'View Diff' : 'Edit Manually'}
                        </button>
                      )}
                    </div>
                    {showManualEditor && (
                      <button
                        type="button"
                        onClick={() => handleResolve('manual')}
                        disabled={resolving}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                      >
                        Save Manual Resolution
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Progress Bar */}
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${(resolvedCount / conflicts.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
