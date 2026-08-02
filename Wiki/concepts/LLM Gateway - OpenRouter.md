---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-08-02
source_count: 6
confidence: high
---

# LLM Gateway — OpenRouter

> Infrastructure adapter for LLM model access via OpenRouter  
> `apps/backend/src/infrastructure/llm-gateway.ts`

## Why OpenRouter

OpenRouter provides a **single API endpoint** to access 200+ models from OpenAI, Anthropic, Google, Meta, DeepSeek, and others. For Flow App, this means:

- **One integration, many models**: swap models without changing code
- **Model tier mapping**: our `ModelTier` (premium, balanced, light, search) maps to specific OpenRouter model IDs
- **Fallback chain**: if a model is unavailable, fall back to an alternative in the same tier
- **Cost tracking**: OpenRouter provides per-request token usage and cost — feed into [[Usage & Quota]]

## Model Tier Mapping

Each `ModelTier` used in [[Tool as Static Configuration|ToolDefinition.steps[].prompt.model]] resolves to one or more OpenRouter model IDs:

```typescript
// apps/backend/src/infrastructure/model-registry.ts

type ModelTier = 'premium' | 'balanced' | 'light' | 'search';

const modelRegistry: Record<ModelTier, ModelConfig> = {
  premium: {
    primary:   'anthropic/claude-sonnet-4-20250514',  // best quality
    fallback:  'openai/gpt-4o',
    maxTokens: 16000,
  },
  balanced: {
    primary:   'openai/gpt-4o-mini',                  // good quality/cost ratio
    fallback:  'google/gemini-2.0-flash-001',
    maxTokens: 8000,
  },
  light: {
    primary:   'google/gemini-2.0-flash-lite-001',    // fast, cheap
    fallback:  'meta-llama/llama-4-maverick:free',
    maxTokens: 4000,
  },
  search: {
    primary:   'google/gemini-2.5-pro-preview-05-06', // web search enabled
    fallback:  'perplexity/sonar-reasoning-pro',
    maxTokens: 8000,
  },
};
```

| Tier | Use case | Primary model | Characteristics |
|------|----------|---------------|-----------------|
| `premium` | Final step output quality | Claude Sonnet 4 | Best reasoning, long context |
| `balanced` | Intermediate steps, extraction | GPT-4o Mini | Good quality/cost balance |
| `light` | Fast enrichment, simple tasks | Gemini Flash Lite | Fast, cheap |
| `search` | Web-aware analysis (AI Overview, SERP) | Gemini 2.5 Pro | Web search enabled |

## LlmGateway Implementation

```typescript
// apps/backend/src/infrastructure/llm-gateway.ts

import OpenAI from 'openai';  // OpenRouter is OpenAI-compatible

interface LlmGatewayConfig {
  apiKey: string;
  baseUrl: string;            // 'https://openrouter.ai/api/v1'
  appName: string;            // sent as HTTP-Referer header
  defaultTimeoutMs: number;
}

class LlmGateway {
  private client: OpenAI;

  constructor(private config: LlmGatewayConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: {
        'HTTP-Referer': config.appName,
        'X-Title': config.appName,
      },
    });
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const modelConfig = modelRegistry[params.model];
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: modelConfig.primary,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user',   content: params.userPrompt },
        ],
        max_tokens: modelConfig.maxTokens,
        temperature: params.temperature ?? 0.7,
      }, {
        timeout: params.timeout ?? this.config.defaultTimeoutMs,
      });

      return {
        content: response.choices[0]?.message?.content ?? '',
        model: response.model,                // actual model used
        usage: {
          promptTokens:     response.usage?.prompt_tokens     ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens:      response.usage?.total_tokens      ?? 0,
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      // Attempt fallback if primary fails
      if (modelConfig.fallback && this.isRetryable(error)) {
        return this.generateWithModel(modelConfig.fallback, params);
      }
      throw new LlmGatewayError(
        error instanceof Error ? error.message : 'Unknown LLM error',
        params.model,
        modelConfig.primary,
      );
    }
  }

  private async generateWithModel(
    modelId: string,
    params: GenerateParams,
  ): Promise<GenerateResult> {
    const response = await this.client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user',   content: params.userPrompt },
      ],
      max_tokens: 8000,
    }, { timeout: params.timeout });

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      usage: { /* ... */ },
      latencyMs: 0,
      fallbackUsed: true,
    };
  }

  private isRetryable(error: unknown): boolean {
    // 429 rate limit, 503 service unavailable, network errors
    if (error instanceof OpenAI.APIError) {
      return error.status === 429 || error.status === 503 || error.status === 500;
    }
    return true; // network errors are always retryable
  }
}

interface GenerateParams {
  model: ModelTier;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  timeout?: number;
}

interface GenerateResult {
  content: string;
  model: string;         // actual model ID used (e.g. 'anthropic/claude-sonnet-4-20250514')
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  fallbackUsed?: boolean;
}
```

## Integration with ProcessStepUseCase

```typescript
// apps/backend/src/application/generation/process-step.usecase.ts

class ProcessStepUseCase {
  constructor(
    private contextEnricher: ContextEnricher,
    private llmGateway: LlmGateway,
    private promptLoader: PromptLoader,  // loads template files
  ) {}

  async execute(cmd: ProcessStepCommand): Promise<Artifact> {
    // 1. Enrich context (domain service)
    const enrichedContext = this.contextEnricher.enrich({
      step: cmd.step,
      previousResults: cmd.previousResults,
      acquisitionData: cmd.acquisitionData,
    });

    // 2. Load prompt template
    const template = await this.promptLoader.load(cmd.step.prompt.template);

    // 3. Call LLM via OpenRouter
    const result = await this.llmGateway.generate({
      model: cmd.step.prompt.model,          // ModelTier → OpenRouter model
      systemPrompt: template.system,
      userPrompt: enrichedContext,
      timeout: cmd.step.execution.timeoutMs,
    });

    // 4. Track token usage for quota (optional: real-time cost tracking)
    // await usageTracker.track(result.usage.totalTokens, cmd.session.userId);

    // 5. Return artifact
    return Artifact.create(
      StepNumber.of(cmd.step.order),
      ArtifactContent.from(result.content),
    );
  }
}
```

## Environment Configuration

```bash
# .env (apps/backend)

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_NAME=flow-app

# Optional: per-tier model overrides
# LLM_MODEL_PREMIUM=anthropic/claude-sonnet-4-20250514
# LLM_MODEL_BALANCED=openai/gpt-4o-mini
# LLM_MODEL_LIGHT=google/gemini-2.0-flash-lite-001
# LLM_MODEL_SEARCH=google/gemini-2.5-pro-preview-05-06
```

The optional `LLM_MODEL_*` env vars allow changing models **without redeploying code** — useful for A/B testing or emergency model switches.

## Prompt Template Loading

```typescript
// apps/backend/src/infrastructure/prompt-loader.ts

class PromptLoader {
  constructor(private basePath: string) {}  // e.g. 'apps/backend/src/prompts/'

  async load(templatePath: string): Promise<PromptTemplate> {
    // templatePath example: 'landing-funnel/extraction'
    const systemPath = `${this.basePath}${templatePath}/system.md`;
    const userPath   = `${this.basePath}${templatePath}/user.md`;

    return {
      system: await fs.readFile(systemPath, 'utf-8'),
      user:   await fs.readFile(userPath, 'utf-8'),
    };
  }
}

interface PromptTemplate {
  system: string;
  user: string;
}
```

**Template directory structure**:
```
apps/backend/src/prompts/
├── landing-funnel/
│   ├── extraction/
│   │   ├── system.md
│   │   └── user.md
│   ├── opt-in/
│   │   ├── system.md
│   │   └── user.md
│   ├── quiz/
│   │   ├── system.md
│   │   └── user.md
│   └── vsl/
│       ├── system.md
│       └── user.md
├── blog-post/
│   ├── seo-structure/
│   ├── outline/
│   └── article/
├── ai-overview-analysis/
│   ├── extract/
│   ├── scoring/
│   ├── strategic/
│   └── unified/
├── brand-voice/
│   └── extract/
├── brief/
│   └── extract/
...
```

## Cost Tracking (Future)

OpenRouter returns per-request pricing in the response. This can feed the [[Usage & Quota]] context:

```typescript
// Future: track real cost instead of flat credit deduction
const cost = result.usage.totalTokens * PRICING[result.model];
await usageTracker.trackCost(cmd.session.userId, cost);
```

## Reliability Policy

### Timeout and Retry Budget

| Dependency | Timeout | Retry Policy | Max Attempts |
|------------|---------|--------------|--------------|
| OpenRouter primary model | step `timeoutMs` (default 60s) | retry only on network/429/5xx with exponential backoff + jitter | 2 |
| OpenRouter fallback model | same timeout budget (remaining time only) | no extra retries after fallback call | 1 |

Rules:

1. Retry only for transient failures (`429`, `500`, `503`, transport errors).
2. Do not retry on validation/content-policy errors.
3. Preserve a total step budget: fallback cannot exceed remaining timeout.

### Deterministic Prompt Execution

- Prompt template path is treated as a versioned contract (`tool/step-template@version`).
- Prompt rendering must log `templateId`, `templateVersion`, and selected model.
- Response parsing must validate expected output shape before persisting artifacts.

This does not make model output mathematically deterministic, but it makes execution **operationally deterministic** for development, replay, and incident analysis.

## Token Budget Control

Controls per-session and per-conversation token consumption to prevent run-away LLM costs. Enforces hard caps with warning thresholds.

- `TOKEN_BUDGET_MAX_TOTAL` — hard cap on total tokens per entity (default: 100K)
- `TOKEN_BUDGET_WARNING_THRESHOLD` — percentage of cap that triggers a warning (default: 80%)
- Budgets are enforced at the application layer before each LLM call
- Exceeding the hard cap stops generation and returns a controlled error

Referenced in [[implementation-roadmap-2026-08-01]] Phase 6 task 4.

## Sources

- [[Tool as Static Configuration]] — `prompt.model: ModelTier` on each step
- [[Application Services]] — `ProcessStepUseCase` integration point
- [[BullMQ Worker Wiring]] — worker invokes ProcessStepUseCase
- [[Usage & Quota]] — credit tracking from token usage
- [[API Contract Baseline v1]]
- [[implementation-roadmap-2026-08-01]]

---

## Prompt Template Validation — Startup Check

```typescript
// apps/backend/src/infrastructure/prompt-loader.ts

import fs from 'node:fs';
import { toolRegistry } from '@flow-app/domain/generation';
import { logger } from './logger';

function validateAllTemplates(): void {
  const missing: string[] = [];
  const basePath = 'apps/backend/src/prompts/';

  for (const tool of Object.values(toolRegistry)) {
    for (const step of tool.steps) {
      const templatePath = step.prompt.template;
      const systemPath = `${basePath}${templatePath}/system.md`;
      const userPath   = `${basePath}${templatePath}/user.md`;

      if (!fs.existsSync(systemPath)) missing.push(systemPath);
      if (!fs.existsSync(userPath))   missing.push(userPath);
    }
  }

  if (missing.length > 0) {
    logger.fatal({ missing }, 'Missing prompt templates');
    throw new Error(
      `FATAL: ${missing.length} prompt template(s) missing. ` +
      'Create the missing files before starting the server.\n' +
      missing.join('\n')
    );
  }

  logger.info({ count: Object.values(toolRegistry).reduce((sum, t) => sum + t.steps.length, 0) },
    'All prompt templates validated');
}

// Called at startup, before queue processing begins
validateAllTemplates();
```

**Fail-fast**: the server refuses to start if a template is missing. No silently-failed generation due to absent templates.
