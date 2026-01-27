/**
 * Interview Prompts
 *
 * Prompt templates for the project interview wizard.
 * Ralph uses these to generate questions, options, briefs, and backlogs.
 */

import type {
  InterviewQuestion,
  InterviewAnswer,
  InterviewAssumption,
  ProjectBrief,
  TechLevel,
} from '../../../shared/types';

// ============================================================================
// System Prompts
// ============================================================================

/**
 * Get the system prompt for Ralph during interviews.
 */
export function getInterviewSystemPrompt(language: string, techLevel: TechLevel): string {
  const isSpanish = language === 'es';

  const techLevelGuidance = {
    technical: isSpanish
      ? 'El usuario es técnico. Usa terminología técnica apropiada.'
      : 'The user is technical. Use appropriate technical terminology.',
    non_technical: isSpanish
      ? 'El usuario no es técnico. Usa lenguaje simple y evita jerga técnica.'
      : 'The user is non-technical. Use simple language and avoid technical jargon.',
    mixed: isSpanish
      ? 'Adapta tu lenguaje según las respuestas del usuario.'
      : 'Adapt your language based on user responses.',
  };

  if (isSpanish) {
    return `Eres Ralph, un asistente experto en planificación de proyectos de software.

Reglas:
1. Responde SIEMPRE en español
2. Haz UNA sola pregunta por turno
3. Sé conversacional y conciso
4. ${techLevelGuidance[techLevel]}
5. NO incluyas metadatos, análisis ni explicaciones internas - solo la pregunta
6. Tu respuesta debe ser DIRECTAMENTE la pregunta, nada más`;
  }

  return `You are Ralph, an expert in software project planning.

Rules:
1. ALWAYS respond in the user's language
2. Ask ONE question per turn
3. Be conversational and concise
4. ${techLevelGuidance[techLevel]}
5. DO NOT include metadata, analysis, or internal explanations - just the question
6. Your response should be DIRECTLY the question, nothing else`;
}

// ============================================================================
// Question Generation
// ============================================================================

interface QuestionGenerationContext {
  projectName: string;
  projectIdea: string;
  currentIndex: number;
  totalQuestions: number;
  previousAnswers: InterviewAnswer[];
  language: string;
  techLevel: TechLevel;
}

/**
 * Build the prompt for generating the next question.
 */
export function buildQuestionGenerationPrompt(ctx: QuestionGenerationContext): string {
  const { projectName, projectIdea, currentIndex, totalQuestions, previousAnswers, language } = ctx;
  const isSpanish = language === 'es';

  const progress = `${currentIndex + 1}/${totalQuestions}`;

  // Build context from previous answers
  const answersContext = previousAnswers
    .filter(a => !a.skipped)
    .map((a, i) => `P${i + 1}: ${a.questionText}\nR${i + 1}: ${a.answer}`)
    .join('\n\n');

  // Topics to potentially cover
  const topics = isSpanish
    ? ['alcance/objetivos', 'usuarios objetivo', 'tecnologías', 'restricciones', 'funcionalidades clave', 'integraciones']
    : ['scope/objectives', 'target users', 'technologies', 'constraints', 'key features', 'integrations'];

  if (isSpanish) {
    return `Proyecto: ${projectName}
Idea: ${projectIdea}

${answersContext ? `Conversación anterior:\n${answersContext}\n` : ''}
Pregunta ${progress}. Temas posibles: ${topics.join(', ')}.

Genera la siguiente pregunta. Responde SOLO con la pregunta, sin explicaciones ni análisis.`;
  }

  return `Project: ${projectName}
Idea: ${projectIdea}

${answersContext ? `Previous conversation:\n${answersContext}\n` : ''}
Question ${progress}. Possible topics: ${topics.join(', ')}.

Generate the next question. Respond ONLY with the question, no explanations or analysis.`;
}

// ============================================================================
// Options Generation
// ============================================================================

interface OptionsContext {
  question: InterviewQuestion;
  projectIdea: string;
  language: string;
}

/**
 * Build prompt for generating options when user says "I don't know".
 */
export function buildOptionsPrompt(ctx: OptionsContext): string {
  const { question, projectIdea, language } = ctx;
  const isSpanish = language === 'es';

  if (isSpanish) {
    return `El usuario respondió "no sé" a esta pregunta:
"${question.text}"

Contexto del proyecto: ${projectIdea}

Genera 2-4 opciones concretas que el usuario pueda elegir.
Las opciones deben ser decisiones prácticas y específicas, no vagas.

Responde con un array JSON:
["Opción 1", "Opción 2", "Opción 3"]`;
  }

  return `The user answered "I don't know" to this question:
"${question.text}"

Project context: ${projectIdea}

Generate 2-4 concrete options the user can choose from.
Options should be practical and specific decisions, not vague.

Respond with a JSON array:
["Option 1", "Option 2", "Option 3"]`;
}

// ============================================================================
// Example Generation
// ============================================================================

interface ExampleContext {
  question: InterviewQuestion;
  projectIdea: string;
  language: string;
}

/**
 * Build prompt for generating an example answer.
 */
export function buildExamplePrompt(ctx: ExampleContext): string {
  const { question, projectIdea, language } = ctx;
  const isSpanish = language === 'es';

  if (isSpanish) {
    return `El usuario necesita un ejemplo de respuesta para esta pregunta:
"${question.text}"

Contexto del proyecto: ${projectIdea}

Proporciona UN ejemplo concreto y breve de cómo alguien podría responder.
El ejemplo debe ser realista y aplicable a su proyecto.

Responde SOLO con el texto del ejemplo (sin JSON ni formato adicional).`;
  }

  return `The user needs an example answer for this question:
"${question.text}"

Project context: ${projectIdea}

Provide ONE concrete and brief example of how someone might answer.
The example should be realistic and applicable to their project.

Respond ONLY with the example text (no JSON or additional formatting).`;
}

// ============================================================================
// Brief Generation
// ============================================================================

interface BriefContext {
  projectName: string;
  projectIdea: string;
  answers: InterviewAnswer[];
  assumptions: InterviewAssumption[];
  language: string;
}

/**
 * Build prompt for generating the project brief.
 */
export function buildBriefGenerationPrompt(ctx: BriefContext): string {
  const { projectName, projectIdea, answers, assumptions, language } = ctx;
  const isSpanish = language === 'es';

  const answersText = answers
    .map((a, i) => `Q${i + 1}: ${a.questionText}\nA${i + 1}: ${a.skipped ? '(Omitido)' : a.answer}`)
    .join('\n\n');

  const assumptionsText = assumptions
    .map(a => `- ${a.assumption}`)
    .join('\n');

  if (isSpanish) {
    return `## Información del Proyecto
- **Nombre**: ${projectName}
- **Idea original**: ${projectIdea}

## Respuestas de la entrevista
${answersText}

## Suposiciones (de preguntas omitidas)
${assumptionsText || 'Ninguna'}

## Tu tarea
Genera un resumen ejecutivo del proyecto en formato JSON:

\`\`\`json
{
  "name": "${projectName}",
  "summary": "Resumen de 2-3 oraciones",
  "goals": ["Objetivo 1", "Objetivo 2"],
  "techStack": ["Tech 1", "Tech 2"],
  "constraints": ["Restricción 1"],
  "timeline": "Estimación si fue mencionada",
  "targetUsers": "Descripción de usuarios objetivo",
  "risks": [
    {"id": "1", "description": "Riesgo identificado", "severity": "low|medium|high", "mitigation": "Posible mitigación"}
  ]
}
\`\`\``;
  }

  return `## Project Information
- **Name**: ${projectName}
- **Original idea**: ${projectIdea}

## Interview answers
${answersText}

## Assumptions (from skipped questions)
${assumptionsText || 'None'}

## Your task
Generate an executive summary of the project in JSON format:

\`\`\`json
{
  "name": "${projectName}",
  "summary": "2-3 sentence summary",
  "goals": ["Goal 1", "Goal 2"],
  "techStack": ["Tech 1", "Tech 2"],
  "constraints": ["Constraint 1"],
  "timeline": "Estimation if mentioned",
  "targetUsers": "Target user description",
  "risks": [
    {"id": "1", "description": "Identified risk", "severity": "low|medium|high", "mitigation": "Possible mitigation"}
  ]
}
\`\`\``;
}

// ============================================================================
// Backlog Generation
// ============================================================================

interface BacklogContext {
  projectName: string;
  projectIdea: string;
  answers: InterviewAnswer[];
  brief: ProjectBrief | null;
  language: string;
}

/**
 * Build prompt for generating the initial backlog.
 */
export function buildBacklogGenerationPrompt(ctx: BacklogContext): string {
  const { projectName, projectIdea, answers, brief, language } = ctx;
  const isSpanish = language === 'es';

  const briefSummary = brief
    ? `
- Resumen: ${brief.summary}
- Objetivos: ${brief.goals.join(', ')}
- Stack: ${brief.techStack.join(', ')}
- Restricciones: ${brief.constraints.join(', ')}`
    : '';

  const answersText = answers
    .filter(a => !a.skipped)
    .slice(0, 5) // Include up to 5 key answers
    .map((a, i) => `Q${i + 1}: ${a.questionText}\nA${i + 1}: ${a.answer}`)
    .join('\n\n');

  if (isSpanish) {
    return `## Información del Proyecto
- **Nombre**: ${projectName}
- **Idea**: ${projectIdea}
${briefSummary}

## Respuestas clave
${answersText}

## Tu tarea
Crea las tareas iniciales del proyecto usando la herramienta \`create_task\`.

**Reglas:**
1. Crea 8-15 tareas en total
2. Las primeras 2-3 deben ser tareas de setup (status: "todo")
3. El resto van a backlog (status: "backlog")
4. Agrupa las tareas por epic usando el campo "epic"
5. Usa colores distintos para cada epic (ej: "#22c55e", "#3b82f6", "#f59e0b", "#ef4444")
6. Prioridades: low, medium, high, critical

**Para CADA tarea, genera un bloque JSON así:**
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Título claro y conciso", "description": "Descripción detallada de qué hacer", "status": "todo", "priority": "high", "acceptanceCriteria": ["Criterio 1", "Criterio 2"], "epic": {"name": "Nombre del Epic", "color": "#3b82f6"}}}
\`\`\`

Empieza creando las tareas ahora. Una tarea por bloque JSON.`;
  }

  return `## Project Information
- **Name**: ${projectName}
- **Idea**: ${projectIdea}
${briefSummary}

## Key answers
${answersText}

## Your task
Create the initial project tasks using the \`create_task\` tool.

**Rules:**
1. Create 8-15 tasks total
2. First 2-3 should be setup tasks (status: "todo")
3. Rest go to backlog (status: "backlog")
4. Group tasks by epic using the "epic" field
5. Use different colors for each epic (e.g., "#22c55e", "#3b82f6", "#f59e0b", "#ef4444")
6. Priorities: low, medium, high, critical

**For EACH task, generate a JSON block like this:**
\`\`\`json
{"tool": "create_task", "arguments": {"title": "Clear concise title", "description": "Detailed description of what to do", "status": "todo", "priority": "high", "acceptanceCriteria": ["Criterion 1", "Criterion 2"], "epic": {"name": "Epic Name", "color": "#3b82f6"}}}
\`\`\`

Start creating the tasks now. One task per JSON block.`;
}
