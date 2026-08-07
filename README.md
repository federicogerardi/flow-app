# Flow App

AI-powered content generation platform for B2B marketing teams. Transform briefings, documents, and data into structured marketing artifacts through deterministic, traceable multi-step LLM pipelines.

## What It Does

Flow App takes your marketing inputs — briefs, buyer personas, brand guidelines, competitive data — and produces ready-to-use content: landing pages, video scripts, ad copy, blog posts, and more. Every output traces back to the inputs that generated it, with no black boxes and no guesswork.

## Core Concepts

### Unified Tool Model

All 12 tools share the same execution engine. Define the tool, configure the inputs, and the pipeline handles the rest:

1. **Acquisition** — gather data from text, files, APIs, or workspace assets
2. **Elaboration** — multi-step LLM pipeline, each step informed by the previous
3. **Artifact** — structured, promotable output ready for your workflow

### Content Toolchain

Assets feed content tools, creating a chain where each output strengthens the next:

```
Brief → Persona → Angle → Landing Page
                    ↘ Ad Copy
                    ↘ Video Script
                    ↘ Blog Post
```

Generated outputs can be promoted back to assets, building an ever-richer knowledge base.

### Agent Chat

Seven role-specific agents provide conversational guidance throughout the creation process — from strategic direction to copy refinement — each with workspace-aware context.

### Gamification

An engagement layer tracks progress, awards XP and badges, and drives team momentum through streaks, challenges, and leaderboards.

## Tools

### Content Generation
| Tool | Output |
|------|--------|
| Landing Funnel | Multi-page funnel (opt-in → quiz → VSL) |
| Landing Page | Landing page + thank-you page |
| Video Script (Long Form) | 6-step structured video script |
| Video Description | Optimized video description |
| Blog Post | SEO-optimized article |
| Ad Copy | Multi-variant ad copy |

### Asset Creation
| Tool | Produces |
|------|----------|
| Brief | Creative brief (11 sections, downstream-first) |
| Brand Voice | Brand voice and tone guidelines |
| Buyer Persona | Detailed demographic + psychographic profile |
| Marketing Angle | Strategic positioning angle |

### Analysis
| Tool | Output |
|------|--------|
| AI Overview Analysis | Competitive presence analysis on AI search results |

## Design Principles

- **Deterministic over generative** — every output traces to specific inputs and decisions
- **Domain-driven** — bounded contexts, aggregate roots, and value objects model the business, not the database
- **Downstream-first** — every piece of content answers what the next step will need
- **Tool as configuration** — 12 tools, one engine; new tools are configuration, not new code
- **Progressive enrichment** — context builds across the pipeline, never starts from scratch

## Built With

TypeScript, React, XState v5, PostgreSQL, Redis, OpenRouter
