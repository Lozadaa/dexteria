/**
 * KeyboardShortcutsModal
 *
 * Modal that displays all available keyboard shortcuts.
 * Opens with ? or F1 key.
 */

import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { IconButton } from 'adnia-ui';
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { useTranslation } from '../i18n/useTranslation';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Group shortcuts by category
  const categories = {
    navigation: KEYBOARD_SHORTCUTS.filter(s => s.category === 'navigation'),
    mode: KEYBOARD_SHORTCUTS.filter(s => s.category === 'mode'),
    actions: KEYBOARD_SHORTCUTS.filter(s => s.category === 'actions'),
    general: KEYBOARD_SHORTCUTS.filter(s => s.category === 'general'),
  };

  const categoryLabels: Record<string, string> = {
    navigation: t('shortcuts.navigation'),
    mode: t('shortcuts.mode'),
    actions: t('shortcuts.actions'),
    general: t('shortcuts.general'),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('shortcuts.title')}</h2>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('actions.close')}
          >
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
          {Object.entries(categories).map(([category, shortcuts]) => (
            shortcuts.length > 0 && (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {categoryLabels[category]}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.keys}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-foreground">
                        {t(shortcut.action)}
                      </span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border text-muted-foreground">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/10 text-center">
          <span className="text-xs text-muted-foreground">
            {t('shortcuts.pressToClose')}
          </span>
        </div>
      </div>
    </div>
  );
};
