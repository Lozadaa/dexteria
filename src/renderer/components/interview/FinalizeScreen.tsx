/**
 * FinalizeScreen
 *
 * Final screen showing project brief and backlog preview before creation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Badge, ScrollArea, Card } from 'adnia-ui';
import {
  ArrowLeft,
  X,
  Check,
  FileText,
  ListTodo,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { InterviewState, BacklogEpic, ProjectBrief } from '../../../shared/types';

interface FinalizeScreenProps {
  interview: InterviewState;
  isLoading: boolean;
  onGenerateBrief: () => Promise<void>;
  onGenerateBacklog: () => Promise<void>;
  onCreateTasks: () => Promise<{ success: boolean; taskCount: number }>;
  onSkipBacklog: () => Promise<{ success: boolean }>;
  onBack: () => void;
  onCancel: () => void;
}

type GenerationStep = 'idle' | 'brief' | 'backlog' | 'done';

// Step progress component
function GenerationProgress({ step, t }: { step: GenerationStep; t: (key: string, fallback?: string) => string }) {
  const steps = [
    { id: 'brief', label: t('interview.finalize.stepBrief', 'Generating project brief') },
    { id: 'backlog', label: t('interview.finalize.stepBacklog', 'Creating initial backlog') },
  ];

  const currentIndex = step === 'brief' ? 0 : step === 'backlog' ? 1 : 2;

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center mb-8">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {t('interview.finalize.processing', 'Processing your project')}
          </h2>
          <p className="text-muted-foreground">
            {t('interview.finalize.processingHint', 'This may take a minute. The AI is analyzing your answers to create a comprehensive plan.')}
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((s, i) => {
            const isActive = i === currentIndex;
            const isComplete = i < currentIndex;

            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isComplete ? 'bg-primary border-primary text-primary-foreground' :
                  isActive ? 'border-primary text-primary' :
                  'border-muted text-muted-foreground'
                }`}>
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-sm">{i + 1}</span>
                  )}
                </div>
                <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function FinalizeScreen({
  interview,
  isLoading,
  onGenerateBrief,
  onGenerateBacklog,
  onCreateTasks,
  onSkipBacklog,
  onBack,
  onCancel,
}: FinalizeScreenProps) {
  const { t } = useTranslation();
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [backlogError, setBacklogError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Track if we've already started generation to prevent loops
  const generationStarted = useRef(false);

  // Generate backlog (can be called multiple times for retry)
  const generateBacklogWithRetry = async () => {
    setBacklogError(null);
    setCurrentStep('backlog');
    console.log('[FinalizeScreen] Generating backlog...');
    try {
      await onGenerateBacklog();
      console.log('[FinalizeScreen] Backlog generated');
      setCurrentStep('done');
    } catch (err) {
      console.error('[FinalizeScreen] Backlog generation error:', err);
      setBacklogError(err instanceof Error ? err.message : 'Failed to generate backlog');
      setCurrentStep('done');
    }
  };

  // Auto-generate brief and backlog when entering this screen (once only)
  useEffect(() => {
    if (generationStarted.current) return;

    async function generate() {
      generationStarted.current = true;
      setError(null);
      setBacklogError(null);

      try {
        if (!interview.projectBrief) {
          setCurrentStep('brief');
          console.log('[FinalizeScreen] Generating brief...');
          await onGenerateBrief();
          console.log('[FinalizeScreen] Brief generated');
        }
        if (!interview.backlogDraft || interview.backlogDraft.length === 0) {
          await generateBacklogWithRetry();
        } else {
          setCurrentStep('done');
        }
      } catch (err) {
        console.error('[FinalizeScreen] Generation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate');
        setCurrentStep('done');
      }
    }
    generate();
  }, []); // Run only on mount

  // Handle retry backlog generation
  const handleRetryBacklog = async () => {
    setRetrying(true);
    await generateBacklogWithRetry();
    setRetrying(false);
  };

  // Handle skip backlog
  const handleSkipBacklog = async () => {
    setCreating(true);
    setBacklogError(null);
    try {
      const result = await onSkipBacklog();
      if (!result.success) {
        setError('Failed to skip backlog');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip');
    } finally {
      setCreating(false);
    }
  };

  const toggleEpic = (epicName: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicName)) {
        next.delete(epicName);
      } else {
        next.add(epicName);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    console.log('[FinalizeScreen] Creating tasks...');
    try {
      const result = await onCreateTasks();
      console.log('[FinalizeScreen] Create tasks result:', result);
      if (!result.success) {
        setError('Failed to create tasks');
      }
    } catch (err) {
      console.error('[FinalizeScreen] Create tasks error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create tasks');
    } finally {
      setCreating(false);
    }
  };

  // Count tasks
  const totalStories =
    interview.backlogDraft?.reduce((acc, epic) => acc + epic.stories.length, 0) ?? 0;
  const setupTasks =
    interview.backlogDraft?.reduce(
      (acc, epic) => acc + epic.stories.filter((s) => s.isSetupTask).length,
      0
    ) ?? 0;

  // Loading state with step-by-step progress
  if (currentStep !== 'done' && (!interview.projectBrief || !interview.backlogDraft)) {
    return <GenerationProgress step={currentStep} t={t} />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div>
          <h1 className="text-xl font-semibold">{interview.projectName}</h1>
          <p className="text-sm text-muted-foreground">
            {t('interview.finalize.title', 'Review and create your project')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Interview Q&A Summary */}
          {interview.answers && interview.answers.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">
                  {t('interview.finalize.qaSummary', 'Interview Summary')}
                </h2>
                <Badge variant="outline" className="text-xs">
                  {interview.answers.filter(a => !a.skipped).length}/{interview.answers.length} {t('interview.finalize.answered', 'answered')}
                </Badge>
              </div>
              <Card className="p-4 space-y-4 bg-muted/30">
                {interview.answers.map((answer, i) => (
                  <div key={i} className={`${i > 0 ? 'pt-4 border-t border-border/50' : ''}`}>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Q{i + 1}: {answer.questionText}
                    </p>
                    {answer.skipped ? (
                      <p className="text-sm text-muted-foreground italic">
                        {t('interview.finalize.skipped', '(Skipped)')}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">
                        {answer.answer}
                      </p>
                    )}
                  </div>
                ))}
              </Card>
            </section>
          )}

          {/* Project Brief */}
          {interview.projectBrief && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {t('interview.finalize.briefTitle', 'Project Brief')}
                </h2>
              </div>
              <Card className="p-6 space-y-4">
                <p className="text-muted-foreground">{interview.projectBrief.summary}</p>

                {interview.projectBrief.goals.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      {t('interview.finalize.goals', 'Goals')}
                    </h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {interview.projectBrief.goals.map((goal, i) => (
                        <li key={i}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {interview.projectBrief.techStack.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      {t('interview.finalize.techStack', 'Tech Stack')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {interview.projectBrief.techStack.map((tech, i) => (
                        <Badge key={i} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {interview.projectBrief.risks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      {t('interview.finalize.risks', 'Identified Risks')}
                    </h3>
                    <ul className="space-y-2">
                      {interview.projectBrief.risks.map((risk, i) => (
                        <li key={i} className="text-sm">
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              risk.severity === 'high'
                                ? 'bg-red-500'
                                : risk.severity === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                            }`}
                          />
                          {risk.description}
                          {risk.mitigation && (
                            <span className="text-muted-foreground ml-2">
                              - {risk.mitigation}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* Backlog Preview */}
          {interview.backlogDraft && interview.backlogDraft.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">
                    {t('interview.finalize.backlogTitle', 'Initial Backlog')}
                  </h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('interview.finalize.taskCount', '{{total}} stories ({{setup}} setup tasks)', {
                    total: totalStories,
                    setup: setupTasks,
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {interview.backlogDraft.map((epic) => (
                  <EpicCard
                    key={epic.name}
                    epic={epic}
                    isExpanded={expandedEpics.has(epic.name)}
                    onToggle={() => toggleEpic(epic.name)}
                    t={t}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>

      {/* Backlog Error display with Retry/Skip options */}
      {backlogError && (
        <div className="border-t bg-amber-500/10 p-4">
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {t('interview.finalize.backlogError', 'Failed to generate tasks')}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">{backlogError}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-8">
              <Button
                variant="default"
                size="sm"
                onClick={handleRetryBacklog}
                disabled={retrying || creating}
              >
                {retrying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('interview.finalize.retrying', 'Retrying...')}
                  </>
                ) : (
                  t('interview.finalize.retry', 'Retry')
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipBacklog}
                disabled={retrying || creating}
              >
                {t('interview.finalize.skipBacklog', 'Skip & Create Without Tasks')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* General Error display */}
      {error && (
        <div className="border-t bg-destructive/10 p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {t('interview.finalize.error', 'An error occurred')}
              </p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setError(null)}>
              {t('common.dismiss', 'Dismiss')}
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={onBack} disabled={creating}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back', 'Back')}
          </Button>
          <div className="flex items-center gap-3">
            {!error && (
              <span className="text-sm text-muted-foreground">
                {t('interview.finalize.createHint', 'Setup tasks will go to TODO, others to BACKLOG')}
              </span>
            )}
            <Button onClick={handleCreate} disabled={creating || retrying || (!interview.backlogDraft && !backlogError) || !!error || !!backlogError}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('interview.finalize.creating', 'Creating...')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t('interview.finalize.create', 'Create Project')}
                </>
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Epic card component
interface EpicCardProps {
  epic: BacklogEpic;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string, fallback?: string, options?: object) => string;
}

function EpicCard({ epic, isExpanded, onToggle, t }: EpicCardProps) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: epic.color }}
          />
          <span className="font-medium">{epic.name}</span>
          <Badge variant="outline" className="text-xs">
            {epic.stories.length} {t('interview.finalize.stories', 'stories')}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t">
          {epic.stories.map((story, i) => (
            <div
              key={i}
              className={`p-4 ${i < epic.stories.length - 1 ? 'border-b' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{story.title}</span>
                    {story.isSetupTask && (
                      <Badge variant="secondary" className="text-xs">
                        Setup
                      </Badge>
                    )}
                    <Badge
                      variant={
                        story.priority === 'critical'
                          ? 'destructive'
                          : story.priority === 'high'
                          ? 'default'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {story.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{story.description}</p>
                  {story.acceptanceCriteria.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {story.acceptanceCriteria.map((criterion, j) => (
                        <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                          <Check className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
