import type { Skill } from '../../../../shared/types/skill';

export const devopsSkill: Skill = {
  id: 'devops',
  name: 'DevOps & CI/CD',
  description: 'Best practices for CI/CD pipelines, Docker, GitHub Actions, deployment, and infrastructure.',
  category: 'devops',
  keywords: [
    'docker', 'ci', 'cd', 'pipeline', 'github actions', 'workflow', 'deploy',
    'deployment', 'nginx', 'kubernetes', 'k8s', 'terraform', 'ansible',
    'dockerfile', 'compose', 'container', 'image', 'registry', 'helm',
    'yaml', 'env', 'environment', 'staging', 'production', 'monitoring',
    'logging', 'infrastructure', 'devops', 'build', 'release',
  ],
  promptContent: `## Skill: DevOps & CI/CD

### Dockerfile Best Practices

- Use multi-stage builds to minimize image size
- Pin base image versions: \`node:20-alpine\` not \`node:latest\`
- Copy package.json first, then install, then copy source (leverage layer caching)
- Use .dockerignore to exclude node_modules, .git, etc.
- Run as non-root user: \`USER node\`
- Use HEALTHCHECK for container health monitoring

\`\`\`dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -q --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
\`\`\`

### GitHub Actions

- Use specific action versions: \`actions/checkout@v4\` not \`@latest\`
- Cache dependencies: \`actions/cache\` or built-in caching
- Run tests in parallel where possible
- Use matrix strategy for multi-version testing
- Store secrets in GitHub Secrets, never in code
- Use environment protection rules for production deployments

### CI/CD Pipeline Stages

1. **Lint** - Code style and static analysis
2. **Test** - Unit and integration tests
3. **Build** - Compile/bundle application
4. **Security** - Dependency audit, SAST
5. **Deploy to Staging** - Automatic on main branch
6. **Deploy to Production** - Manual approval or tag-based

### Environment Management

- Use environment variables for configuration, not hardcoded values
- Maintain .env.example with all required variables (no secrets)
- Use different configs per environment: development, staging, production
- Validate environment variables at startup with Zod or similar
- Never commit .env files to version control`,
  version: '1.0.0',
  source: 'bundled',
  enabled: true,
  priority: 10,
};
