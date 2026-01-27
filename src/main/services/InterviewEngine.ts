/**
 * InterviewEngine
 *
 * Core engine for managing project interview state and AI interactions.
 * Handles question generation, answer processing, and backlog creation.
 */

import { BrowserWindow } from 'electron';
import { v4 as uuid } from 'uuid';
import { LocalKanbanStore } from './LocalKanbanStore';
import { detectLanguage } from './LanguageDetector';
import type { AgentProvider } from '../agent/AgentProvider';
import type {
  InterviewState,
  InterviewQuestion,
  InterviewAnswer,
  InterviewAssumption,
  InterviewConfig,
  ProjectBrief,
  BacklogEpic,
  SubmitAnswerResult,
  CreateTasksResult,
  InterviewQuestionCategory,
} from '../../shared/types';
import {
  buildQuestionGenerationPrompt,
  buildOptionsPrompt,
  buildExamplePrompt,
  buildBriefGenerationPrompt,
  buildBacklogGenerationPrompt,
  getInterviewSystemPrompt,
} from '../agent/prompts/interviewPrompts';

// ============================================================================
// Types
// ============================================================================

interface InterviewEngineConfig {
  store: LocalKanbanStore;
  provider: AgentProvider | null;
  mainWindow: BrowserWindow | null;
}

// ============================================================================
// InterviewEngine Class
// ============================================================================

export class InterviewEngine {
  private store: LocalKanbanStore;
  private provider: AgentProvider | null;
  private mainWindow: BrowserWindow | null;
  private currentState: InterviewState | null = null;

  constructor(config: InterviewEngineConfig) {
    this.store = config.store;
    this.provider = config.provider;
    this.mainWindow = config.mainWindow;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize a new interview.
   */
  async init(config: InterviewConfig): Promise<InterviewState> {
    const depthMap = { quick: 3, normal: 5, pro: 8 } as const;

    // Determine starting stage based on what info we have
    let stage: InterviewState['stage'] = 'seed_name';
    if (config.projectName && config.projectIdea) {
      stage = 'interview'; // Ready to start questions
    } else if (config.projectName) {
      stage = 'seed_idea';
    }

    console.log('[InterviewEngine] init called, stage:', stage, 'name:', config.projectName, 'idea:', config.projectIdea?.substring(0, 30));

    const state: InterviewState = {
      stage,
      osLanguage: config.osLanguage,
      detectedUserLanguage: null,
      techLevelMode: config.techLevelMode || 'infer',
      userProfile: { level: 'mixed' },
      nQuestions: depthMap[config.depth || 'normal'],
      currentIndex: 0,
      currentQuestion: null,
      projectName: config.projectName || '',
      projectIdea: config.projectIdea || '',
      answers: [],
      assumptions: [],
      risks: [],
      projectBrief: null,
      backlogDraft: null,
      projectPath: config.projectPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.currentState = state;
    await this.saveState();

    return state;
  }

  /**
   * Resume an existing interview from saved state.
   */
  async resume(projectPath: string): Promise<InterviewState | null> {
    const saved = this.store.getInterview();
    if (saved && saved.projectPath === projectPath && saved.stage !== 'done') {
      this.currentState = saved;
      return saved;
    }
    return null;
  }

  /**
   * Get current interview state.
   */
  getState(): InterviewState | null {
    return this.currentState;
  }

  // ============================================================================
  // Question Generation
  // ============================================================================

  /**
   * Generate the next question based on current state.
   */
  async generateNextQuestion(): Promise<InterviewQuestion | null> {
    console.log('[InterviewEngine] generateNextQuestion called, state:', !!this.currentState);
    if (!this.currentState) return null;

    const { currentIndex, nQuestions, answers, projectIdea, projectName } = this.currentState;
    console.log('[InterviewEngine] Question', currentIndex + 1, 'of', nQuestions);

    if (currentIndex >= nQuestions) {
      console.log('[InterviewEngine] All questions complete');
      return null;
    }

    // Determine language to use
    const language = this.currentState.detectedUserLanguage || this.currentState.osLanguage;
    console.log('[InterviewEngine] Language:', language, 'Provider:', this.provider?.getName?.());

    // Build prompt for question generation
    const prompt = buildQuestionGenerationPrompt({
      projectName,
      projectIdea,
      currentIndex,
      totalQuestions: nQuestions,
      previousAnswers: answers,
      language,
      techLevel: this.currentState.userProfile.level,
    });

    // Stream question generation
    this.sendStreamUpdate('question', '', false);

    try {
      if (!this.provider) {
        console.log('[InterviewEngine] No provider, using fallback');
        return this.createFallbackQuestion(currentIndex);
      }

      const systemPrompt = getInterviewSystemPrompt(language, this.currentState.userProfile.level);
      let fullResponse = '';

      console.log('[InterviewEngine] Calling provider.complete...');
      // Use provider to generate question with streaming
      const response = await this.provider.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        undefined,
        (chunk: string) => {
          fullResponse += chunk;
          this.sendStreamUpdate('question', fullResponse, false);
        }
      );

      // Use the full response content
      fullResponse = response.content || fullResponse;
      console.log('[InterviewEngine] Response received, length:', fullResponse.length);
      this.sendStreamUpdate('question', fullResponse, true);

      // Parse the response to extract question
      const question = this.parseQuestionResponse(fullResponse, currentIndex);
      console.log('[InterviewEngine] Parsed question:', question.text.substring(0, 100));

      // Update state
      this.currentState.currentQuestion = question;
      this.currentState.updatedAt = new Date().toISOString();
      await this.saveState();

      return question;
    } catch (error) {
      console.error('[InterviewEngine] Failed to generate question:', error);
      return this.createFallbackQuestion(currentIndex);
    }
  }

  /**
   * Get suggested options for "No sé" (I don't know) responses.
   */
  async getOptions(): Promise<string[]> {
    if (!this.currentState?.currentQuestion) return [];

    const language = this.currentState.detectedUserLanguage || this.currentState.osLanguage;
    const prompt = buildOptionsPrompt({
      question: this.currentState.currentQuestion,
      projectIdea: this.currentState.projectIdea,
      language,
    });

    try {
      if (!this.provider) {
        return this.getDefaultOptions(language);
      }

      let fullResponse = '';
      this.sendStreamUpdate('options', '', false);

      const response = await this.provider.complete(
        [{ role: 'user', content: prompt }],
        undefined,
        (chunk: string) => {
          fullResponse += chunk;
          this.sendStreamUpdate('options', fullResponse, false);
        }
      );

      fullResponse = response.content || fullResponse;
      this.sendStreamUpdate('options', fullResponse, true);

      // Parse options from response
      return this.parseOptionsResponse(fullResponse);
    } catch (error) {
      console.error('[InterviewEngine] Failed to get options:', error);
      return this.getDefaultOptions(language);
    }
  }

  /**
   * Get an example answer for the current question.
   */
  async getExample(): Promise<string> {
    if (!this.currentState?.currentQuestion) return '';

    const language = this.currentState.detectedUserLanguage || this.currentState.osLanguage;
    const prompt = buildExamplePrompt({
      question: this.currentState.currentQuestion,
      projectIdea: this.currentState.projectIdea,
      language,
    });

    try {
      if (!this.provider) {
        return this.currentState.currentQuestion.exampleAnswer || '';
      }

      let fullResponse = '';
      this.sendStreamUpdate('example', '', false);

      const response = await this.provider.complete(
        [{ role: 'user', content: prompt }],
        undefined,
        (chunk: string) => {
          fullResponse += chunk;
          this.sendStreamUpdate('example', fullResponse, false);
        }
      );

      fullResponse = response.content || fullResponse;
      this.sendStreamUpdate('example', fullResponse, true);

      return fullResponse.trim();
    } catch (error) {
      console.error('[InterviewEngine] Failed to get example:', error);
      return this.currentState.currentQuestion.exampleAnswer || '';
    }
  }

  // ============================================================================
  // Answer Processing
  // ============================================================================

  /**
   * Submit an answer and get the next question.
   */
  async submitAnswer(answer: InterviewAnswer): Promise<SubmitAnswerResult> {
    if (!this.currentState) {
      throw new Error('No active interview');
    }

    // Detect language from first substantive answer
    if (!this.currentState.detectedUserLanguage && answer.answer.length > 10) {
      const detected = detectLanguage(answer.answer);
      if (detected.confidence > 0.4) {
        this.currentState.detectedUserLanguage = detected.language === 'unknown'
          ? this.currentState.osLanguage
          : detected.language;
      }
    }

    // Add answer to state
    this.currentState.answers.push(answer);
    this.currentState.currentIndex++;
    this.currentState.currentQuestion = null;
    this.currentState.updatedAt = new Date().toISOString();

    const isComplete = this.currentState.currentIndex >= this.currentState.nQuestions;

    if (isComplete) {
      this.currentState.stage = 'finalize';
    }

    await this.saveState();

    // Generate next question if not complete
    let nextQuestion: InterviewQuestion | null = null;
    if (!isComplete) {
      nextQuestion = await this.generateNextQuestion();
    }

    return {
      state: this.currentState,
      nextQuestion,
      isComplete,
    };
  }

  /**
   * Skip the current question.
   */
  async skip(): Promise<InterviewState> {
    if (!this.currentState || !this.currentState.currentQuestion) {
      throw new Error('No active question to skip');
    }

    const question = this.currentState.currentQuestion;

    // Create skip answer
    const skipAnswer: InterviewAnswer = {
      questionId: question.id,
      questionIndex: question.index,
      questionText: question.text,
      answer: '',
      skipped: true,
      timestamp: new Date().toISOString(),
    };

    // Add assumption
    const assumption: InterviewAssumption = {
      id: uuid(),
      questionId: question.id,
      assumption: `User chose not to provide details about: ${question.text}`,
      reason: 'Question skipped',
      timestamp: new Date().toISOString(),
    };

    this.currentState.assumptions.push(assumption);

    // Process as regular answer
    await this.submitAnswer(skipAnswer);

    return this.currentState;
  }

  // ============================================================================
  // Brief & Backlog Generation
  // ============================================================================

  /**
   * Generate project brief from interview answers.
   */
  async generateBrief(): Promise<ProjectBrief> {
    if (!this.currentState) {
      throw new Error('No active interview');
    }

    const language = this.currentState.detectedUserLanguage || this.currentState.osLanguage;
    const prompt = buildBriefGenerationPrompt({
      projectName: this.currentState.projectName,
      projectIdea: this.currentState.projectIdea,
      answers: this.currentState.answers,
      assumptions: this.currentState.assumptions,
      language,
    });

    this.sendStreamUpdate('brief', '', false);

    try {
      let fullResponse = '';

      if (this.provider) {
        const response = await this.provider.complete(
          [{ role: 'user', content: prompt }],
          undefined,
          (chunk: string) => {
            fullResponse += chunk;
            this.sendStreamUpdate('brief', fullResponse, false);
          }
        );
        fullResponse = response.content || fullResponse;
      }

      this.sendStreamUpdate('brief', fullResponse, true);

      const brief = this.parseBriefResponse(fullResponse);
      this.currentState.projectBrief = brief;
      this.currentState.updatedAt = new Date().toISOString();
      await this.saveState();

      return brief;
    } catch (error) {
      console.error('[InterviewEngine] Failed to generate brief:', error);
      return this.createFallbackBrief();
    }
  }

  /**
   * Generate initial backlog from interview.
   * This method now uses tool calls to create tasks directly.
   * Includes retry logic to ensure tasks are created.
   */
  async generateBacklog(): Promise<BacklogEpic[]> {
    if (!this.currentState) {
      throw new Error('No active interview');
    }

    const language = this.currentState.detectedUserLanguage || this.currentState.osLanguage;
    const isSpanish = language === 'es';
    const MAX_RETRIES = 2;

    const prompt = buildBacklogGenerationPrompt({
      projectName: this.currentState.projectName,
      projectIdea: this.currentState.projectIdea,
      answers: this.currentState.answers,
      brief: this.currentState.projectBrief,
      language,
    });

    // System prompt to guide AI output format
    const systemPrompt = isSpanish
      ? `Eres un asistente de planificación de proyectos. Tu trabajo es crear tareas usando bloques JSON.

IMPORTANTE: Para cada tarea, genera EXACTAMENTE un bloque JSON en este formato:
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Título", "description": "Descripción", "status": "backlog", "priority": "medium", "acceptanceCriteria": ["Criterio 1"], "epic": {"name": "Epic", "color": "#3b82f6"}}}
\`\`\`

NO incluyas texto adicional entre los bloques JSON. Solo genera los bloques JSON, uno tras otro.`
      : `You are a project planning assistant. Your job is to create tasks using JSON blocks.

IMPORTANT: For each task, generate EXACTLY one JSON block in this format:
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Title", "description": "Description", "status": "backlog", "priority": "medium", "acceptanceCriteria": ["Criterion 1"], "epic": {"name": "Epic", "color": "#3b82f6"}}}
\`\`\`

DO NOT include additional text between JSON blocks. Only generate JSON blocks, one after another.`;

    // Retry prompt when format is wrong
    const retryPrompt = isSpanish
      ? `Tu respuesta anterior no contenía bloques JSON válidos con tareas.
NECESITO que generes tareas en EXACTAMENTE este formato, sin texto adicional:

\`\`\`json
{"tool": "create_task", "arguments": {"title": "Título de la tarea", "description": "Descripción detallada", "status": "backlog", "priority": "medium", "acceptanceCriteria": ["Criterio 1", "Criterio 2"], "epic": {"name": "Nombre del Epic", "color": "#3b82f6"}}}
\`\`\`

Genera al menos 3-5 tareas para el proyecto "${this.currentState.projectName}".
SOLO responde con bloques JSON, uno tras otro. NO incluyas explicaciones ni texto adicional.`
      : `Your previous response did not contain valid JSON blocks with tasks.
I NEED you to generate tasks in EXACTLY this format, without additional text:

\`\`\`json
{"tool": "create_task", "arguments": {"title": "Task title", "description": "Detailed description", "status": "backlog", "priority": "medium", "acceptanceCriteria": ["Criterion 1", "Criterion 2"], "epic": {"name": "Epic Name", "color": "#3b82f6"}}}
\`\`\`

Generate at least 3-5 tasks for the project "${this.currentState.projectName}".
ONLY respond with JSON blocks, one after another. DO NOT include explanations or additional text.`;

    console.log('[InterviewEngine] generateBacklog called - using tool execution with retry logic');
    this.sendStreamUpdate('backlog', '', false);

    let lastResponse = '';
    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      attempt++;
      console.log(`[InterviewEngine] Backlog generation attempt ${attempt}/${MAX_RETRIES + 1}`);

      try {
        let fullResponse = '';

        if (this.provider) {
          console.log('[InterviewEngine] Calling provider for backlog generation...');

          // Build messages based on attempt
          const messages = attempt === 1
            ? [
                { role: 'system' as const, content: systemPrompt },
                { role: 'user' as const, content: prompt },
              ]
            : [
                { role: 'system' as const, content: systemPrompt },
                { role: 'user' as const, content: prompt },
                { role: 'assistant' as const, content: lastResponse },
                { role: 'user' as const, content: retryPrompt },
              ];

          const response = await this.provider.complete(
            messages,
            undefined,
            (chunk: string) => {
              fullResponse += chunk;
              this.sendStreamUpdate('backlog', fullResponse, false);
            }
          );
          fullResponse = response.content || fullResponse;
        } else {
          console.warn('[InterviewEngine] No provider available for backlog generation');
          break;
        }

        console.log('[InterviewEngine] Backlog response length:', fullResponse.length);
        this.sendStreamUpdate('backlog', fullResponse, true);
        lastResponse = fullResponse;

        // Parse and execute tool calls from the response
        const { tasksCreated, tasksFailed, failedTasks, epics } = await this.executeBacklogToolCalls(fullResponse);
        console.log('[InterviewEngine] Created', tasksCreated, 'tasks via tool calls, failed:', tasksFailed);

        if (tasksFailed > 0) {
          console.warn('[InterviewEngine] Failed to create tasks:', failedTasks.join(', '));
        }

        // If tasks were created successfully, we're done
        if (tasksCreated > 0) {
          console.log(`[InterviewEngine] Success! Created ${tasksCreated} tasks on attempt ${attempt}`);
          this.currentState.backlogDraft = epics;
          this.currentState.updatedAt = new Date().toISOString();
          await this.saveState();
          return epics;
        }

        // No tasks created - if we have retries left, continue to next attempt
        if (attempt <= MAX_RETRIES) {
          console.warn(`[InterviewEngine] No tasks created on attempt ${attempt}, retrying with explicit format request...`);
          continue;
        }

        // All retries exhausted - throw error for manual retry
        console.error('[InterviewEngine] All retries exhausted, no tasks created from AI');

      } catch (error) {
        console.error(`[InterviewEngine] Error on attempt ${attempt}:`, error);
        if (attempt <= MAX_RETRIES) {
          console.log('[InterviewEngine] Retrying after error...');
          continue;
        }
      }
    } // end while loop

    // If we get here, all attempts failed - throw error for manual retry/skip
    const errorMessage = isSpanish
      ? 'No se pudieron generar las tareas. La IA no respondió en el formato esperado después de varios intentos.'
      : 'Failed to generate tasks. The AI did not respond in the expected format after multiple attempts.';

    console.error('[InterviewEngine] Throwing error for manual retry:', errorMessage);
    throw new Error(errorMessage);
  }

  /**
   * Execute create_task tool calls from AI response.
   * Creates tasks directly using the store (bypasses hasProject() check).
   * Returns the number of tasks created, failed count, and the epics for display.
   */
  private async executeBacklogToolCalls(response: string): Promise<{
    tasksCreated: number;
    tasksFailed: number;
    failedTasks: string[];
    epics: BacklogEpic[];
  }> {
    const epicsMap = new Map<string, BacklogEpic>();
    let tasksCreated = 0;
    let tasksFailed = 0;
    const failedTasks: string[] = [];

    console.log('[InterviewEngine] executeBacklogToolCalls - response length:', response.length);
    console.log('[InterviewEngine] Response preview:', response.substring(0, 1000));

    // Check store availability
    if (!this.store) {
      console.error('[InterviewEngine] Store not available - cannot create tasks');
      return { tasksCreated: 0, tasksFailed: 0, failedTasks: [], epics: [] };
    }

    // Helper to create a task directly using the store
    const createTask = (taskArgs: {
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      acceptanceCriteria?: string[];
      epic?: { name: string; color: string };
    }): boolean => {
      try {
        const title = taskArgs.title;
        if (!title || title.trim() === '') {
          console.warn('[InterviewEngine] Skipping task with empty title');
          return false;
        }

        const status = (taskArgs.status as 'backlog' | 'todo' | 'doing' | 'review' | 'done') || 'backlog';
        const priority = (taskArgs.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium';
        const description = taskArgs.description || '';
        const acceptanceCriteria = taskArgs.acceptanceCriteria || ['Task completed'];

        console.log(`[InterviewEngine] Creating task: "${title}" status=${status} priority=${priority}`);

        // Create task using the store
        const task = this.store.createTask(title, status);

        // Update with additional fields
        this.store.updateTask(task.id, {
          description,
          acceptanceCriteria,
          priority,
          epic: taskArgs.epic,
          agent: {
            goal: description,
            scope: ['*'],
            definitionOfDone: acceptanceCriteria,
          }
        });

        console.log(`[InterviewEngine] Task created successfully: ${task.id}`);
        return true;
      } catch (err) {
        console.error('[InterviewEngine] Failed to create task:', err);
        return false;
      }
    };

    // Find all JSON blocks with tool calls
    const jsonBlockPattern = /```json\s*\n?([\s\S]*?)\n?```/g;
    let match;
    let blockCount = 0;

    while ((match = jsonBlockPattern.exec(response)) !== null) {
      blockCount++;
      const jsonContent = match[1].trim();
      console.log('[InterviewEngine] Found JSON block #', blockCount, ':', jsonContent.substring(0, 200));

      try {
        // Try to parse and fix common JSON issues
        let parsed;
        try {
          parsed = JSON.parse(jsonContent);
        } catch {
          const fixed = jsonContent.replace(/,(\s*[}\]])/g, '$1');
          parsed = JSON.parse(fixed);
        }

        console.log('[InterviewEngine] Parsed JSON - tool:', parsed.tool, 'has arguments:', !!parsed.arguments);

        // Check if it's a create_task tool call
        if (parsed.tool === 'create_task') {
          // Extract task arguments - handle both formats:
          // {"tool": "create_task", "arguments": {...}}
          // {"tool": "create_task", "title": "...", ...}
          const taskArgs = parsed.arguments || {
            title: parsed.title,
            description: parsed.description,
            status: parsed.status,
            priority: parsed.priority,
            acceptanceCriteria: parsed.acceptanceCriteria,
            epic: parsed.epic,
          };

          console.log('[InterviewEngine] Creating task:', taskArgs.title);

          if (createTask(taskArgs)) {
            tasksCreated++;

            // Track for display in epics format
            const epicInfo = taskArgs.epic || { name: 'General', color: '#6b7280' };
            const epicKey = epicInfo.name;

            if (!epicsMap.has(epicKey)) {
              epicsMap.set(epicKey, {
                name: epicInfo.name,
                color: epicInfo.color,
                description: '',
                stories: [],
              });
            }

            epicsMap.get(epicKey)!.stories.push({
              title: taskArgs.title,
              description: taskArgs.description || '',
              acceptanceCriteria: taskArgs.acceptanceCriteria || [],
              priority: taskArgs.priority || 'medium',
              isSetupTask: taskArgs.status === 'todo',
              estimatedComplexity: 'medium',
            });
          } else {
            tasksFailed++;
            failedTasks.push(taskArgs.title || 'Unknown task');
          }
        } else {
          console.log('[InterviewEngine] JSON block is not a create_task tool call, tool:', parsed.tool);
        }
      } catch (e) {
        console.warn('[InterviewEngine] Failed to parse JSON block:', e);
      }
    }

    console.log('[InterviewEngine] Found', blockCount, 'JSON blocks, created', tasksCreated, 'tasks so far');

    // If no JSON blocks found, the AI might have responded differently
    if (blockCount === 0) {
      console.warn('[InterviewEngine] No JSON blocks found in response. Looking for inline JSON...');
    }

    // Also try inline JSON (not in code blocks) - use a more flexible pattern
    // Match objects that start with {"tool": "create_task"
    const inlineMatches: string[] = [];
    let depth = 0;
    let start = -1;

    for (let i = 0; i < response.length; i++) {
      if (response[i] === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (response[i] === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          const candidate = response.substring(start, i + 1);
          if (candidate.includes('"tool"') && candidate.includes('"create_task"')) {
            inlineMatches.push(candidate);
          }
          start = -1;
        }
      }
    }

    let inlineCount = 0;
    for (const inlineJson of inlineMatches) {
      // Skip if this JSON was already in a code block
      const isInCodeBlock = response.includes('```json\n' + inlineJson) ||
                            response.includes('```json\r\n' + inlineJson) ||
                            response.includes('```json ' + inlineJson);
      if (isInCodeBlock) continue;

      inlineCount++;
      console.log('[InterviewEngine] Found inline JSON #', inlineCount, ':', inlineJson.substring(0, 200));

      try {
        const parsed = JSON.parse(inlineJson);
        if (parsed.tool === 'create_task') {
          const taskArgs = parsed.arguments || {
            title: parsed.title,
            description: parsed.description,
            status: parsed.status,
            priority: parsed.priority,
            acceptanceCriteria: parsed.acceptanceCriteria,
            epic: parsed.epic,
          };

          console.log('[InterviewEngine] Creating inline task:', taskArgs.title);

          if (createTask(taskArgs)) {
            tasksCreated++;

            const epicInfo = taskArgs.epic || { name: 'General', color: '#6b7280' };
            const epicKey = epicInfo.name;

            if (!epicsMap.has(epicKey)) {
              epicsMap.set(epicKey, {
                name: epicInfo.name,
                color: epicInfo.color,
                description: '',
                stories: [],
              });
            }

            epicsMap.get(epicKey)!.stories.push({
              title: taskArgs.title,
              description: taskArgs.description || '',
              acceptanceCriteria: taskArgs.acceptanceCriteria || [],
              priority: taskArgs.priority || 'medium',
              isSetupTask: taskArgs.status === 'todo',
              estimatedComplexity: 'medium',
            });
          } else {
            tasksFailed++;
            failedTasks.push(taskArgs.title || 'Unknown task');
          }
        }
      } catch (e) {
        console.warn('[InterviewEngine] Failed to parse inline JSON:', e);
      }
    }

    console.log('[InterviewEngine] Total: found', blockCount, 'blocks +', inlineCount, 'inline, created', tasksCreated, 'tasks, failed', tasksFailed);

    // Send board refresh event to notify renderer
    if (tasksCreated > 0 && this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log('[InterviewEngine] Sending board:refresh event to renderer');
      this.mainWindow.webContents.send('board:refresh');
    }

    return {
      tasksCreated,
      tasksFailed,
      failedTasks,
      epics: Array.from(epicsMap.values()),
    };
  }

  // ============================================================================
  // Task Creation
  // ============================================================================

  /**
   * Finalize the interview - tasks were already created during generateBacklog.
   * This method just marks the interview as complete and cleans up.
   * CRITICAL: Verifies tasks exist in store to ensure creation actually happened.
   */
  async createTasks(): Promise<CreateTasksResult> {
    console.log('[InterviewEngine] createTasks called (finalizing interview)');

    if (!this.currentState) {
      console.error('[InterviewEngine] No active interview');
      return { success: false, taskCount: 0, setupTaskCount: 0, backlogTaskCount: 0, error: 'No active interview' };
    }

    // CRITICAL: Get ACTUAL task count from the store, not just backlogDraft
    // This ensures we report real tasks that were created, not just what we tried to parse
    const allTasks = this.store.getTasks();
    const actualTaskCount = allTasks.length;

    // Count from backlogDraft for backward compatibility / reporting
    let draftTaskCount = 0;
    let setupTaskCount = 0;
    let backlogTaskCount = 0;

    if (this.currentState.backlogDraft) {
      for (const epic of this.currentState.backlogDraft) {
        for (const story of epic.stories || []) {
          draftTaskCount++;
          if (story.isSetupTask) {
            setupTaskCount++;
          } else {
            backlogTaskCount++;
          }
        }
      }
    }

    // Use the higher count - actual store tasks vs draft
    const taskCount = Math.max(actualTaskCount, draftTaskCount);

    console.log('[InterviewEngine] Finalizing with', taskCount, 'tasks (actual store:', actualTaskCount, ', draft:', draftTaskCount, ')');
    console.log('[InterviewEngine] Setup:', setupTaskCount, 'Backlog:', backlogTaskCount);

    // CRITICAL: If we have no tasks at all, return error - user must retry or skip backlog generation
    if (taskCount === 0) {
      console.error('[InterviewEngine] CRITICAL: No tasks were created!');
      const language = this.currentState.detectedUserLanguage || this.currentState.osLanguage;
      const isSpanish = language === 'es';

      return {
        success: false,
        taskCount: 0,
        setupTaskCount: 0,
        backlogTaskCount: 0,
        error: isSpanish
          ? 'No se crearon tareas. Por favor, regenera el backlog o salta este paso.'
          : 'No tasks were created. Please regenerate the backlog or skip this step.',
      };
    }

    try {
      // Mark interview as done
      this.currentState.stage = 'done';
      this.currentState.updatedAt = new Date().toISOString();

      // Delete interview state (no longer needed)
      this.store.deleteInterview();
      this.currentState = null;

      // Send final board refresh to ensure UI is updated
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('board:refresh');
      }

      return { success: true, taskCount, setupTaskCount, backlogTaskCount };
    } catch (error) {
      console.error('[InterviewEngine] Failed to finalize interview:', error);
      return {
        success: false,
        taskCount,
        setupTaskCount,
        backlogTaskCount,
        error: error instanceof Error ? error.message : 'Failed to finalize',
      };
    }
  }

  /**
   * Skip backlog generation and finalize the interview without tasks.
   * User can manually create tasks later.
   */
  async skipBacklogAndFinalize(): Promise<CreateTasksResult> {
    console.log('[InterviewEngine] skipBacklogAndFinalize called');

    if (!this.currentState) {
      console.error('[InterviewEngine] No active interview');
      return { success: false, taskCount: 0, setupTaskCount: 0, backlogTaskCount: 0, error: 'No active interview' };
    }

    try {
      // Clear any partial backlog draft
      this.currentState.backlogDraft = [];

      // Mark interview as done
      this.currentState.stage = 'done';
      this.currentState.updatedAt = new Date().toISOString();

      // Delete interview state (no longer needed)
      this.store.deleteInterview();
      this.currentState = null;

      // Send board refresh to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('board:refresh');
      }

      console.log('[InterviewEngine] Project created without initial tasks (skipped)');
      return { success: true, taskCount: 0, setupTaskCount: 0, backlogTaskCount: 0 };
    } catch (error) {
      console.error('[InterviewEngine] Failed to skip and finalize:', error);
      return {
        success: false,
        taskCount: 0,
        setupTaskCount: 0,
        backlogTaskCount: 0,
        error: error instanceof Error ? error.message : 'Failed to finalize',
      };
    }
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Save current state and exit.
   */
  async saveAndExit(): Promise<{ success: boolean }> {
    try {
      console.log('[InterviewEngine] saveAndExit called, currentState:', this.currentState?.stage);
      await this.saveState();
      console.log('[InterviewEngine] State saved successfully');
      return { success: true };
    } catch (error) {
      console.error('[InterviewEngine] Failed to save:', error);
      return { success: false };
    }
  }

  /**
   * Cancel interview and clean up.
   */
  async cancel(): Promise<{ success: boolean }> {
    try {
      this.store.deleteInterview();
      this.currentState = null;
      return { success: true };
    } catch (error) {
      console.error('[InterviewEngine] Failed to cancel:', error);
      return { success: false };
    }
  }

  private async saveState(): Promise<void> {
    if (this.currentState) {
      console.log('[InterviewEngine] Saving state to store, stage:', this.currentState.stage);
      this.store.saveInterview(this.currentState);
      console.log('[InterviewEngine] State saved to store');
    } else {
      console.warn('[InterviewEngine] No currentState to save');
    }
  }

  // ============================================================================
  // Stream Updates
  // ============================================================================

  private sendStreamUpdate(type: string, content: string, done: boolean): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('interview:stream-update', { type, content, done });
    }
  }

  // ============================================================================
  // Response Parsing
  // ============================================================================

  private parseQuestionResponse(response: string, index: number): InterviewQuestion {
    // Clean the response - remove any metadata, confidence markers, or internal reasoning
    let cleanText = response
      // Remove markdown code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove confidence markers and similar metadata
      .replace(/\*\*Confidence[:\s]*[^*]*\*\*/gi, '')
      .replace(/Confidence[:\s]*(High|Medium|Low)[^\n]*/gi, '')
      // Remove thinking/reasoning blocks
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
      // Remove analysis lines that start with common patterns
      .replace(/^(Analysis|Reasoning|Note|Context|Explanation)[:\s-].*/gim, '')
      // Remove lines that look like metadata (Key: Value pattern at start)
      .replace(/^[A-Z][a-z]+:\s+[A-Z].*$/gm, '')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // If we cleaned too much or have nothing, try to extract just the question
    if (!cleanText || cleanText.length < 10) {
      // Look for a sentence ending with ? as the actual question
      const questionMatch = response.match(/[^.!?]*\?/);
      if (questionMatch) {
        cleanText = questionMatch[0].trim();
      } else {
        cleanText = response.trim();
      }
    }

    // Try to parse JSON from response (legacy support)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          id: uuid(),
          index,
          text: parsed.question || parsed.text || cleanText,
          context: parsed.context,
          suggestedOptions: parsed.options || parsed.suggestedOptions,
          exampleAnswer: parsed.example || parsed.exampleAnswer,
          category: this.determineCategory(parsed.category || cleanText),
          isRequired: parsed.isRequired ?? false,
        };
      } catch {
        // Fall through to plain text
      }
    }

    return {
      id: uuid(),
      index,
      text: cleanText,
      category: this.determineCategory(cleanText),
      isRequired: false,
    };
  }

  private parseOptionsResponse(response: string): string[] {
    // Try to parse as JSON array
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through
      }
    }

    // Parse as numbered or bulleted list
    const lines = response.split('\n').filter(l => l.trim());
    const options: string[] = [];

    for (const line of lines) {
      const match = line.match(/^[\d\-\*\.]+\s*(.+)/);
      if (match) {
        options.push(match[1].trim());
      }
    }

    return options.length > 0 ? options.slice(0, 4) : [];
  }

  private parseBriefResponse(response: string): ProjectBrief {
    // Try JSON parsing
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          name: parsed.name || this.currentState?.projectName || '',
          summary: parsed.summary || '',
          goals: parsed.goals || [],
          techStack: parsed.techStack || parsed.tech_stack || [],
          constraints: parsed.constraints || [],
          timeline: parsed.timeline,
          targetUsers: parsed.targetUsers || parsed.target_users,
          assumptions: this.currentState?.assumptions || [],
          risks: parsed.risks || [],
        };
      } catch {
        // Fall through
      }
    }

    // Fallback
    return this.createFallbackBrief();
  }

  private determineCategory(text: string): InterviewQuestionCategory {
    const lower = text.toLowerCase();

    if (lower.includes('tech') || lower.includes('stack') || lower.includes('language') || lower.includes('framework')) {
      return 'technology';
    }
    if (lower.includes('time') || lower.includes('deadline') || lower.includes('schedule')) {
      return 'timeline';
    }
    if (lower.includes('user') || lower.includes('audience') || lower.includes('customer')) {
      return 'users';
    }
    if (lower.includes('feature') || lower.includes('function') || lower.includes('capability')) {
      return 'features';
    }
    if (lower.includes('limit') || lower.includes('constraint') || lower.includes('restriction')) {
      return 'constraints';
    }
    if (lower.includes('integrat') || lower.includes('connect') || lower.includes('api')) {
      return 'integrations';
    }
    if (lower.includes('scope') || lower.includes('goal') || lower.includes('objective')) {
      return 'scope';
    }

    return 'other';
  }

  // ============================================================================
  // Fallbacks
  // ============================================================================

  private createFallbackQuestion(index: number): InterviewQuestion {
    const language = this.currentState?.detectedUserLanguage || this.currentState?.osLanguage || 'en';
    const questions = language === 'es' ? FALLBACK_QUESTIONS_ES : FALLBACK_QUESTIONS_EN;
    const q = questions[index % questions.length];

    return {
      id: uuid(),
      index,
      text: q.text,
      category: q.category,
      isRequired: false,
    };
  }

  private getDefaultOptions(language: string): string[] {
    if (language === 'es') {
      return [
        'No tengo preferencia específica',
        'Depende del contexto',
        'Me gustaría explorar opciones',
        'Necesito más información para decidir',
      ];
    }
    return [
      'I have no specific preference',
      'It depends on the context',
      'I would like to explore options',
      'I need more information to decide',
    ];
  }

  private createFallbackBrief(): ProjectBrief {
    return {
      name: this.currentState?.projectName || 'Project',
      summary: this.currentState?.projectIdea || '',
      goals: [],
      techStack: [],
      constraints: [],
      assumptions: this.currentState?.assumptions || [],
      risks: [],
    };
  }
}

// ============================================================================
// Fallback Questions
// ============================================================================

const FALLBACK_QUESTIONS_EN: { text: string; category: InterviewQuestionCategory }[] = [
  { text: 'What is the main goal of this project?', category: 'scope' },
  { text: 'Who are the target users for this application?', category: 'users' },
  { text: 'What technologies or frameworks are you considering?', category: 'technology' },
  { text: 'Are there any time constraints or deadlines?', category: 'timeline' },
  { text: 'What are the must-have features for the first version?', category: 'features' },
  { text: 'Are there any existing systems this needs to integrate with?', category: 'integrations' },
  { text: 'What are the main constraints or limitations?', category: 'constraints' },
  { text: 'How do you measure success for this project?', category: 'scope' },
];

const FALLBACK_QUESTIONS_ES: { text: string; category: InterviewQuestionCategory }[] = [
  { text: '¿Cuál es el objetivo principal de este proyecto?', category: 'scope' },
  { text: '¿Quiénes son los usuarios objetivo de esta aplicación?', category: 'users' },
  { text: '¿Qué tecnologías o frameworks estás considerando?', category: 'technology' },
  { text: '¿Hay restricciones de tiempo o fechas límite?', category: 'timeline' },
  { text: '¿Cuáles son las funcionalidades imprescindibles para la primera versión?', category: 'features' },
  { text: '¿Hay sistemas existentes con los que esto necesite integrarse?', category: 'integrations' },
  { text: '¿Cuáles son las principales restricciones o limitaciones?', category: 'constraints' },
  { text: '¿Cómo mides el éxito de este proyecto?', category: 'scope' },
];

// ============================================================================
// Singleton & Factory
// ============================================================================

let engineInstance: InterviewEngine | null = null;

export function getInterviewEngine(): InterviewEngine | null {
  return engineInstance;
}

export function createInterviewEngine(config: InterviewEngineConfig): InterviewEngine {
  engineInstance = new InterviewEngine(config);
  return engineInstance;
}

export function clearInterviewEngine(): void {
  engineInstance = null;
}
