import type { Skill } from '../../../../shared/types/skill';

export const frontendDesignSkill: Skill = {
  id: 'frontend-design',
  name: 'Frontend Design Excellence',
  description: 'Create distinctive, production-grade frontend interfaces with high design quality. Avoids generic AI aesthetics.',
  category: 'frontend',
  keywords: [
    'react', 'ui', 'tailwind', 'component', 'frontend', 'css', 'html',
    'landing', 'page', 'layout', 'design', 'responsive', 'animation',
    'theme', 'styled', 'interface', 'web', 'button', 'form', 'modal',
    'dashboard', 'sidebar', 'navbar', 'card', 'typography', 'color',
  ],
  promptContent: `## Skill: Frontend Design Excellence

Guide creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

### Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful, editorial, brutalist, art deco, soft/pastel, industrial, etc.
- **Differentiation**: What makes this UNFORGETTABLE?

Choose a clear conceptual direction and execute it with precision.

### Frontend Aesthetics Guidelines

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions. Focus on high-impact moments: staggered reveals, scroll-triggering, hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth. Apply gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows.

NEVER use generic AI-generated aesthetics: overused font families (Inter, Roboto, Arial), cliched color schemes (purple gradients on white), predictable layouts, cookie-cutter design.

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate animations. Minimalist designs need restraint, precision, and careful spacing.`,
  version: '1.0.0',
  source: 'bundled',
  enabled: true,
  priority: 10,
};
