/**
 * SeedNameScreen
 *
 * First screen of the interview wizard - project name input.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from 'adnia-ui';
import { Bot, ArrowRight, X } from 'lucide-react';

interface SeedNameScreenProps {
  value: string;
  onChange: (name: string) => void;
  onNext: (name: string) => void;
  onCancel: () => void;
}

export function SeedNameScreen({ value, onChange, onNext, onCancel }: SeedNameScreenProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const isValid = localValue.trim().length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      const name = localValue.trim();
      onChange(name);
      onNext(name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{t('interview.seedName.title', "Let's plan your project")}</h1>
          <p className="text-muted-foreground">{t('interview.seedName.subtitle', "I'll ask a few questions to create an initial backlog")}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <label htmlFor="project-name" className="text-sm font-medium">
            {t('interview.seedName.label', 'Project name')}
          </label>
          <Input
            ref={inputRef}
            id="project-name"
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('interview.seedName.placeholder', 'e.g., MyAwesomeApp')}
            className="text-lg h-12"
            autoComplete="off"
          />
          {localValue && !isValid && (
            <p className="text-xs text-amber-500">
              {t('interview.seedName.minLength', 'Name must be at least 2 characters')}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!isValid}
            className="gap-2"
          >
            {t('common.continue', 'Continue')}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Info text */}
      <p className="mt-8 text-sm text-muted-foreground text-center max-w-sm">
        {t('interview.seedName.info', 'Ralph will guide you through planning by asking questions about your project goals, features, and requirements.')}
      </p>
    </div>
  );
}
