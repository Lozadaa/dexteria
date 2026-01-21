/**
 * Failure Handling
 *
 * Defines failure handling rules, escalation triggers, and retry protocols.
 */

/**
 * When to mark a task as BLOCKED (needs human input).
 */
export const WHEN_TO_BLOCK = `## When to BLOCK a Task

Use \`task_blocked\` when you encounter:

1. **Missing Information**
   - Requirements are unclear or contradictory
   - Critical details are not specified
   - Multiple valid interpretations exist

2. **External Dependencies**
   - Need API keys or credentials not available
   - External service access required
   - Third-party system configuration needed

3. **Conflicts**
   - Conflicting instructions from user
   - Code conflicts that need human decision
   - Design trade-offs requiring human input

4. **Repeated Failures**
   - Same error occurred 2+ times
   - Different approaches also failed
   - Root cause unclear`;

/**
 * When to mark a task as FAILED.
 */
export const WHEN_TO_FAIL = `## When to FAIL a Task

Use \`task_failed\` when:

1. **Technical Impossibility**
   - The requested change is not technically feasible
   - Required APIs or features don't exist
   - Fundamental architectural limitations

2. **Criteria Cannot Be Met**
   - Acceptance criteria are contradictory
   - Criteria require unavailable resources
   - Verification is not possible

3. **Resource Unavailability**
   - Required files are missing and cannot be created
   - Dependencies cannot be installed
   - Environment issues cannot be resolved`;

/**
 * Escalation triggers that require human intervention.
 */
export const ESCALATION_TRIGGERS = `## Escalation Triggers

IMMEDIATELY escalate (use task_blocked) when:

1. **Destructive Operations**
   - About to delete multiple files
   - About to modify production config
   - About to change authentication/security code

2. **Uncertainty**
   - Confidence is LOW on critical changes
   - Multiple equally valid approaches
   - Potential breaking changes

3. **Pattern Recognition**
   - Same error appearing twice
   - Approach not working after adjustment
   - Unexpected behavior detected

4. **Security Concerns**
   - Potential security vulnerability discovered
   - Sensitive data exposure risk
   - Authentication/authorization changes`;

/**
 * Retry protocol for failed tasks.
 */
export const RETRY_PROTOCOL = `## Retry Protocol

When retrying a previously failed task:

### MUST DO:
1. **Read ALL failure comments** from previous attempts
2. **Identify the root cause** of previous failures
3. **Use a DIFFERENT approach** than what failed before
4. **Acknowledge what you learned** from failures

### MUST NOT DO:
1. **DO NOT repeat** the exact same approach
2. **DO NOT ignore** failure context
3. **DO NOT make the same assumptions** that led to failure

### Retry Strategy:
\`\`\`
Attempt 1: Primary approach
Attempt 2: Alternative approach (different technique)
Attempt 3+: Ask for human guidance
\`\`\`

### Example Retry Response:
> "Previous attempt failed because [reason]. This time I will try [different approach] because [rationale]. **Confidence: Medium** - This is a different approach."`;

/**
 * Build the complete failure handling prompt.
 */
export function buildFailureHandlingPrompt(): string {
  return `## Failure Handling Protocol

${WHEN_TO_BLOCK}

${WHEN_TO_FAIL}

${ESCALATION_TRIGGERS}

${RETRY_PROTOCOL}`;
}

/**
 * Build retry context for a task prompt.
 */
export function buildRetryContextPrompt(
  failureContext: string,
  attemptNumber: number
): string {
  if (!failureContext || attemptNumber <= 1) {
    return '';
  }

  return `## Retry Context (Attempt ${attemptNumber})

**IMPORTANT:** This task has failed ${attemptNumber - 1} time(s) previously.

${failureContext}

### Instructions for This Attempt

1. **Review the failures above** - Understand what went wrong
2. **Use a DIFFERENT approach** - Do not repeat failed methods
3. **Learn from context** - Apply insights from previous attempts
4. **Declare your new strategy** - Explain how this attempt differs

**CRITICAL:** If you try the same approach that failed before, you WILL fail again.`;
}
