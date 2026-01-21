/**
 * Output Contracts
 *
 * Defines required output structures for agent responses.
 * These ensure consistent, verifiable outputs across all modes.
 */

/**
 * Structured Reasoning format.
 * Prevents chain-of-thought leakage by using a structured format.
 */
export const STRUCTURED_REASONING_FORMAT = `## Structured Reasoning Format

When explaining your reasoning, use this format:

\`\`\`reasoning
ASSUMPTIONS:
- [List assumptions you're making]

DECISIONS:
- [Key decisions and why you made them]

TRADE-OFFS:
- [Trade-offs you considered]

RATIONALE:
[Final explanation of your approach]
\`\`\`

This format helps you think systematically and helps users understand your reasoning.`;

/**
 * Confidence Declaration format.
 * REQUIRED for all agent responses.
 */
export const CONFIDENCE_DECLARATION_FORMAT = `## Confidence Declaration (REQUIRED)

You MUST declare your confidence level for significant actions or analyses:

**Format:** \`**Confidence: [High|Medium|Low]** - [Reason]\`

**Levels:**
- **High**: Strong evidence, clear requirements, well-understood domain
- **Medium**: Some uncertainty, may need verification, assumptions made
- **Low**: Significant unknowns, speculative, needs human review

**Examples:**
- \`**Confidence: High** - The code pattern is standard and tests confirm behavior\`
- \`**Confidence: Medium** - The approach should work but I haven't found explicit documentation\`
- \`**Confidence: Low** - This is my best guess; please verify before proceeding\``;

/**
 * Task Creation contract for Agent Mode.
 */
export const TASK_CREATION_CONTRACT = `## Task Creation Contract

When creating tasks, output JSON blocks in this format:

\`\`\`json
{
  "tool": "create_task",
  "arguments": {
    "title": "Clear, concise title (action verb + object)",
    "description": "Detailed description of what needs to be done",
    "status": "todo",
    "acceptanceCriteria": [
      "Specific, measurable criterion 1",
      "Specific, measurable criterion 2"
    ],
    "epic": {
      "name": "Epic name (optional)",
      "color": "#3b82f6"
    },
    "sprint": "Sprint 1 (optional)",
    "humanOnly": false
  }
}
\`\`\`

**Requirements:**
- Title must start with an action verb (Create, Implement, Fix, Add, etc.)
- Description must explain the "what" and "why"
- Acceptance criteria must be specific and testable
- Set \`humanOnly: true\` for tasks requiring human judgment`;

/**
 * Task Completion contract for Execution Mode.
 */
export const TASK_COMPLETION_CONTRACT = `## Task Completion Contract

When completing a task, use \`task_complete\` with evidence:

\`\`\`json
{
  "tool": "task_complete",
  "arguments": {
    "summary": "Brief summary of what was accomplished",
    "acceptanceResults": [
      {
        "criterion": "The exact criterion text",
        "passed": true,
        "evidence": "Specific evidence proving this criterion was met"
      }
    ]
  }
}
\`\`\`

**Requirements:**
- ALL acceptance criteria must be addressed
- Evidence must be specific (file paths, test results, etc.)
- If a criterion cannot be verified, mark it as failed with explanation`;

/**
 * Task Blocked contract.
 */
export const TASK_BLOCKED_CONTRACT = `## Task Blocked Contract

When you need human input, use \`task_blocked\`:

\`\`\`json
{
  "tool": "task_blocked",
  "arguments": {
    "reason": "Clear explanation of why you're blocked",
    "question": "Specific question for the human to answer"
  }
}
\`\`\`

**Use this when:**
- Requirements are ambiguous
- External access is needed (APIs, credentials)
- Conflicting instructions exist
- You've failed the same approach twice`;

/**
 * Task Failed contract.
 */
export const TASK_FAILED_CONTRACT = `## Task Failed Contract

When a task cannot be completed, use \`task_failed\`:

\`\`\`json
{
  "tool": "task_failed",
  "arguments": {
    "reason": "Clear explanation of why the task failed",
    "nextSteps": "Suggested steps to resolve the issue"
  }
}
\`\`\`

**Use this when:**
- Technical impossibility is discovered
- Acceptance criteria cannot be met
- Required resources are unavailable`;

/**
 * Build the complete output contracts prompt.
 */
export function buildOutputContractsPrompt(): string {
  return `## Output Contracts

${STRUCTURED_REASONING_FORMAT}

${CONFIDENCE_DECLARATION_FORMAT}

${TASK_CREATION_CONTRACT}

${TASK_COMPLETION_CONTRACT}

${TASK_BLOCKED_CONTRACT}

${TASK_FAILED_CONTRACT}`;
}
