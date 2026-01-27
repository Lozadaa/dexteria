import type { Skill } from '../../../../shared/types/skill';

export const apiDesignSkill: Skill = {
  id: 'api-design',
  name: 'API & Backend Design',
  description: 'Best practices for REST APIs, backend architecture, database design, and server-side patterns.',
  category: 'backend',
  keywords: [
    'api', 'rest', 'backend', 'server', 'database', 'db', 'sql', 'postgres',
    'mongo', 'express', 'fastify', 'endpoint', 'route', 'middleware',
    'authentication', 'auth', 'jwt', 'oauth', 'prisma', 'orm', 'migration',
    'schema', 'validation', 'crud', 'graphql', 'websocket', 'microservice',
  ],
  promptContent: `## Skill: API & Backend Design

### REST API Design Principles

- Use resource-based URLs: \`/users/:id/posts\` not \`/getUserPosts\`
- Use proper HTTP methods: GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE (remove)
- Return appropriate status codes: 200 (ok), 201 (created), 204 (no content), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 422 (unprocessable), 500 (server error)
- Use consistent error response format: \`{ error: { code, message, details? } }\`
- Version APIs via URL prefix: \`/api/v1/\`
- Implement pagination for list endpoints: \`?page=1&limit=20\` or cursor-based

### Database Design

- Normalize data to 3NF, denormalize only for measured performance needs
- Use UUIDs or nanoids for public-facing IDs, auto-increment for internal
- Always add \`created_at\` and \`updated_at\` timestamps
- Index columns used in WHERE, JOIN, ORDER BY clauses
- Use database transactions for multi-table mutations
- Write migrations for schema changes, never alter production schemas directly

### Authentication & Security

- Hash passwords with bcrypt (cost factor >= 12)
- Use short-lived JWTs (15min) with refresh tokens
- Validate all input at API boundaries with Zod or similar
- Sanitize output to prevent XSS
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on auth endpoints
- Never log sensitive data (passwords, tokens, PII)

### Error Handling

- Catch errors at middleware level with consistent formatting
- Log errors with context (request ID, user ID, timestamp)
- Return user-friendly messages, log technical details server-side
- Use typed errors with error codes for programmatic handling`,
  version: '1.0.0',
  source: 'bundled',
  enabled: true,
  priority: 10,
};
