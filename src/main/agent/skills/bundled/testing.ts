import type { Skill } from '../../../../shared/types/skill';

export const testingSkill: Skill = {
  id: 'testing',
  name: 'Testing & Quality Assurance',
  description: 'Best practices for testing: Jest, Vitest, TDD, testing pyramid, integration and E2E testing.',
  category: 'testing',
  keywords: [
    'test', 'jest', 'vitest', 'mocha', 'testing', 'tdd', 'bdd', 'spec',
    'unit', 'integration', 'e2e', 'cypress', 'playwright', 'coverage',
    'mock', 'stub', 'spy', 'fixture', 'assertion', 'expect', 'describe',
    'it', 'beforeEach', 'afterEach', 'snapshot', 'regression',
  ],
  promptContent: `## Skill: Testing & Quality Assurance

### Testing Pyramid

1. **Unit Tests (70%)** - Test individual functions/modules in isolation
2. **Integration Tests (20%)** - Test modules working together
3. **E2E Tests (10%)** - Test full user flows through the application

### Unit Testing Best Practices

- Follow AAA pattern: Arrange, Act, Assert
- Test one behavior per test case
- Use descriptive test names: \`"should return empty array when no items match filter"\`
- Avoid testing implementation details; test behavior and outputs
- Mock external dependencies (APIs, databases, file system)
- Keep tests independent - no shared mutable state between tests

### Test Organization

\`\`\`
src/
  utils/
    formatDate.ts
    formatDate.test.ts     # Co-located unit tests
  services/
    UserService.ts
    UserService.test.ts
tests/
  integration/             # Integration tests
    api.test.ts
  e2e/                     # End-to-end tests
    login.spec.ts
\`\`\`

### Mocking Strategies

- **Jest/Vitest**: Use \`vi.mock()\` for module mocks, \`vi.fn()\` for function mocks
- Mock at the boundary: mock the HTTP client, not the API service
- Use factories for test data: \`createUser({ name: 'Test' })\`
- Reset mocks between tests: \`beforeEach(() => vi.clearAllMocks())\`

### What to Test

- Happy paths and error cases
- Edge cases: empty inputs, null/undefined, boundary values
- Async behavior: loading states, error states, success states
- User interactions: clicks, form submissions, keyboard navigation
- Accessibility: ARIA attributes, focus management

### What NOT to Test

- Third-party library internals
- CSS/styling details (use visual regression tools instead)
- Implementation details that could change without affecting behavior
- Trivial getters/setters with no logic`,
  version: '1.0.0',
  source: 'bundled',
  enabled: true,
  priority: 10,
};
