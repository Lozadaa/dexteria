/**
 * Interview Store
 *
 * Zustand store for managing interview wizard state.
 * Handles stage transitions, answers, and communication with the backend.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  InterviewState,
  InterviewStage,
  InterviewQuestion,
  InterviewAnswer,
  InterviewAssumption,
  InterviewRisk,
  ProjectBrief,
  BacklogEpic,
  InterviewDepth,
  TechLevel,
  TechLevelMode,
  InterviewConfig,
  INTERVIEW_DEPTH_MAP,
} from '../../shared/types';

// ============================================================================
// Store Types
// ============================================================================

interface InterviewStoreState {
  /** Whether the interview is active */
  isActive: boolean;

  /** Whether we're loading/streaming */
  isLoading: boolean;

  /** Current streaming content */
  streamingContent: string;

  /** Error message if any */
  error: string | null;

  /** The full interview state */
  interview: InterviewState | null;
}

interface InterviewStoreActions {
  // Initialization
  init: (config: InterviewConfig) => Promise<void>;
  resume: (projectPath: string) => Promise<boolean>;
  reset: () => void;

  // Stage navigation
  goToStage: (stage: InterviewStage) => void;
  goNext: () => void;
  goBack: () => void;

  // Seed screens
  setProjectName: (name: string) => void;
  setProjectIdea: (idea: string) => void;
  setDepth: (depth: InterviewDepth) => void;

  // Interview screen
  submitAnswer: (answer: string) => Promise<void>;
  skip: () => Promise<void>;
  getOptions: () => Promise<string[]>;
  getExample: () => Promise<string>;

  // Finalize
  generateBrief: () => Promise<void>;
  generateBacklog: () => Promise<void>;
  createTasks: () => Promise<{ success: boolean; taskCount: number }>;
  skipBacklog: () => Promise<{ success: boolean }>;

  // Persistence
  saveAndExit: () => Promise<void>;
  cancel: () => Promise<void>;

  // Streaming
  setStreamingContent: (content: string) => void;
  clearStreaming: () => void;

  // Internal state updates
  setInterview: (interview: InterviewState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Question management
  setCurrentQuestion: (question: InterviewQuestion | null) => void;
  addAnswer: (answer: InterviewAnswer) => void;
  addAssumption: (assumption: InterviewAssumption) => void;

  // Tech level
  setTechLevel: (level: TechLevel) => void;
  setTechLevelMode: (mode: TechLevelMode) => void;

  // Language
  setDetectedLanguage: (language: string) => void;

  // Project path (for when creating new project during interview)
  setProjectPath: (path: string) => void;
}

type InterviewStore = InterviewStoreState & InterviewStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: InterviewStoreState = {
  isActive: false,
  isLoading: false,
  streamingContent: '',
  error: null,
  interview: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

function createInitialInterviewState(config: InterviewConfig): InterviewState {
  const depthMap: Record<InterviewDepth, number> = {
    quick: 3,
    normal: 5,
    pro: 8,
  };

  return {
    stage: 'seed_name',
    osLanguage: config.osLanguage,
    detectedUserLanguage: null,
    techLevelMode: config.techLevelMode || 'infer',
    userProfile: { level: 'mixed' },
    nQuestions: depthMap[config.depth || 'normal'],
    currentIndex: 0,
    currentQuestion: null,
    projectName: '',
    projectIdea: '',
    answers: [],
    assumptions: [],
    risks: [],
    projectBrief: null,
    backlogDraft: null,
    projectPath: config.projectPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getStageOrder(): InterviewStage[] {
  return ['seed_name', 'seed_idea', 'interview', 'finalize', 'done'];
}

// ============================================================================
// Store
// ============================================================================

export const useInterviewStore = create<InterviewStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Initialization
      init: async (config) => {
        set({ isLoading: true, error: null });

        try {
          // Try to call backend init if available
          const result = await window.dexteria?.interview?.init?.(config);

          if (result) {
            set({
              isActive: true,
              interview: result,
              isLoading: false,
            });
          } else {
            // Fallback to local state creation
            const interview = createInitialInterviewState(config);
            set({
              isActive: true,
              interview,
              isLoading: false,
            });
          }
        } catch (error) {
          // Fallback to local state creation on error
          const interview = createInitialInterviewState(config);
          set({
            isActive: true,
            interview,
            isLoading: false,
          });
        }
      },

      resume: async (projectPath) => {
        set({ isLoading: true, error: null });

        try {
          const result = await window.dexteria?.interview?.resume?.(projectPath);

          if (result) {
            set({
              isActive: true,
              interview: result,
              isLoading: false,
            });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      reset: () => {
        set(initialState);
      },

      // Stage navigation
      goToStage: (stage) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            stage,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      goNext: () => {
        const { interview } = get();
        if (!interview) return;

        const stages = getStageOrder();
        const currentIndex = stages.indexOf(interview.stage);

        if (currentIndex < stages.length - 1) {
          set({
            interview: {
              ...interview,
              stage: stages[currentIndex + 1],
              updatedAt: new Date().toISOString(),
            },
          });
        }
      },

      goBack: () => {
        const { interview } = get();
        if (!interview) return;

        const stages = getStageOrder();
        const currentIndex = stages.indexOf(interview.stage);

        if (currentIndex > 0) {
          set({
            interview: {
              ...interview,
              stage: stages[currentIndex - 1],
              updatedAt: new Date().toISOString(),
            },
          });
        }
      },

      // Seed screens
      setProjectName: (name) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            projectName: name,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setProjectIdea: (idea) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            projectIdea: idea,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setDepth: (depth) => {
        const { interview } = get();
        if (!interview) return;

        const depthMap: Record<InterviewDepth, number> = {
          quick: 3,
          normal: 5,
          pro: 8,
        };

        set({
          interview: {
            ...interview,
            nQuestions: depthMap[depth],
            updatedAt: new Date().toISOString(),
          },
        });
      },

      // Interview screen
      submitAnswer: async (answer) => {
        const { interview } = get();
        if (!interview || !interview.currentQuestion) return;

        set({ isLoading: true, error: null });

        try {
          const newAnswer: InterviewAnswer = {
            questionId: interview.currentQuestion.id,
            questionIndex: interview.currentQuestion.index,
            questionText: interview.currentQuestion.text,
            answer,
            skipped: false,
            timestamp: new Date().toISOString(),
          };

          // Call backend to get next question
          const result = await window.dexteria?.interview?.submitAnswer?.(newAnswer);

          if (result) {
            set({
              interview: result.state,
              isLoading: false,
            });

            // Move to finalize if complete
            if (result.isComplete) {
              set({
                interview: {
                  ...result.state,
                  stage: 'finalize',
                },
              });
            }
          } else {
            // Fallback: add answer locally
            const newIndex = interview.currentIndex + 1;
            const isComplete = newIndex >= interview.nQuestions;

            set({
              interview: {
                ...interview,
                answers: [...interview.answers, newAnswer],
                currentIndex: newIndex,
                currentQuestion: null,
                stage: isComplete ? 'finalize' : interview.stage,
                updatedAt: new Date().toISOString(),
              },
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to submit answer',
            isLoading: false,
          });
        }
      },

      skip: async () => {
        const { interview } = get();
        if (!interview || !interview.currentQuestion) return;

        set({ isLoading: true, error: null });

        try {
          const result = await window.dexteria?.interview?.skip?.();

          if (result) {
            set({
              interview: result,
              isLoading: false,
            });
          } else {
            // Fallback: skip locally
            const skipAnswer: InterviewAnswer = {
              questionId: interview.currentQuestion.id,
              questionIndex: interview.currentQuestion.index,
              questionText: interview.currentQuestion.text,
              answer: '',
              skipped: true,
              timestamp: new Date().toISOString(),
            };

            const newIndex = interview.currentIndex + 1;
            const isComplete = newIndex >= interview.nQuestions;

            set({
              interview: {
                ...interview,
                answers: [...interview.answers, skipAnswer],
                currentIndex: newIndex,
                currentQuestion: null,
                stage: isComplete ? 'finalize' : interview.stage,
                updatedAt: new Date().toISOString(),
              },
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to skip question',
            isLoading: false,
          });
        }
      },

      getOptions: async () => {
        try {
          const options = await window.dexteria?.interview?.getOptions?.();
          return options || [];
        } catch {
          return [];
        }
      },

      getExample: async () => {
        const { interview } = get();
        if (!interview?.currentQuestion?.exampleAnswer) {
          try {
            const example = await window.dexteria?.interview?.getExample?.();
            return example || '';
          } catch {
            return '';
          }
        }
        return interview.currentQuestion.exampleAnswer;
      },

      // Finalize
      generateBrief: async () => {
        set({ isLoading: true, error: null, streamingContent: '' });

        try {
          const brief = await window.dexteria?.interview?.generateBrief?.();

          if (brief) {
            const { interview } = get();
            if (interview) {
              set({
                interview: {
                  ...interview,
                  projectBrief: brief,
                  updatedAt: new Date().toISOString(),
                },
                isLoading: false,
              });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate brief',
            isLoading: false,
          });
        }
      },

      generateBacklog: async () => {
        set({ isLoading: true, error: null, streamingContent: '' });

        try {
          const backlog = await window.dexteria?.interview?.generateBacklog?.();

          if (backlog) {
            const { interview } = get();
            if (interview) {
              set({
                interview: {
                  ...interview,
                  backlogDraft: backlog,
                  updatedAt: new Date().toISOString(),
                },
                isLoading: false,
              });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to generate backlog',
            isLoading: false,
          });
        }
      },

      createTasks: async () => {
        const { interview } = get();
        if (!interview?.projectPath) {
          return { success: false, taskCount: 0 };
        }

        set({ isLoading: true, error: null });

        try {
          const result = await window.dexteria?.interview?.createTasks?.(interview.projectPath);

          if (result?.success) {
            set({
              interview: {
                ...interview,
                stage: 'done',
                updatedAt: new Date().toISOString(),
              },
              isLoading: false,
            });
            return result;
          }

          set({
            error: result?.error || 'Failed to create tasks',
            isLoading: false,
          });
          return { success: false, taskCount: 0 };
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create tasks',
            isLoading: false,
          });
          return { success: false, taskCount: 0 };
        }
      },

      skipBacklog: async () => {
        const { interview } = get();
        set({ isLoading: true, error: null });

        try {
          const result = await window.dexteria?.interview?.skipBacklog?.();

          if (result?.success) {
            set({
              interview: interview ? {
                ...interview,
                backlogDraft: [],
                stage: 'done',
                updatedAt: new Date().toISOString(),
              } : null,
              isLoading: false,
            });
            return { success: true };
          }

          set({
            error: result?.error || 'Failed to skip backlog',
            isLoading: false,
          });
          return { success: false };
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to skip backlog',
            isLoading: false,
          });
          return { success: false };
        }
      },

      // Persistence
      saveAndExit: async () => {
        set({ isLoading: true });

        try {
          await window.dexteria?.interview?.saveAndExit?.();
          set(initialState);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to save',
            isLoading: false,
          });
        }
      },

      cancel: async () => {
        try {
          await window.dexteria?.interview?.cancel?.();
        } finally {
          set(initialState);
        }
      },

      // Streaming
      setStreamingContent: (content) => {
        set({ streamingContent: content });
      },

      clearStreaming: () => {
        set({ streamingContent: '' });
      },

      // Internal state updates
      setInterview: (interview) => {
        set({ interview });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      setCurrentQuestion: (question) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            currentQuestion: question,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      addAnswer: (answer) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            answers: [...interview.answers, answer],
            updatedAt: new Date().toISOString(),
          },
        });
      },

      addAssumption: (assumption) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            assumptions: [...interview.assumptions, assumption],
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setTechLevel: (level) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            userProfile: { ...interview.userProfile, level },
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setTechLevelMode: (mode) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            techLevelMode: mode,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setDetectedLanguage: (language) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            detectedUserLanguage: language,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setProjectPath: (path) => {
        const { interview } = get();
        if (!interview) return;

        set({
          interview: {
            ...interview,
            projectPath: path,
            updatedAt: new Date().toISOString(),
          },
        });
      },
    }),
    { name: 'interview-store' }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get the current interview stage
 */
export function useInterviewStage() {
  return useInterviewStore((state) => state.interview?.stage ?? null);
}

/**
 * Get the current question
 */
export function useCurrentQuestion() {
  return useInterviewStore((state) => state.interview?.currentQuestion ?? null);
}

/**
 * Get interview progress
 */
export function useInterviewProgress() {
  return useInterviewStore(
    useShallow((state) => ({
      current: (state.interview?.currentIndex ?? 0) + 1,
      total: state.interview?.nQuestions ?? 0,
    }))
  );
}

/**
 * Get project info
 */
export function useProjectInfo() {
  return useInterviewStore(
    useShallow((state) => ({
      name: state.interview?.projectName ?? '',
      idea: state.interview?.projectIdea ?? '',
      path: state.interview?.projectPath ?? null,
    }))
  );
}

/**
 * Get all answers
 */
export function useInterviewAnswers() {
  return useInterviewStore((state) => state.interview?.answers ?? []);
}

/**
 * Get project brief
 */
export function useProjectBrief() {
  return useInterviewStore((state) => state.interview?.projectBrief ?? null);
}

/**
 * Get backlog draft
 */
export function useBacklogDraft() {
  return useInterviewStore((state) => state.interview?.backlogDraft ?? null);
}

/**
 * Get loading state
 */
export function useInterviewLoading() {
  return useInterviewStore((state) => state.isLoading);
}

/**
 * Get error state
 */
export function useInterviewError() {
  return useInterviewStore((state) => state.error);
}

/**
 * Get streaming content
 */
export function useStreamingContent() {
  return useInterviewStore((state) => state.streamingContent);
}

/**
 * Get interview actions without triggering re-renders on state changes
 */
export function useInterviewActions() {
  return useInterviewStore(
    useShallow((state) => ({
      init: state.init,
      resume: state.resume,
      reset: state.reset,
      goToStage: state.goToStage,
      goNext: state.goNext,
      goBack: state.goBack,
      setProjectName: state.setProjectName,
      setProjectIdea: state.setProjectIdea,
      setDepth: state.setDepth,
      submitAnswer: state.submitAnswer,
      skip: state.skip,
      getOptions: state.getOptions,
      getExample: state.getExample,
      generateBrief: state.generateBrief,
      generateBacklog: state.generateBacklog,
      createTasks: state.createTasks,
      skipBacklog: state.skipBacklog,
      saveAndExit: state.saveAndExit,
      cancel: state.cancel,
      setStreamingContent: state.setStreamingContent,
      clearStreaming: state.clearStreaming,
      setInterview: state.setInterview,
      setCurrentQuestion: state.setCurrentQuestion,
      setDetectedLanguage: state.setDetectedLanguage,
      setProjectPath: state.setProjectPath,
    }))
  );
}

/**
 * Check if interview is active
 */
export function useIsInterviewActive() {
  return useInterviewStore((state) => state.isActive);
}
