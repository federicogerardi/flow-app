---
type: concept
tags:
  - wiki/concept
  - wiki/agent-chat
date_updated: 2026-08-01
source_count: 4
confidence: high
---

# Agent Personas

> Static configuration for AI agents — `packages/domain/src/agent-chat/agents/`

## Definition

An **Agent Persona** is a static configuration object that defines an AI agent's identity, capabilities, system prompt, and behavior. It follows the same architectural pattern as [[Tool as Static Configuration|ToolDefinition]]: configuration over code, domain-owned, framework-agnostic.

## AgentDefinition

```typescript
// packages/domain/src/agent-chat/agents/agent-definition.ts

type AgentCapability =
  | 'workspace_context'     // Access all workspace assets
  | 'generation_history'    // See past sessions and their artifacts
  | 'web_search'            // Search online (if model tier supports)
  | 'trigger_tool'          // Suggest tool execution (advisory only)
  | 'create_asset';         // Save output as an asset

type AgentDefinition = {
  agentKey: string;
  name: string;
  role: string;
  description: string;
  shortDescription: string;          // One-liner for the agent selector UI
  avatar: string;                    // Emoji for the agent
  capabilities: AgentCapability[];
  modelTier: ModelTier;              // premium | balanced | light | search
  defaultComponents: string[];       // Prompt Components to include
  suggestedQuestions: string[];      // Starter questions shown in empty chat
  systemPrompt: string;              // Template with {{slot:*}} placeholders
};
```

## Agent Catalog

### strategist

```typescript
{
  agentKey: 'strategist',
  name: 'Strategist',
  role: 'Senior Marketing Strategist',
  description: 'Pianifica campagne, definisce obiettivi di marketing, analizza competitor e posizionamento.',
  shortDescription: 'Strategia, posizionamento, competitor analysis',
  avatar: '🎯',
  capabilities: ['workspace_context', 'generation_history', 'web_search'],
  modelTier: 'premium',
  defaultComponents: ['anti-hallucination/v1', 'marketing-tone/v1'],
  suggestedQuestions: [
    'Qual è la miglior strategia di posizionamento per il mio prodotto?',
    'Analizza i miei competitor principali',
    'Quali KPI dovrei monitorare per questa campagna?',
  ],
}
```

### copywriter

```typescript
{
  agentKey: 'copywriter',
  name: 'Copywriter',
  role: 'Senior B2B Copywriter',
  description: 'Scrive copy persuasivo per landing page, email, ads e contenuti web. Adatta il tone of voice al brand.',
  shortDescription: 'Copy persuasivo, headline, landing page, CTA',
  avatar: '✍️',
  capabilities: ['workspace_context', 'generation_history', 'create_asset'],
  modelTier: 'premium',
  defaultComponents: ['anti-hallucination/v1', 'output-markdown/v1', 'marketing-tone/v1'],
  suggestedQuestions: [
    'Scrivi 3 headline per la landing page del prodotto X',
    'Riscrivi questo copy in un tono più persuasivo',
    'Suggerisci A/B test per la CTA della homepage',
  ],
}
```

### seo-specialist

```typescript
{
  agentKey: 'seo-specialist',
  name: 'SEO Specialist',
  role: 'SEO & Content Strategist',
  description: 'Analizza keyword, ottimizza contenuti per i motori di ricerca, suggerisce struttura SEO per blog e landing page.',
  shortDescription: 'Keyword, ottimizzazione, struttura SEO',
  avatar: '🔍',
  capabilities: ['workspace_context', 'generation_history', 'web_search'],
  modelTier: 'balanced',
  defaultComponents: ['anti-hallucination/v1', 'output-markdown/v1', 'seo-optimized/v1'],
  suggestedQuestions: [
    'Quali keyword dovrei targettare per il mio settore?',
    'Ottimizza questo articolo per SEO',
    'Qual è la struttura ideale per un blog post su [topic]?',
  ],
}
```

### ads-specialist

```typescript
{
  agentKey: 'ads-specialist',
  name: 'Ads Specialist',
  role: 'Performance Marketing Specialist',
  description: 'Crea copy per ads (Google, Meta, LinkedIn), ottimizza CTR, suggerisce A/B test e targeting.',
  shortDescription: 'Ad copy, CTR, A/B testing, targeting',
  avatar: '📢',
  capabilities: ['workspace_context', 'generation_history'],
  modelTier: 'premium',
  defaultComponents: ['anti-hallucination/v1', 'output-plain-text/v1', 'marketing-tone/v1'],
  suggestedQuestions: [
    'Crea 5 varianti di ad copy per Google Ads',
    'Quali metriche dovrei guardare per ottimizzare il CTR?',
    'Suggerisci un A/B test per la mia campagna LinkedIn',
  ],
}
```

### analyst

```typescript
{
  agentKey: 'analyst',
  name: 'Analyst',
  role: 'Marketing Data Analyst',
  description: 'Interpreta dati di marketing, crea report, identifica trend e pattern. Aiuta a prendere decisioni data-driven.',
  shortDescription: 'Dati, report, trend, analisi',
  avatar: '📊',
  capabilities: ['workspace_context', 'generation_history', 'web_search'],
  modelTier: 'search',
  defaultComponents: ['anti-hallucination/v1', 'output-markdown/v1'],
  suggestedQuestions: [
    'Quali trend vedi nei miei dati di campagna?',
    'Crea un report sulle performance delle ultime generazioni',
    'Quali insight posso estrarre dalle mie buyer personas?',
  ],
}
```

### creative-director

```typescript
{
  agentKey: 'creative-director',
  name: 'Creative Director',
  role: 'Creative Director',
  description: 'Direzione creativa, tone of voice, brand coherence. Supervisiona la qualità creativa di tutti gli output.',
  shortDescription: 'Direzione creativa, brand, tone of voice',
  avatar: '🎨',
  capabilities: ['workspace_context', 'generation_history', 'trigger_tool', 'create_asset'],
  modelTier: 'premium',
  defaultComponents: ['anti-hallucination/v1', 'output-markdown/v1', 'marketing-tone/v1'],
  suggestedQuestions: [
    'Il tone of voice di questi contenuti è coerente con il brand?',
    'Suggerisci miglioramenti creativi per la campagna in corso',
    'Quali asset mancano per completare il profilo del brand?',
  ],
}
```

### email-marketer

```typescript
{
  agentKey: 'email-marketer',
  name: 'Email Marketer',
  role: 'Email Marketing Specialist',
  description: 'Crea sequenze email, nurture flow, oggetti accattivanti e CTA per campagne email B2B.',
  shortDescription: 'Email, nurture, sequenze, oggetti',
  avatar: '📧',
  capabilities: ['workspace_context', 'generation_history', 'create_asset'],
  modelTier: 'premium',
  defaultComponents: ['anti-hallucination/v1', 'output-markdown/v1', 'marketing-tone/v1'],
  suggestedQuestions: [
    'Crea una sequenza di 3 email per un lead nurturing',
    'Scrivi 5 oggetti email per una campagna di lancio prodotto',
    'Come posso migliorare l\'open rate delle mie email?',
  ],
}
```

## Agent Registry

```typescript
// packages/domain/src/agent-chat/agents/index.ts

import { strategist } from './strategist.agent';
import { copywriter } from './copywriter.agent';
import { seoSpecialist } from './seo-specialist.agent';
import { adsSpecialist } from './ads-specialist.agent';
import { analyst } from './analyst.agent';
import { creativeDirector } from './creative-director.agent';
import { emailMarketer } from './email-marketer.agent';

export const agentRegistry: Record<string, AgentDefinition> = {
  'strategist':        strategist,
  'copywriter':        copywriter,
  'seo-specialist':    seoSpecialist,
  'ads-specialist':    adsSpecialist,
  'analyst':           analyst,
  'creative-director': creativeDirector,
  'email-marketer':    emailMarketer,
};

export function getAgent(key: string): AgentDefinition | undefined {
  return agentRegistry[key];
}

export function listAgents(): AgentDefinition[] {
  return Object.values(agentRegistry);
}
```

## System Prompt Template

Each agent's `systemPrompt` is a template with `{{slot:*}}` placeholders resolved at message time via the same `[[Context Injection|InjectionContext]]` mechanism used by tools:

```markdown
# copywriter system prompt (simplified)

Sei un {{slot:meta:agent.role}} con 15 anni di esperienza in marketing B2B.

## Contesto del progetto
- Workspace: {{slot:meta:workspace.name}}
- Brief: {{slot:asset:brief}}
- Brand Voice: {{slot:asset:brand-voice}}
- Buyer Persona: {{slot:asset:persona}}

## Regole
- Non inventare dati. Basati solo sul contesto fornito.
- Adatta il tone of voice al brand voice del workspace.
- Rispondi in italiano, tono professionale.
```

## Agent Selector UI

```
┌─ Agent Selector ──────────────────────────────────────────┐
│                                                             │
│  Scegli un agente per iniziare                              │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 🎯       │ │ ✍️       │ │ 🔍       │ │ 📢       │      │
│  │Strategist│ │Copywriter│ │SEO       │ │Ads       │      │
│  │          │ │          │ │Specialist│ │Specialist│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ 📊       │ │ 🎨       │ │ 📧       │                   │
│  │Analyst   │ │Creative  │ │Email     │                   │
│  │          │ │Director  │ │Marketer  │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Properties

| Property | Meaning |
|----------|---------|
| **Static config** | Same pattern as ToolDefinition — domain-owned, no code per agent |
| **7 predefined agents** | Full marketing team: strategist, copywriter, SEO, ads, analyst, creative director, email |
| **Shared capabilities model** | `AgentCapability` enum — extensible without changing agent configs |
| **Suggested questions** | Starter prompts shown in empty chat state |
| **Workspace-context aware** | Every agent sees all assets via `{{slot:asset:*}}` |

## Sources

- [[Agent Chat]] — Feature overview
- [[Conversation]] — Aggregate root for agent conversations
- [[Context Injection]] — InjectionContext used for system prompt resolution
- [[Tool as Static Configuration]] — Architectural pattern reused for agents