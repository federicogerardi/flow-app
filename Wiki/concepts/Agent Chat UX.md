---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/ux
  - wiki/agent-chat
date_updated: 2026-08-01
source_count: 8
confidence: high
---

# Agent Chat UX

> UX and component specifications for the Agent Chat feature — extends [[UI Component Map]] (23→29) and [[UX Wireframes]] (8→10 templates)  
> Entry point: sidebar "Team" nav item. Routes: `/workspaces/:id/team` + `/workspaces/:id/conversations/:id`

## Conversation Privacy

Conversations are **private to their creator**. The Team Hub shows only the current user's conversations — never those of other workspace members.

```
Workspace "Q3 Campaign" (shared)
├── Asset "Brand Voice"        ← visibile a tutti i membri
├── Session "Blog Post #1"     ← visibile a tutti i membri
│
├── User A ↔ Copywriter        ← visibile SOLO a user A
├── User B ↔ Copywriter        ← visibile SOLO a user B
├── User A ↔ Strategist        ← visibile SOLO a user A
└── User C ↔ Analyst           ← visibile SOLO a user C
```

In the UI, this means:
- **Agent grid** — identical for all members (same 7 agents)
- **Conversazioni Recenti** — shows only the current user's conversations
- **Conversation detail** — only accessible if `conversation.userId === currentUser.id`
- **Agent Context Drawer** — identical for all members (same shared assets/sessions)

## Navigation Integration

The sidebar gains a **Team** nav item between Assets and the Templates placeholder. Mobile bottom nav expands to five items.

### Desktop Sidebar (updated)

```
│  NAV                            │
│  ─────────────────────────────  │
│  ⬡  Home                        │
│  ⚡  Tools                       │
│  ◐  Sessions                    │
│  ◈  Assets                      │
│  👥  Team                   ← NEW│
│  ─────────────────────────────  │
│  ◫  Templates  [soon]           │
│  ≡  Audit Log  [soon]           │
```

### Mobile Bottom Nav (updated)

```
│  🏠    ⚡    ◐    ◈    👥      │
│ Home  Tools Sess. Assets Team   │
```

Five items fit the MUI `BottomNavigation` component without overflow. Team icon: `GroupsIcon` (MUI).

### Routes

| Route | View | Component |
|-------|------|-----------|
| `/workspaces/:id/team` | Team Hub | `TeamHub` |
| `/workspaces/:id/conversations/:conversationId` | Chat | `ConversationPage` |

---

## Template 9 — Team Hub

Entry point for Agent Chat. Two sections: agent selector grid + recent conversations.

```
DESKTOP ─────────────────────────────────────────────────────────────────

┌─ PageHeader ──────────────────────────────────────────────────────────┐
│  Q3 Campaign > Team                                                     │
└───────────────────────────────────────────────────────────────────────┘

┌─ Hero Banner ─────────────────────────────────────────────────────────┐
│  👥  Il tuo team marketing virtuale                                     │
│  7 specialisti con accesso completo agli asset del workspace            │
└───────────────────────────────────────────────────────────────────────┘

┌─ Agent Grid ──────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │  🎯              │  │  ✍️              │  │  🔍              │        │
│  │  Strategist      │  │  Copywriter      │  │  SEO Specialist  │        │
│  │  Senior Marketing│  │  Senior B2B      │  │  SEO & Content   │        │
│  │  Strategist      │  │  Copywriter      │  │  Strategist      │        │
│  │                  │  │                  │  │                  │        │
│  │ Pianifica campa- │  │ Scrive copy per- │  │ Analizza keyword,│        │
│  │ gne, posiziona-  │  │ suasivo per      │  │ ottimizza conte- │        │
│  │ mento, competi-  │  │ landing, email,  │  │ nuti per SEO,    │        │
│  │ tor analysis     │  │ ads              │  │ struttura blog   │        │
│  │                  │  │                  │  │                  │        │
│  │ [Inizia chat →]  │  │ [Inizia chat →]  │  │ [Inizia chat →]  │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │  📢              │  │  📊              │  │  🎨              │        │
│  │  Ads Specialist  │  │  Analyst         │  │  Creative Dir.   │        │
│  │  Performance     │  │  Marketing Data  │  │  Creative        │        │
│  │  Marketing       │  │  Analyst         │  │  Director        │        │
│  │                  │  │                  │  │                  │        │
│  │ Crea ad copy,    │  │ Interpreta dati, │  │ Direzione crea-  │        │
│  │ ottimizza CTR,   │  │ crea report,     │  │ tiva, brand co-  │        │
│  │ A/B testing      │  │ identifica trend │  │ herence, TOV     │        │
│  │                  │  │                  │  │                  │        │
│  │ [Inizia chat →]  │  │ [Inizia chat →]  │  │ [Inizia chat →]  │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│  ┌─────────────────┐                                                    │
│  │  📧              │                                                    │
│  │  Email Marketer  │                                                    │
│  │  Email Marketing │                                                    │
│  │  Specialist      │                                                    │
│  │                  │                                                    │
│  │ Sequenze email,  │                                                    │
│  │ nurture flow,    │                                                    │
│  │ oggetti, CTA     │                                                    │
│  │                  │                                                    │
│  │ [Inizia chat →]  │                                                    │
│  └─────────────────┘                                                    │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘

┌─ Le tue Conversazioni ────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ✍️  Copywriter     "Scrivi 3 headline per landing page…"   2h   │  │
│  │                                                         [Riprendi]│  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  🎯  Strategist     "Analisi competitor per Q3 campaign"   1gg   │  │
│  │                                                         [Riprendi]│  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  (solo le conversazioni dell'utente corrente. User B vede le sue,       │
│   non quelle di User A)                                                 │
│                                                                         │
│  [Tutte le tue conversazioni →]                                         │
└───────────────────────────────────────────────────────────────────────┘


MOBILE ──────────────────────────────────────────────────────────────────

┌─────────────────────────────┐
│ Q3 Campaign > Team          │
├─────────────────────────────┤
│ 👥 Il tuo team marketing    │
│ 7 specialisti               │
├─────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ │
│ │ 🎯        │ │ ✍️        │ │
│ │ Strategist│ │Copywriter │ │
│ │[Inizia →] │ │[Inizia →] │ │
│ └───────────┘ └───────────┘ │
│ ┌───────────┐ ┌───────────┐ │
│ │ 🔍        │ │ 📢        │ │
│ │ SEO       │ │ Ads       │ │
│ │[Inizia →] │ │[Inizia →] │ │
│ └───────────┘ └───────────┘ │
│ ┌───────────┐ ┌───────────┐ │
│ │ 📊        │ │ 🎨        │ │
│ │ Analyst   │ │ Creative  │ │
│ │[Inizia →] │ │[Inizia →] │ │
│ └───────────┘ └───────────┘ │
│ ┌───────────┐               │
│ │ 📧        │               │
│ │ Email     │               │
│ │[Inizia →] │               │
│ └───────────┘               │
├─────────────────────────────┤
│ RECENTI                     │
│ ✍️ "Scrivi 3 headline…" 2h   │
│ 🎯 "Analisi competitor" 1gg  │
│ [Tutte →]                   │
└─────────────────────────────┘
```

**Team Hub rules:**
- Agent cards use `cursor: pointer` + hover lift `translateY(-3px)` + accent glow `box-shadow: var(--shadow-accent)`
- "Inizia chat →" always navigates to a new conversation (never reopens existing one from card)
- Recent conversations show agent emoji + first 60 chars of title + relative time + "Riprendi" CTA
- Recent conversations are **user-scoped** — each member sees only their own conversations, not those of other workspace members
- Empty recent conversations → hide the section entirely (no empty state needed — user has just landed)
- Grid: 3 columns on 1280px+, 2 columns on 768-1279px, 2 columns on mobile (compact cards)

---

## Template 10 — Conversation View

Full chat interface. Replaces the workspace content area. The existing sidebar remains visible.

```
DESKTOP ─────────────────────────────────────────────────────────────────

┌─ Sidebar ────────┐  ┌─ Conversation Area (flex-grow) ─────────────────┐
│  (existing)       │  │                                                  │
│                   │  │  ┌─ ConvHeader ──────────────────────────────┐  │
│                   │  │  │  ← Q3 Campaign > Team                      │  │
│                   │  │  │  ✍️ Copywriter                  [ⓘ Assets] │  │
│                   │  │  │  Senior B2B Copywriter                     │  │
│                   │  │  └──────────────────────────────────────────┘  │
│                   │  │                                                  │
│                   │  │  ┌─ MessageList (scrollable, fills space) ────┐  │
│                   │  │  │                                             │  │
│                   │  │  │  ── empty state (first conversation) ──    │  │
│                   │  │  │                                             │  │
│                   │  │  │         ✍️ (large avatar)                   │  │
│                   │  │  │                                             │  │
│                   │  │  │    Ciao! Sono il tuo Copywriter.            │  │
│                   │  │  │    Ho accesso a tutti gli asset del         │  │
│                   │  │  │    workspace Q3 Campaign.                   │  │
│                   │  │  │    Come posso aiutarti oggi?                │  │
│                   │  │  │                                             │  │
│                   │  │  │  ┌─ Domande suggerite ──────────────────┐  │  │
│                   │  │  │  │ [Scrivi 3 headline per la landing]    │  │  │
│                   │  │  │  │ [Riscrivi questo copy in tono…]       │  │  │
│                   │  │  │  │ [Suggerisci A/B test per CTA]         │  │  │
│                   │  │  │  └──────────────────────────────────────┘  │  │
│                   │  │  │                                             │  │
│                   │  │  └─────────────────────────────────────────────│  │
│                   │  │                                                  │
│                   │  │  ┌─ ChatInput (sticky bottom) ───────────────┐  │
│                   │  │  │  ┌────────────────────────────────────┐    │  │
│                   │  │  │  │ Scrivi un messaggio…               │    │  │
│                   │  │  │  │                                    │    │  │
│                   │  │  │  └────────────────────────────────────┘    │  │
│                   │  │  │  [Shift+Enter = a capo]        [→ Invia]   │  │
│                   │  │  └──────────────────────────────────────────┘  │
└───────────────────┘  └──────────────────────────────────────────────────┘


CONVERSATION IN CORSO ────────────────────────────────────────────────────

┌─ MessageList ─────────────────────────────────────────────────────────┐
│                                                                         │
│  ─── Oggi, 12:28 ────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─ User bubble (right-aligned) ──────────────────────────────────┐   │
│  │                   Scrivi 3 headline per la landing page        │   │
│  │                   del prodotto X, target CMO di PMI B2B        │   │
│  │                                               12:28 ●          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Agent bubble (left-aligned) ──────────────────────────────────┐   │
│  │  ✍️                                                              │   │
│  │  Ecco 3 opzioni di headline:                                    │   │
│  │                                                                  │   │
│  │  **1. Beneficio diretto**                                        │   │
│  │  "Trasforma il tuo marketing B2B: +40% di lead qualificati      │   │
│  │  in 90 giorni"                                                   │   │
│  │                                                                  │   │
│  │  **2. Data-driven**                                              │   │
│  │  "Il 78% dei CMO B2B ottiene ROI positivo nel primo trimestre   │   │
│  │  — scopri come"                                                  │   │
│  │                                                                  │   │
│  │  **3. Pattern interrupt**                                        │   │
│  │  "Smetti di inseguire lead. Inizia ad attirarli."               │   │
│  │                                                                  │   │
│  │  Quale direzione ti sembra più in linea con il brand voice?     │   │
│  │                                   Claude Sonnet 4 · 247 tok     │   │
│  └──────────────────────────────────────────────────────────────── 12:28│
│                                                                         │
│  ┌─ User bubble ──────────────────────────────────────────────────┐   │
│  │                         La prima. Espandila in 3 varianti       │   │
│  │                                               12:30 ●          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─ Agent bubble (streaming) ─────────────────────────────────────┐   │
│  │  ✍️                                                              │   │
│  │  Perfetto, sviluppo 3 varianti del primo headline:              │   │
│  │                                                                  │   │
│  │  **Variante A — Timeframe esplicito:**                          │   │
│  │  "Trasforma il tuo marketing B2B: +40% di lead qualificati     │   │
│  │  entro il prossimo trimestre" ▌                 ← streaming     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘


MOBILE ──────────────────────────────────────────────────────────────────

┌─────────────────────────────┐
│ ← Team  ✍️ Copywriter  [ⓘ] │  ← compact header
├─────────────────────────────┤
│                             │
│ [User] Scrivi 3 headline    │
│ per la landing page…  12:28 │
│                             │
│ ✍️ Ecco 3 opzioni:          │
│                             │
│ 1. "Trasforma il tuo        │
│ marketing B2B…"             │
│                             │
│ 2. "Il 78% dei CMO…"       │
│                             │
│ 3. "Smetti di inseguire…"  │
│          247 tok · 12:28    │
│                             │
├─────────────────────────────┤
│ [Scrivi…]            [→]    │  ← sticky input
└─────────────────────────────┘
```

**Conversation rules:**
- User bubbles: right-aligned, `background: var(--workspace-accent-light)`, `border-radius: 16px 16px 4px 16px`
- Agent bubbles: left-aligned, `background: theme.palette.background.paper`, `border: 1px solid theme.palette.divider`, `border-radius: 16px 16px 16px 4px`, agent emoji top-left
- Markdown rendered in agent bubbles (using `react-markdown` + `remark-gfm`)
- Streaming cursor: blinking `▌` character appended to in-progress agent message
- Timestamp shown below each bubble (relative: "12:28")
- Token count shown in agent bubble footer only (not user)
- Date separator shown when conversation spans multiple days
- Empty state: large agent avatar + greeting message + suggested questions chips
- Scroll-to-bottom auto on new message (if already at bottom); show "↓ Nuovo messaggio" badge if user has scrolled up

---

## Template 10b — Agent Context Drawer

Slide-in panel (right side on desktop, bottom sheet on mobile) accessible via `[ⓘ Assets]` button in ConvHeader. Shows which workspace assets the agent can see.

```
DESKTOP (right drawer, 320px) ───────────────────────────────────────────

┌─ AgentContextDrawer ──────────────────────────────────────────────────┐
│                                                          [✕ Chiudi]    │
│  📖  Contesto del workspace                                             │
│  Asset disponibili per questo agente                                    │
│  ─────────────────────────────────────────────────────────────────    │
│                                                                         │
│  ✅  Brand Voice                                                         │
│      "Tono professionale e diretto. Usare il Lei nei                    │
│       contesti formali. Evitare il gergo…"             [Vedi →]        │
│                                                                         │
│  ✅  Brief                                                               │
│      "Campagna Q3 — obiettivo: aumentare lead             [Vedi →]     │
│       qualificati del 40% entro settembre…"                             │
│                                                                         │
│  ✅  Buyer Persona                                                       │
│      "Marco, 42 anni, CMO di PMI B2B nel settore         [Vedi →]      │
│       tech, 50-200 dipendenti…"                                         │
│                                                                         │
│  ✗   Angle                                                               │
│      Nessun asset presente                               [Genera →]    │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────    │
│  📋  Sessioni recenti nel workspace                                      │
│      Blog Post · Completato ieri · "AI nel marketing…"                  │
│      Landing Funnel · Completato 2gg fa                                 │
└───────────────────────────────────────────────────────────────────────┘
```

**Drawer rules:**
- `[ⓘ Assets]` button in ConvHeader shows a badge with the count of available assets
- Present assets show first 100 chars of content + "Vedi →" deeplink to asset page
- Missing assets show "Genera →" deeplink to the corresponding tool
- Recent sessions show last 3 sessions in the workspace (all agents share this context)
- Drawer opens without pushing content (overlay mode)

---

## New Components (23 → 29)

### `AgentCard.tsx`

```typescript
interface AgentCardProps {
  agent: AgentDefinition;
  workspaceId: string;
  lastConversation?: ConversationListItemDTO;   // null = no prior conversation
  onStartChat: (agentKey: string) => void;
}
```

```tsx
function AgentCard({ agent, lastConversation, onStartChat }: AgentCardProps) {
  return (
    <Card
      sx={{
        p: 3, height: '100%', display: 'flex', flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: 'var(--shadow-accent)',
          borderColor: 'var(--workspace-accent)',
        },
      }}
      onClick={() => onStartChat(agent.agentKey)}
    >
      {/* Avatar */}
      <Typography variant="h3" component="span" sx={{ mb: 1 }} aria-hidden>
        {agent.avatar}
      </Typography>

      {/* Name + Role */}
      <Typography variant="h6" fontWeight={700}>{agent.name}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5 }}>
        {agent.role}
      </Typography>

      {/* Short description */}
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {agent.shortDescription}
      </Typography>

      {/* CTA */}
      <Button
        variant="outlined"
        size="small"
        sx={{
          mt: 2,
          alignSelf: 'flex-start',
          borderColor: 'var(--workspace-accent)',
          color: 'var(--workspace-accent)',
        }}
        endIcon={<ArrowForwardIcon />}
      >
        Inizia chat
      </Button>

      {/* Last conversation hint */}
      {lastConversation && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Ultima chat: {formatRelativeTime(lastConversation.updatedAt)}
        </Typography>
      )}
    </Card>
  );
}
```

| MUI | Usage |
|-----|-------|
| `Card` | Container with hover lift |
| `Typography` | Avatar (h3), name (h6), role (caption), description (body2) |
| `Button` outlined | "Inizia chat" CTA |

---

### `TeamHub.tsx`

```typescript
interface TeamHubProps {
  workspaceId: string;
}
```

Renders: agents grid + recent conversations section. Uses `useAgents()` (static data) + `useConversations(workspaceId)` (API — user-scoped, returns only current user's conversations).

```tsx
function TeamHub({ workspaceId }: TeamHubProps) {
  const agents = listAgents();
  const { conversations, loading, error } = useConversations(workspaceId, { limit: 5 });
  const navigate = useNavigate();

  const handleStartChat = (agentKey: string) => {
    // POST /api/workspaces/:id/conversations → navigate to new conversation
    api.startConversation(workspaceId, agentKey)
       .then(conv => navigate(`/workspaces/${workspaceId}/conversations/${conv.id}`));
  };

  return (
    <Box>
      {/* Hero */}
      <ConvHeroBanner />

      {/* Agent Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2, my: 3 }}>
        {agents.map(agent => (
          <AgentCard
            key={agent.agentKey}
            agent={agent}
            workspaceId={workspaceId}
            lastConversation={conversations?.find(c => c.agentKey === agent.agentKey)}
            onStartChat={handleStartChat}
          />
        ))}
      </Box>

      {/* Recent Conversations */}
      {conversations && conversations.length > 0 && (
        <ConversationListSection conversations={conversations} workspaceId={workspaceId} />
      )}
    </Box>
  );
}
```

---

### `ConversationPage.tsx`

```typescript
interface ConversationPageProps {
  conversationId: string;
  workspaceId: string;
}
```

Layout wrapper: sticky header + scrollable message list + sticky input. Manages the chat XState machine.

```typescript
// Chat machine states
type ChatState =
  | 'idle'        // no active request
  | 'sending'     // waiting for first token
  | 'streaming'   // tokens arriving via SSE
  | 'error';      // error occurred

// Context
type ChatContext = {
  messages: Message[];
  currentInput: string;
  streamingContent: string;   // accumulates tokens
  error: string | null;
};
```

**Scroll management:**
```typescript
// Auto-scroll to bottom on new message, only if already at bottom
const isAtBottom = scrollEl.scrollHeight - scrollEl.scrollTop <= scrollEl.clientHeight + 80;
if (isAtBottom) scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
```

---

### `ChatMessageBubble.tsx`

```typescript
interface ChatMessageBubbleProps {
  message: MessageDTO;
  isStreaming?: boolean;     // true for the last agent message during SSE
}
```

```tsx
function ChatMessageBubble({ message, isStreaming }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      {/* Agent avatar — only for agent messages */}
      {!isUser && (
        <Typography variant="h5" sx={{ mr: 1, alignSelf: 'flex-start' }} aria-hidden>
          {message.agentAvatar}
        </Typography>
      )}

      <Box
        sx={{
          maxWidth: '72%',
          px: 2, py: 1.5,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser
            ? 'var(--workspace-accent-light)'
            : 'background.paper',
          border: isUser ? 'none' : '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Content — Markdown for agent, plain for user */}
        {isUser
          ? <Typography variant="body1">{message.content}</Typography>
          : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        }

        {/* Streaming cursor */}
        {isStreaming && (
          <Box component="span" sx={{ animation: 'cursorBlink 1s infinite' }}>▌</Box>
        )}

        {/* Footer — timestamp + tokens for agent */}
        <Stack direction="row" justifyContent="flex-end" spacing={1} mt={0.5}>
          {!isUser && message.tokensUsed && (
            <Typography variant="caption" color="text.disabled">
              {message.modelShortName} · {message.tokensUsed} tok
            </Typography>
          )}
          <Typography variant="caption" color="text.disabled">
            {formatTime(message.createdAt)}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
```

**CSS for streaming cursor:**
```css
@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

---

### `ChatInput.tsx`

```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;       // true while streaming
  placeholder?: string;
}
```

```tsx
function ChatInput({ onSend, disabled, placeholder = 'Scrivi un messaggio…' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const maxLength = 4000;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled && value.trim()) {
      e.preventDefault();
      onSend(value.trim());
      setValue('');
    }
  };

  return (
    <Box
      sx={{
        p: 2, borderTop: '1px solid', borderColor: 'divider',
        background: 'background.paper',
      }}
    >
      <TextField
        multiline
        maxRows={6}
        fullWidth
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        inputProps={{ maxLength, 'aria-label': 'Messaggio per l\'agente' }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => { onSend(value.trim()); setValue(''); }}
                disabled={disabled || !value.trim()}
                aria-label="Invia messaggio"
                sx={{
                  color: value.trim() && !disabled
                    ? 'var(--workspace-accent)'
                    : 'text.disabled',
                }}
              >
                <SendIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Stack direction="row" justifyContent="space-between" mt={0.5}>
        <Typography variant="caption" color="text.disabled">
          Shift+Enter per andare a capo
        </Typography>
        <Typography variant="caption" color={value.length > maxLength * 0.9 ? 'warning.main' : 'text.disabled'}>
          {value.length}/{maxLength}
        </Typography>
      </Stack>
    </Box>
  );
}
```

| State | Visual |
|-------|--------|
| Default | Send button disabled + grey |
| Has text | Send button accent-colored + enabled |
| Streaming | Input + button disabled, placeholder "Risposta in arrivo…" |
| Error | Input enabled + error toast |

---

### `AgentContextDrawer.tsx`

```typescript
interface AgentContextDrawerProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  agent: AgentDefinition;
}
```

```tsx
function AgentContextDrawer({ open, onClose, workspaceId, agent }: AgentContextDrawerProps) {
  const { assets, recentSessions, loading } = useAgentContext(workspaceId);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 320, p: 3 } }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Contesto workspace</Typography>
        <IconButton onClick={onClose} aria-label="Chiudi"><CloseIcon /></IconButton>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Asset disponibili per {agent.name}
      </Typography>

      {/* Asset list */}
      {ASSET_TYPES.map(type => {
        const asset = assets?.find(a => a.assetType === type);
        return (
          <Box key={type} sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {asset
                ? <CheckCircleIcon color="success" fontSize="small" />
                : <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
              }
              <Typography variant="body2" fontWeight={500}>
                {assetTypeLabel(type)}
              </Typography>
            </Stack>
            {asset ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 3 }}>
                "{asset.content.slice(0, 100)}…"
              </Typography>
            ) : (
              <Button size="small" sx={{ ml: 3, mt: 0.5 }} onClick={() => navigate(`/workspaces/${workspaceId}/tools/${assetTool(type)}`)}>
                Genera →
              </Button>
            )}
          </Box>
        );
      })}

      <Divider sx={{ my: 2 }} />

      {/* Recent sessions */}
      <Typography variant="body2" fontWeight={500} mb={1}>Sessioni recenti</Typography>
      {recentSessions?.slice(0, 3).map(s => (
        <Box key={s.id} sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {toolLabel(s.toolKey)} · {formatRelativeTime(s.completedAt)}
          </Typography>
        </Box>
      ))}
    </Drawer>
  );
}
```

---

## Interaction Patterns (Chat-specific)

| Pattern | Behaviour |
|---------|-----------|
| **Send message** | `Enter` sends, `Shift+Enter` adds newline. Input clears after send. |
| **Streaming response** | Blinking `▌` cursor appended to agent bubble. Input disabled. Token counter updates in real time (every 5 tokens). |
| **Scroll lock** | Auto-scroll disabled while user scrolls up. "↓ 1 nuovo messaggio" badge appears. Click → scroll to bottom. |
| **Agent typing** | While `sending` (waiting for first token), show pulsing agent bubble `◐◐◐` (3 animated dots). |
| **Markdown render** | Agent messages rendered via `ReactMarkdown`. Code blocks use `fontFamilyMono`, bold/italic preserved. |
| **Suggested questions** | Empty state only. Click chip → fills input + auto-sends. |
| **New chat from agent card** | API call to create conversation → navigate to `/conversations/:id`. No intermediate step. |
| **Resume conversation** | Click "Riprendi" in Team Hub → navigate to existing `conversationId`. |
| **Archive** | `[···]` menu in ConvHeader → "Archivia conversazione" → `ConfirmDialog` → archive + redirect to Team Hub. |
| **Error recovery** | If stream fails → error toast `variant="error"` + "Riprova" button re-sends the last user message. |

---

## State Bindings

| Component | State source | Data |
|-----------|-------------|------|
| `TeamHub` | `useConversations()` + `listAgents()` | Recent conversations + static agent list |
| `ConversationPage` | Chat machine (XState) | Messages, streaming state |
| `ChatMessageBubble` | Props from machine context | message, isStreaming |
| `ChatInput` | Machine state `disabled` when streaming | Disabled + placeholder |
| `AgentContextDrawer` | `useAgentContext()` | Workspace assets + recent sessions |

---

## Skeleton Variants (extended)

Two new variants added to `LoadingSkeleton`:

```typescript
type SkeletonVariant =
  | 'dashboard' | 'card-grid' | 'list' | 'tool-page' | 'session-detail'
  // NEW:
  | 'team-hub'        // agent grid (7 cards) + recent conversations
  | 'conversation';   // 3 message bubbles (alternating user/agent)
```

---

## Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Message list | `role="log" aria-live="polite" aria-label="Conversazione con {agent.name}"` |
| Streaming | `aria-live="polite"` on agent bubble during stream |
| Send button | `aria-label="Invia messaggio"` |
| Agent avatar emoji | `aria-hidden="true"` on all decorative emoji |
| Agent cards | `aria-label="{agent.name}, {agent.role}. {agent.shortDescription}"` on card |
| Drawer | `aria-labelledby` pointing to drawer title |
| Keyboard | `Tab` between suggested question chips; `Enter` to select |
| Suggested questions | `role="list"` on chips container, `role="listitem"` on each chip |

---

## Sources

- [[Agent Chat]] — Domain model and bounded context
- [[Agent Personas]] — Agent definitions (avatar, name, role, suggestedQuestions)
- [[Conversation]] — Aggregate root for conversation data
- [[Message]] — Entity providing message shape for `ChatMessageBubble`
- [[Frontend Architecture]] — Routing, MUI v6, 4-state pattern
- [[UI Component Map]] — Existing 23 components extended to 29
- [[UX Wireframes]] — Existing 8 templates extended to 10
- [[Design Tokens]] — `--workspace-accent`, typography, shadows used in new components