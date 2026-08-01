import { PromptComponent } from './PromptComponent';
import { PromptVersion } from './PromptVersion';
import type { PromptComponentType } from './PromptComponent';

interface ComponentDefinition {
  key: string;
  type: PromptComponentType;
  description: string;
  content: string;
}

const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
  {
    key: 'anti-hallucination/v1',
    type: 'system_rule',
    description: 'Do not fabricate facts, quotes, or sources. State uncertainty when unsure.',
    content: `IMPORTANT RULES:
- Do not fabricate statistics, quotes, or sources. If you are unsure, state your uncertainty.
- When citing data, use only information explicitly provided in the input context.
- Do not claim expertise beyond the provided materials.
- If the user's request is unclear, ask for clarification rather than guessing.`,
  },
  {
    key: 'no-prior-knowledge/v1',
    type: 'system_rule',
    description: 'Use only the context provided. Do not bring external world knowledge.',
    content: `CONTEXT RULES:
- Use ONLY the information provided in the input context.
- Do not bring external world knowledge or assumptions.
- If information is missing from the context, state what is missing rather than guessing.`,
  },
  {
    key: 'step-awareness/v1',
    type: 'system_rule',
    description: 'You are step N of M. Generate intermediate output suitable as input for the next step.',
    content: `STEP AWARENESS:
- You are executing one step in a multi-step generation pipeline.
- Your output will be used as input for the next step.
- Generate output that is structured and complete enough for the next step to build upon.`,
  },
  {
    key: 'output-markdown/v1',
    type: 'format_constraint',
    description: 'Output valid Markdown with proper heading hierarchy.',
    content: `OUTPUT FORMAT:
- Respond in valid Markdown.
- Use ## for sections, ### for subsections.
- Use bullet lists (-) for items, numbered lists (1.) for sequences.
- Wrap code in triple backticks with language identifier.
- Do NOT wrap the entire response in a markdown code block.`,
  },
  {
    key: 'output-json/v1',
    type: 'format_constraint',
    description: 'Output valid JSON matching a specified schema.',
    content: `OUTPUT FORMAT:
- Respond with valid JSON only.
- Do not wrap in markdown code blocks.
- Follow the exact schema specified in the prompt.
- Ensure all required fields are present.`,
  },
  {
    key: 'output-plain-text/v1',
    type: 'format_constraint',
    description: 'Output plain text only. No formatting, no markdown.',
    content: `OUTPUT FORMAT:
- Respond in plain text only.
- No markdown formatting, no headings, no bullet points.
- Use paragraphs for structure.`,
  },
  {
    key: 'marketing-tone/v1',
    type: 'style_guide',
    description: 'Professional B2B tone. No hype, no empty superlatives.',
    content: `TONE GUIDELINES:
- Professional B2B tone. Avoid marketing hype and empty superlatives ("revolutionary", "game-changing").
- Be specific and concrete. Use data when available.
- Write for a decision-maker audience (CMOs, marketing directors).
- Italian text should be direct and professional. Use "Tu" form.`,
  },
  {
    key: 'seo-optimized/v1',
    type: 'style_guide',
    description: 'SEO best practices: keyword placement, meta description hints, readability.',
    content: `SEO GUIDELINES:
- Place the primary keyword in the first paragraph and at least one heading.
- Use related keywords naturally throughout the content.
- Keep paragraphs short (3-4 sentences max) for readability.
- Include a meta description suggestion at the end.`,
  },
  {
    key: 'italian-formal/v1',
    type: 'style_guide',
    description: 'Informal Italian. Use "Tu" form. Clear and direct.',
    content: `LANGUAGE GUIDELINES:
- Write in Italian using the informal "Tu" form.
- Be clear, direct, and professional without being bureaucratic.
- Use proper Italian business vocabulary.`,
  },
  {
    key: 'no-offensive-content/v1',
    type: 'safety_guard',
    description: 'No hate speech, harassment, or offensive material.',
    content: `SAFETY RULES:
- Do not generate hate speech, harassment, or offensive content.
- Avoid stereotypes and discriminatory language.
- Keep content professional and respectful.`,
  },
  {
    key: 'no-competitor-slander/v1',
    type: 'safety_guard',
    description: 'Do not make negative claims about competitors without verified data.',
    content: `SAFETY RULES:
- Do not make negative claims about competitors without verified data.
- Focus on strengths rather than competitor weaknesses.
- If comparison is needed, use factual, verifiable information only.`,
  },
  {
    key: 'data-privacy/v1',
    type: 'safety_guard',
    description: 'Do not generate or expose PII, credentials, or sensitive data.',
    content: `SAFETY RULES:
- Do not generate or expose personally identifiable information (PII).
- Do not include real credentials, API keys, or sensitive data.
- Use placeholder values for any required identifiers.`,
  },
];

export function getDefaultComponents(): PromptComponent[] {
  return COMPONENT_DEFINITIONS.map((def) =>
    PromptComponent.fromFile(
      def.key,
      def.type,
      def.content,
      PromptVersion.from('1.0.0'),
      def.description,
    ),
  );
}

export const DEFAULT_COMPONENTS: Record<string, string[]> = {
  'landing-funnel': ['anti-hallucination/v1', 'output-markdown/v1', 'marketing-tone/v1'],
  'landing-page': ['anti-hallucination/v1', 'output-markdown/v1', 'marketing-tone/v1'],
  'video-script-long-form': ['anti-hallucination/v1', 'output-markdown/v1'],
  'video-description': ['anti-hallucination/v1', 'output-markdown/v1'],
  'blog-post': ['anti-hallucination/v1', 'output-markdown/v1', 'seo-optimized/v1'],
  'ad-copy': ['anti-hallucination/v1', 'output-plain-text/v1', 'marketing-tone/v1'],
  'brief': ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  'brand-voice': ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  'buyer-persona': ['anti-hallucination/v1', 'output-plain-text/v1'],
  'marketing-angle': ['anti-hallucination/v1', 'output-plain-text/v1'],
  'ai-overview-analysis': ['anti-hallucination/v1', 'output-json/v1', 'no-competitor-slander/v1'],
};
