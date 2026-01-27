/**
 * SeedIdeaScreen
 *
 * Second screen - project idea description and depth selection.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, AutoGrowTextarea } from 'adnia-ui';
import { ArrowLeft, ArrowRight, X, Zap, Clock, Star } from 'lucide-react';
import type { InterviewDepth } from '../../../shared/types';

interface SeedIdeaScreenProps {
  projectName: string;
  value: string;
  onChange: (idea: string) => void;
  depth: InterviewDepth;
  onDepthChange: (depth: InterviewDepth) => void;
  onNext: (idea: string) => void;
  onBack: () => void;
  onCancel: () => void;
}

const DEPTH_OPTIONS: { id: InterviewDepth; questions: number; icon: React.ReactNode; labelKey: string; descKey: string }[] = [
  {
    id: 'quick',
    questions: 3,
    icon: <Zap className="w-4 h-4" />,
    labelKey: 'interview.depth.quick',
    descKey: 'interview.depth.quickDesc',
  },
  {
    id: 'normal',
    questions: 5,
    icon: <Clock className="w-4 h-4" />,
    labelKey: 'interview.depth.normal',
    descKey: 'interview.depth.normalDesc',
  },
  {
    id: 'pro',
    questions: 8,
    icon: <Star className="w-4 h-4" />,
    labelKey: 'interview.depth.pro',
    descKey: 'interview.depth.proDesc',
  },
];

export function SeedIdeaScreen({
  projectName,
  value,
  onChange,
  depth,
  onDepthChange,
  onNext,
  onBack,
  onCancel,
}: SeedIdeaScreenProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const isValid = localValue.trim().length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      const idea = localValue.trim();
      onChange(idea);
      onNext(idea);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2">
          {t('interview.seedIdea.title', 'Describe {{name}}', { name: projectName })}
        </h1>
        <p className="text-muted-foreground">
          {t('interview.seedIdea.subtitle', 'What do you want to build?')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
        {/* Idea input */}
        <div className="space-y-2">
          <label htmlFor="project-idea" className="text-sm font-medium">
            {t('interview.seedIdea.label', 'Project idea')}
          </label>
          <AutoGrowTextarea
            ref={textareaRef}
            id="project-idea"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={t(
              'interview.seedIdea.placeholder',
              'e.g., A task management app with AI assistance that helps teams organize work and track progress...'
            )}
            minRows={3}
            maxRows={8}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            {t('interview.seedIdea.hint', 'Be as specific as you like - Ralph will ask follow-up questions')}
          </p>
        </div>

        {/* Depth selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">
            {t('interview.depth.label', 'Interview depth')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {DEPTH_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onDepthChange(option.id)}
                className={`
                  flex flex-col items-center p-4 rounded-lg border-2 transition-colors
                  ${
                    depth === option.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <div
                  className={`mb-2 ${
                    depth === option.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {option.icon}
                </div>
                <span className="text-sm font-medium">
                  {t(option.labelKey, option.id)}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {option.questions} {t('interview.depth.questions', 'questions')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back', 'Back')}
            </Button>
          </div>
          <Button type="submit" disabled={!isValid}>
            {t('interview.seedIdea.start', 'Start Interview')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
}
