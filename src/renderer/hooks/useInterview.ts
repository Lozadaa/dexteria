/**
 * useInterview Hook
 *
 * Convenient hook for interview operations that combines store access
 * with stream listener setup.
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  useInterviewStore,
  useInterviewStage,
  useCurrentQuestion,
  useInterviewProgress,
  useProjectInfo,
  useInterviewAnswers,
  useProjectBrief,
  useBacklogDraft,
  useInterviewLoading,
  useInterviewError,
  useStreamingContent,
  useInterviewActions,
  useIsInterviewActive,
} from '../stores/interviewStore';
import type { InterviewConfig, InterviewStreamUpdate } from '../../shared/types';

/**
 * Hook for interview operations and state.
 *
 * Handles stream listener setup and cleanup automatically.
 */
export function useInterview() {
  const isActive = useIsInterviewActive();
  const stage = useInterviewStage();
  const currentQuestion = useCurrentQuestion();
  const progress = useInterviewProgress();
  const projectInfo = useProjectInfo();
  const answers = useInterviewAnswers();
  const brief = useProjectBrief();
  const backlog = useBacklogDraft();
  const isLoading = useInterviewLoading();
  const error = useInterviewError();
  const streamingContent = useStreamingContent();
  const actions = useInterviewActions();

  // Get full interview state for more advanced use cases
  const interview = useInterviewStore((state) => state.interview);

  // Track if stream listener has been set up
  const listenerSetup = useRef(false);

  // Set up stream listener (once, using store directly to avoid dependency issues)
  useEffect(() => {
    if (!isActive || listenerSetup.current) return;
    listenerSetup.current = true;

    const cleanup = window.dexteria?.interview?.onStreamUpdate?.((data: InterviewStreamUpdate) => {
      // Access store directly to avoid stale closures
      const store = useInterviewStore.getState();
      if (data.content) {
        store.setStreamingContent(data.content);
      }
      if (data.done) {
        store.clearStreaming();
      }
    });

    return () => {
      cleanup?.();
      listenerSetup.current = false;
    };
  }, [isActive]); // Only depend on isActive

  // Initialize interview (use store directly to avoid dependency issues)
  const initialize = useCallback(
    async (config: InterviewConfig) => {
      const store = useInterviewStore.getState();
      await store.init(config);
    },
    [] // No dependencies - accesses store directly
  );

  // Resume interview from saved state
  const resumeInterview = useCallback(
    async (projectPath: string) => {
      const store = useInterviewStore.getState();
      return await store.resume(projectPath);
    },
    [] // No dependencies - accesses store directly
  );

  // Check if there's a saved interview
  const checkSavedInterview = useCallback(async (projectPath: string) => {
    try {
      const saved = await window.dexteria?.interview?.resume?.(projectPath);
      return saved !== null;
    } catch {
      return false;
    }
  }, []);

  // Get OS locale from Electron
  const getOSLocale = useCallback(async () => {
    try {
      // This would come from Electron's app.getLocale()
      // For now, return browser language
      return navigator.language.split('-')[0] || 'en';
    } catch {
      return 'en';
    }
  }, []);

  return {
    // State
    isActive,
    stage,
    currentQuestion,
    progress,
    projectInfo,
    answers,
    brief,
    backlog,
    isLoading,
    error,
    streamingContent,
    interview,

    // Actions
    initialize,
    resumeInterview,
    checkSavedInterview,
    getOSLocale,
    ...actions,
  };
}

/**
 * Hook for interview stage-specific logic.
 */
export function useInterviewStageLogic() {
  const stage = useInterviewStage();
  const { goNext, goBack, goToStage } = useInterviewActions();

  const canGoNext = stage !== 'done' && stage !== null;
  const canGoBack = stage !== 'seed_name' && stage !== 'done' && stage !== null;

  const isAtStart = stage === 'seed_name';
  const isAtEnd = stage === 'done';
  const isInInterview = stage === 'interview';
  const isInFinalize = stage === 'finalize';

  return {
    stage,
    canGoNext,
    canGoBack,
    isAtStart,
    isAtEnd,
    isInInterview,
    isInFinalize,
    goNext,
    goBack,
    goToStage,
  };
}

/**
 * Hook for interview validation.
 */
export function useInterviewValidation() {
  const { name, idea } = useProjectInfo();

  const isNameValid = name.trim().length >= 2;
  const isIdeaValid = idea.trim().length >= 10;

  const canProceedFromSeedName = isNameValid;
  const canProceedFromSeedIdea = isIdeaValid;

  return {
    isNameValid,
    isIdeaValid,
    canProceedFromSeedName,
    canProceedFromSeedIdea,
  };
}
