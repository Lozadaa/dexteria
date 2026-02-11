/**
 * Theme Editor
 *
 * A JSON editor for customizing themes.
 * Provides a code-style editor with syntax highlighting
 * and real-time validation.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Spinner, AlertBanner } from 'adnia-ui';
import { useThemeContext } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import {
  Save,
  RotateCcw,
  Copy,
  Download,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { CustomTheme } from '../../shared/types';

import { useTranslation } from '../i18n/useTranslation';
/**
 * Syntax highlight JSON string
 * Returns HTML with colored spans
 * Uses token-based approach to avoid regex conflicts
 */
function highlightJson(json: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < json.length) {
    const char = json[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      result.push(char);
      i++;
      continue;
    }

    // String (starts with ")
    if (char === '"') {
      let str = '"';
      i++;
      while (i < json.length) {
        const c = json[i];
        str += c;
        if (c === '\\' && i + 1 < json.length) {
          i++;
          str += json[i];
        } else if (c === '"') {
          break;
        }
        i++;
      }
      i++;

      // Escape HTML in the string content
      const escaped = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Look ahead to see if this is a key (followed by :)
      let j = i;
      while (j < json.length && /\s/.test(json[j])) j++;

      if (json[j] === ':') {
        result.push(`<span class="json-key">${escaped}</span>`);
      } else {
        result.push(`<span class="json-string">${escaped}</span>`);
      }
      continue;
    }

    // Number
    if (/[-\d]/.test(char)) {
      let num = '';
      while (i < json.length && /[\d.eE+\-]/.test(json[i])) {
        num += json[i];
        i++;
      }
      result.push(`<span class="json-number">${num}</span>`);
      continue;
    }

    // Boolean or null
    if (char === 't' || char === 'f' || char === 'n') {
      let word = '';
      while (i < json.length && /[a-z]/.test(json[i])) {
        word += json[i];
        i++;
      }
      if (word === 'true' || word === 'false' || word === 'null') {
        result.push(`<span class="json-boolean">${word}</span>`);
      } else {
        result.push(word);
      }
      continue;
    }

    // Brackets and braces
    if (char === '{' || char === '}' || char === '[' || char === ']') {
      result.push(`<span class="json-bracket">${char}</span>`);
      i++;
      continue;
    }

    // Colon
    if (char === ':') {
      result.push(`<span class="json-punctuation">${char}</span>`);
      i++;
      continue;
    }

    // Comma
    if (char === ',') {
      result.push(`<span class="json-punctuation">${char}</span>`);
      i++;
      continue;
    }

    // Any other character
    result.push(char.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    i++;
  }

  return result.join('');
}

interface ThemeEditorProps {
  themeId: string;
  themeName?: string;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ themeId, themeName: _themeName }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { saveTheme, setActiveTheme, activeThemeId } = useThemeContext();
  const [theme, setTheme] = useState<CustomTheme | null>(null);
  const [jsonContent, setJsonContent] = useState('');
  const [originalJson, setOriginalJson] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Load theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        setIsLoading(true);
        const loaded = await window.dexteria?.theme?.load?.(themeId);
        if (loaded) {
          const t = loaded as CustomTheme;
          setTheme(t);
          const json = JSON.stringify(t, null, 2);
          setJsonContent(json);
          setOriginalJson(json);
        } else {
          setError(t('views.themeEditor.themeNotFound'));
        }
      } catch (err) {
        console.error('Failed to load theme:', err);
        setError(t('views.themeEditor.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [themeId]);

  // Track changes
  useEffect(() => {
    setHasChanges(jsonContent !== originalJson);
  }, [jsonContent, originalJson]);

  // Validate JSON on change
  useEffect(() => {
    if (!jsonContent.trim()) {
      setValidationError(t('views.themeEditor.jsonEmpty'));
      return;
    }

    try {
      const parsed = JSON.parse(jsonContent);

      // Basic validation
      if (!parsed.id || typeof parsed.id !== 'string') {
        setValidationError(t('views.themeEditor.missingId'));
        return;
      }
      if (!parsed.name || typeof parsed.name !== 'string') {
        setValidationError(t('views.themeEditor.missingName'));
        return;
      }
      if (!parsed.colors || typeof parsed.colors !== 'object') {
        setValidationError(t('views.themeEditor.missingColors'));
        return;
      }
      if (!parsed.colors.core || typeof parsed.colors.core !== 'object') {
        setValidationError(t('views.themeEditor.missingCore'));
        return;
      }
      if (!parsed.fonts || typeof parsed.fonts !== 'object') {
        setValidationError(t('views.themeEditor.missingFonts'));
        return;
      }

      setValidationError(null);
    } catch (e) {
      if (e instanceof SyntaxError) {
        setValidationError(t('views.themeEditor.invalidJsonWithError', { error: e.message }));
      } else {
        setValidationError(t('views.themeEditor.invalidJson'));
      }
    }
  }, [jsonContent, t]);

  // Sync scroll between textarea and highlight div
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleSave = async () => {
    if (validationError) return;

    try {
      setIsSaving(true);
      const parsed = JSON.parse(jsonContent) as CustomTheme;
      const success = await saveTheme(parsed);

      if (success) {
        setTheme(parsed);
        setOriginalJson(jsonContent);
        setHasChanges(false);
        toast.success(t('views.themeEditor.themeSaved'));
      } else {
        toast.error(t('views.themeEditor.saveFailed'));
      }
    } catch (err) {
      console.error('Failed to save theme:', err);
      toast.error(t('views.themeEditor.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setJsonContent(originalJson);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error(t('toasts.copyFailed'));
    }
  };

  const handleExport = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme?.name || 'theme'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = async () => {
    if (validationError) return;

    try {
      // First save if there are changes
      if (hasChanges) {
        const parsed = JSON.parse(jsonContent) as CustomTheme;
        await saveTheme(parsed);
        setOriginalJson(jsonContent);
        setHasChanges(false);
      }

      // Then apply the theme
      await setActiveTheme(themeId);
      toast.success(t('views.themeEditor.themeApplied'));
    } catch (err) {
      console.error('Failed to apply theme:', err);
      toast.error(t('views.themeEditor.applyFailed'));
    }
  };

  // Parse current JSON for preview
  const previewColors = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonContent);
      return parsed.colors?.core || null;
    } catch {
      return null;
    }
  }, [jsonContent]);

  // Highlighted JSON
  const highlightedJson = useMemo(() => {
    return highlightJson(jsonContent);
  }, [jsonContent]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="md" label={t('views.themeEditor.loading')} />
      </div>
    );
  }

  if (error && !theme) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <AlertBanner variant="error" description={error} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">
              {t('labels.unsaved')}
            </span>
          )}
          {activeThemeId === themeId && (
            <span className="text-xs text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
              {t('labels.active')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? t('tooltips.hidePreview') : t('tooltips.showPreview')}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleCopy}
            title={t('tooltips.copyJson')}
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleExport}
            title={t('tooltips.exportThemeFile')}
          >
            <Download size={14} />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleReset}
            disabled={!hasChanges}
            title={t('tooltips.resetChanges')}
          >
            <RotateCcw size={14} />
          </Button>
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-red-400 text-xs">
          <AlertTriangle size={12} />
          {validationError}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor with syntax highlighting */}
        <div className={`flex-1 flex flex-col ${showPreview ? 'border-r border-border' : ''}`}>
          <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#0d1117' }}>
            {/* Highlighted layer (behind) - shows the colored syntax */}
            <pre
              ref={highlightRef}
              className="absolute inset-0 p-4 m-0 font-mono text-sm leading-relaxed overflow-auto pointer-events-none whitespace-pre-wrap break-words"
              style={{
                backgroundColor: 'transparent',
              }}
              dangerouslySetInnerHTML={{ __html: highlightedJson + '\n' }}
              aria-hidden="true"
            />
            {/* Editable textarea (transparent text, on top) */}
            <textarea
              ref={textareaRef}
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              onScroll={handleScroll}
              className="absolute inset-0 p-4 m-0 font-mono text-sm leading-relaxed resize-none focus:outline-none overflow-auto"
              style={{
                backgroundColor: 'transparent',
                color: 'transparent',
                caretColor: '#58a6ff',
              }}
              spellCheck={false}
              placeholder={t('views.settings.themes.themeJsonPlaceholder')}
            />
          </div>
        </div>

        {/* Preview */}
        {showPreview && previewColors && (
          <div className="w-56 p-3 overflow-y-auto bg-muted/20 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Colors
            </h4>

            <div className="space-y-1.5">
              {Object.entries(previewColors).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded border border-white/10 shadow-inner flex-shrink-0"
                    style={{ backgroundColor: `hsl(${value})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate">{key}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
        <div className="text-xs text-muted-foreground">
          {jsonContent.split('\n').length} lines
        </div>
        <div className="flex items-center gap-2">
          {activeThemeId !== themeId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleApply}
              disabled={!!validationError}
            >
              {t('tooltips.applyTheme')}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || !!validationError || isSaving}
          >
            {isSaving ? <Spinner size="xs" className="mr-1" /> : <Save size={14} className="mr-1" />}
            {t('actions.save')}
          </Button>
        </div>
      </div>

      {/* Styles for JSON highlighting */}
      <style>{`
        .json-key {
          color: #ff7b72;
        }
        .json-string {
          color: #a5d6ff;
        }
        .json-number {
          color: #ffa657;
        }
        .json-boolean {
          color: #d2a8ff;
        }
        .json-bracket {
          color: #79c0ff;
        }
        .json-punctuation {
          color: #8b949e;
        }
      `}</style>
    </div>
  );
};
