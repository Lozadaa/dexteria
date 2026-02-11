/**
 * ProjectInterviewWizard
 *
 * Main container for the project interview wizard.
 * Manages stage transitions and renders appropriate screens.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useInterviewStore } from '../../stores/interviewStore';
import { useTranslation } from '../../i18n/useTranslation';
import { SeedNameScreen } from './SeedNameScreen';
import { SeedIdeaScreen } from './SeedIdeaScreen';
import { InterviewScreen } from './InterviewScreen';
import { FinalizeScreen } from './FinalizeScreen';
import type { InterviewConfig } from '../../../shared/types';

interface ProjectInterviewWizardProps {
  /** Project path where the interview is being conducted (null for new projects) */
  projectPath: string | null;
  /** Callback when interview is completed */
  onComplete: () => void;
  /** Callback when interview is cancelled */
  onCancel: () => void;
}

export function ProjectInterviewWizard({
  projectPath: initialProjectPath,
  onComplete,
  onCancel,
}: ProjectInterviewWizardProps) {
  const { t } = useTranslation();
  // Access store state directly with stable selectors
  const isActive = useInterviewStore((state) => state.isActive);
  const isLoading = useInterviewStore((state) => state.isLoading);
  const error = useInterviewStore((state) => state.error);
  const interview = useInterviewStore((state) => state.interview);
  const stage = interview?.stage ?? null;

  // Track the actual project path (may be null initially for new projects)
  const [projectPath, setProjectPath] = useState<string | null>(initialProjectPath);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Refs to prevent infinite loops and ensure single execution
  const initStarted = useRef(false);
  const completionHandled = useRef(false);

  // Initialize interview on mount (once only)
  useEffect(() => {
    if (initStarted.current) return;
    if (isActive) return; // Already active, don't init again

    initStarted.current = true;

    const initInterview = async () => {
      const store = useInterviewStore.getState();

      // Try to resume if we have a path
      if (projectPath) {
        const resumed = await store.resume(projectPath);
        if (resumed) return;
      }

      // Start fresh
      const locale = navigator.language.split('-')[0] || 'en';
      const config: InterviewConfig = {
        projectPath: projectPath || '',
        osLanguage: locale,
        depth: 'normal',
        techLevelMode: 'infer',
      };
      await store.init(config);
    };

    initInterview();
  }, []); // Empty deps - run once on mount

  // Handle completion (run once when stage becomes 'done')
  useEffect(() => {
    if (stage === 'done' && !completionHandled.current) {
      completionHandled.current = true;
      onComplete();
    }
  }, [stage, onComplete]);

  // Get store actions directly (stable reference)
  const goNext = useCallback(() => {
    useInterviewStore.getState().goNext();
  }, []);

  const goBack = useCallback(() => {
    useInterviewStore.getState().goBack();
  }, []);

  const setProjectName = useCallback((name: string) => {
    useInterviewStore.getState().setProjectName(name);
  }, []);

  const setProjectIdea = useCallback((idea: string) => {
    useInterviewStore.getState().setProjectIdea(idea);
  }, []);

  const setDepth = useCallback((depth: 'quick' | 'normal' | 'pro') => {
    useInterviewStore.getState().setDepth(depth);
  }, []);

  const submitAnswer = useCallback(async (answer: any) => {
    return await useInterviewStore.getState().submitAnswer(answer);
  }, []);

  const skip = useCallback(async () => {
    return await useInterviewStore.getState().skip();
  }, []);

  const getOptions = useCallback(async () => {
    return await useInterviewStore.getState().getOptions();
  }, []);

  const getExample = useCallback(async () => {
    return await useInterviewStore.getState().getExample();
  }, []);

  const generateBrief = useCallback(async () => {
    return await useInterviewStore.getState().generateBrief();
  }, []);

  const generateBacklog = useCallback(async () => {
    return await useInterviewStore.getState().generateBacklog();
  }, []);

  const createTasks = useCallback(async () => {
    return await useInterviewStore.getState().createTasks();
  }, []);

  const skipBacklog = useCallback(async () => {
    return await useInterviewStore.getState().skipBacklog();
  }, []);

  const cancelInterview = useCallback(async () => {
    return await useInterviewStore.getState().cancel();
  }, []);

  const saveAndExitInterview = useCallback(async () => {
    return await useInterviewStore.getState().saveAndExit();
  }, []);

  const setInterviewProjectPath = useCallback((path: string) => {
    useInterviewStore.getState().setProjectPath(path);
  }, []);

  // Create project when moving from seed_name to seed_idea (if no path exists)
  const handleNameNext = useCallback(async (name: string) => {
    if (!name) return;

    // If we don't have a project path yet, create the project now
    if (!projectPath) {
      setIsCreatingProject(true);
      setCreateError(null);

      try {
        const result = await window.dexteria?.project?.createWithName?.(name);

        if (result?.success && result?.path) {
          setProjectPath(result.path);
          setInterviewProjectPath(result.path);
          goNext();
        } else {
          console.error('[Wizard] Project creation failed:', result?.error);
          setCreateError(result?.error || 'Failed to create project folder');
        }
      } catch (err) {
        console.error('[Wizard] Failed to create project:', err);
        setCreateError(err instanceof Error ? err.message : 'Failed to create project');
      } finally {
        setIsCreatingProject(false);
      }
    } else {
      goNext();
    }
  }, [projectPath, goNext, setInterviewProjectPath]);

  // Sync state with backend when moving from seed_idea to interview
  const handleIdeaNext = useCallback(async (idea: string) => {
    // Get projectPath from store (more reliable than local state due to React async updates)
    const storeState = useInterviewStore.getState();
    const storePath = storeState.interview?.projectPath || projectPath;
    const storeName = storeState.interview?.projectName || interview?.projectName;

    if (!idea || !storePath || !storeName) {
      return;
    }

    // Re-initialize the backend engine with current state including name and idea
    const locale = navigator.language.split('-')[0] || 'en';
    const nQuestions = storeState.interview?.nQuestions || interview?.nQuestions || 5;
    const depth = nQuestions === 3 ? 'quick' : nQuestions === 5 ? 'normal' : 'pro';

    const config = {
      projectPath: storePath,
      osLanguage: locale,
      depth: depth as 'quick' | 'normal' | 'pro',
      techLevelMode: storeState.interview?.techLevelMode || interview?.techLevelMode || 'infer',
      projectName: storeName,
      projectIdea: idea,
    };

    try {
      // Call backend init to create/update engine state with full info
      const result = await window.dexteria?.interview?.init?.(config);

      if (result) {
        // Backend now has valid engine with name and idea, advance to interview
        goNext();
      }
    } catch (err) {
      console.error('[Wizard] Failed to sync with backend:', err);
      // Try to advance anyway
      goNext();
    }
  }, [interview?.projectName, interview?.nQuestions, interview?.techLevelMode, projectPath, goNext]);

  const handleCancel = useCallback(async () => {
    // Only call backend cancel if we have a project path (store is initialized)
    if (projectPath) {
      try {
        await cancelInterview();
      } catch (err) {
        console.error('Failed to cancel interview:', err);
      }
    }
    onCancel();
  }, [cancelInterview, onCancel, projectPath]);

  const handleSaveAndExit = useCallback(async () => {
    // Only save if we have a project path
    if (projectPath) {
      try {
        await saveAndExitInterview();
      } catch (err) {
        console.error('Failed to save interview:', err);
      }
    }
    onCancel(); // Close the wizard after saving
  }, [saveAndExitInterview, onCancel, projectPath]);

  // Loading state
  if (!isActive || !interview) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">{t('interview.initializingInterview')}</p>
        </div>
      </div>
    );
  }

  // Error state (either from interview or project creation)
  const displayError = error || createError;
  if (displayError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h2 className="text-lg font-semibold mb-2">{t('interview.somethingWentWrong')}</h2>
          <p className="text-muted-foreground mb-4">{displayError}</p>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            {t('interview.backToProjects')}
          </button>
        </div>
      </div>
    );
  }

  // Creating project state
  if (isCreatingProject) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">{t('interview.creatingProjectFolder')}</p>
        </div>
      </div>
    );
  }

  // Render appropriate screen based on stage
  const renderScreen = () => {
    switch (stage) {
      case 'seed_name':
        return (
          <SeedNameScreen
            value={interview.projectName}
            onChange={setProjectName}
            onNext={handleNameNext}
            onCancel={handleCancel}
          />
        );

      case 'seed_idea':
        return (
          <SeedIdeaScreen
            projectName={interview.projectName}
            value={interview.projectIdea}
            onChange={setProjectIdea}
            depth={interview.nQuestions === 3 ? 'quick' : interview.nQuestions === 5 ? 'normal' : 'pro'}
            onDepthChange={setDepth}
            onNext={handleIdeaNext}
            onBack={goBack}
            onCancel={handleCancel}
          />
        );

      case 'interview':
        return (
          <InterviewScreen
            interview={interview}
            isLoading={isLoading}
            onSubmitAnswer={submitAnswer}
            onSkip={skip}
            onGetOptions={getOptions}
            onGetExample={getExample}
            onSaveAndExit={handleSaveAndExit}
            onCancel={handleCancel}
          />
        );

      case 'finalize':
        return (
          <FinalizeScreen
            interview={interview}
            isLoading={isLoading}
            onGenerateBrief={generateBrief}
            onGenerateBacklog={generateBacklog}
            onCreateTasks={createTasks}
            onSkipBacklog={skipBacklog}
            onBack={goBack}
            onCancel={handleCancel}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      {renderScreen()}
    </div>
  );
}
