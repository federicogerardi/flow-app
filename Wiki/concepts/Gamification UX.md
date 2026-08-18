---
type: concept
tags:
  - wiki/concept
  - wiki/gamification
  - wiki/ux
  - wiki/frontend
date_updated: 2026-08-07
source_count: 6
confidence: high
---

# Gamification UX

> Psychological triggers, sidebar integration, notification cadence, and anti-patterns for the Gamification overlay. Extends [[UX Wireframes]] and [[Design Tokens]].

## Psychological Triggers — Priority Order

### 1. Goal Gradient — "So Close" Amplification (80%+)

When `levelProgress ≥ 80%`, the sidebar XP bar intensifies visually:

```
Before 80%:    L4 Specialist  ████████░░░░  72%
At 80%+:       L4 Specialist  ██████████░░  Only 50 XP to Specialist ⚡
```

- Bar color shifts from accent to brighter accent with subtle glow (`box-shadow: 0 0 8px var(--workspace-accent-light)`)
- Micro-label appears: *"Only {remaining} XP to {nextLevel}"*
- Same treatment applies to challenge progress bars at 80%+
- **No backend changes** — purely CSS conditional on `levelProgress` prop

### 2. Variable Rewards — Surprise XP Multiplier

On any XP-earning event, 10% probability of a "critical hit":

| Event | Normal | Lucky (10%) |
|-------|--------|-------------|
| Session completed | +50 XP | +100 XP |
| Artifact promoted | +100 XP | +200 XP |
| Agent message | +10 XP | +20 XP |

**Toast treatment:**
```
✨ Lucky Bonus! +100 XP
Exceptional output detected — double reward
```

- Sparkle/glow animation on toast (`@keyframes sparkle 600ms`)
- `xp_transactions.source = 'lucky_bonus'` for tracking
- Do NOT announce this as a feature — must feel like genuine surprise
- **Backend**: `XPCalculator` adds 10% random check, emits `source` field on `XPEarned`

### 3. Social Proof — Activity Pulse

Ambient "live activity" indicator in workspace header:

```
Normal:     Q3 Campaign > Team                                          ⓘ
Active:     Q3 Campaign > Team                    ⚡ Marco is generating
Multi:      Q3 Campaign > Team               ⚡ Anna and Marco are working
```

- Uses `--workspace-accent` at 50% opacity — ambient, not interruptive
- Fetched via `GET /api/workspaces/:id/activity` (poll every 60s or SSE)
- Shows user names of members active in the last 15 minutes
- **Backend**: `GET /api/workspaces/:id/activity` endpoint: returns `{ activeUsers: [{ name, lastAction, actionType }] }`

### 4. Endowment Effect — Streak Shield

Sidebar streak hover reveals what's at stake:

```
Default:     🔥 12
Hover:       🔥 12-day streak
             Longest: 18 days
             Next: 30 days → 💎 Unstoppable (+100 crediti)
```

**End-of-day nudge** (only if no activity recorded and UTC time 22:00-23:59):

```
🔶 Keep your 12-day streak alive
Generate anything before midnight
[Dismiss]
```

- Amber toast, dismissible. NOT red (not alarmist)
- Appears max once per day
- Does NOT appear if user is on vacation/away mode
- **No backend changes** — client-side date check + streak data from `GET /api/me/profile`

### 5. Zeigarnik Effect — Badge Progress Rings

Greyed-out badges with progress rings for the 1-2 badges closest to completion:

```
Profile page — "In Progress" section:

⬤ 8/11 tools   →   Tool Master (+50 crediti)
⬤ 82/100 sessions → Power User (+100 crediti)
```

- Greyed-out badge icon with circular progress ring (SVG `stroke-dashoffset`)
- Only shown on full profile page (`/profile`), not sidebar
- **Backend**: `GET /api/me/profile` includes `badgeProgress: [{ badgeKey, current, target }]`

### 6. Autonomy — Challenge Voting

Every Monday, members vote on the weekly challenge:

```
┌─ Scegli la sfida della settimana ──────────────────┐
│                                                       │
│  ○  Content Sprint — 5 sessioni (+200 XP)            │
│  ●  AI Dialogue — 20 messaggi agente (+200 XP)       │
│                                                       │
│  3 membri hanno votato · La tua scelta: AI Dialogue   │
│  [Conferma voto]                                      │
└───────────────────────────────────────────────────────┘
```

- Show 2-3 options. First vote wins (simple majority at any point).
- Tag on active challenge: *"Scelto dal team"*
- **Backend**: `POST /api/workspaces/:id/challenges/vote` with `{ challengeKey }`. Voting state in `workspace_challenges` or separate table.

### 7. Reciprocity — Gift Framing

Badge unlock toast uses "gift" language, not transactional:

```
❌ Achievement unlocked: First Light +10 crediti
✅ 🎁 First Light — 10 crediti extra per continuare a creare  [Start →]
```

- Toast duration: 5 seconds (badges are rarer than XP)
- Color by rarity: common = neutral, rare = blue, epic = purple, legendary = gold
- One-click CTA: *"[Start a new session →]"* capitalizes on peak motivation
- **No backend changes** — copy change in frontend only

### 8. Fresh Start Effect — Monday Reset

First session of each week shows a micro-moment:

```
Workspace header:  Nuova settimana, nuovi obiettivi — let's build
Sidebar streak:    🔥 0   Fresh streak — beat your 12-day record
```

- Appears once, on the first page load of the new week (Monday UTC)
- Dismissible, not sticky
- If streak was lost last week, shows encouragement: *"Fresh start"*
- **No backend changes** — client-side date check

### 9. Scarcity — Season Countdown

Final 7 days of the season show a countdown:

```
Workspace header:  ❄️ Winter Sprint ends in 5 days · 2 badges still unlockable
```

- Dismissible (user can hide it)
- Click → expands to show which seasonal badges are still unlockable with progress
- Disappears automatically when season ends
- **No backend changes** — computed from `SeasonId` + current date

---

## Notification Cadence

### XP Toast: Immediate, Never Stacked

| Trigger | Toast | Duration |
|---------|-------|----------|
| Session completed | *"+50 XP · Level 4 Expert"* | 3s |
| Artifact promoted | *"+100 XP · Promotion bonus!"* | 3s |
| Lucky bonus | *"✨ Lucky Bonus! +100 XP"* | 4s |
| Agent message | *No toast* (too frequent) | — |

**Critical rule**: if two XP events fire within 2 seconds, combine: *"+150 XP · Session + Promotion"*.

### Level-Up: Celebratory Banner

Level-ups are NOT toasts. Use a **non-blocking banner** at the top of the content area:

```
┌──────────────────────────────────────────────────────────┐
│  🎉 Level 5 — Expert!                                     │
│  ██████████████████████████████░░  2,500 / 5,000 XP      │
│                                              [Continue]    │
└──────────────────────────────────────────────────────────┘
```

- Auto-dismisses after 4 seconds or on click
- Plays once per level-up, never repeats
- Uses `gradients.brand` from [[Design Tokens]]

### Badge Unlock: Celebratory Toast + Action

```
🎁 Tool Master! (epic — purple border)
You've used all 11 tools — 50 crediti extra
[View badge]  [Start generating →]
```

- 5 second duration
- Rarity-based color treatment
- CTA capitalizes on peak motivation moment

### Streak Nudge: Gentle, Dismissible

- Appears ONLY at 22:00-23:59 UTC if no activity recorded
- Amber color (not red)
- Max once per day, always dismissible

### What NEVER Gets a Notification

- Streak broken (user discovers organically)
- Other users' achievements (no public broadcast)
- Challenge contribution (only final completion gets team toast)

---

## Sidebar Gamification Zone

Added below the credits bar, above the user menu. 48-56px height. Compact, iconic.

```
┌─────────────────────────────┐
│  ⚡ Nuova Generazione        │
└─────────────────────────────┘
  ─────────────────────────────
  Credits ████████░░  245/250
  Reset 01/08/2026
  ─────────────────────────────
┌─────────────────────────────┐  ← Gamification Zone
│  L4 Specialist  ████████░░  │     Level + progress bar
│  🔥 12  ·  🏅 6             │     Streak + badge count (icons only)
│  #3 weekly ████████░░░      │     Rank (only if active this week)
└─────────────────────────────┘
  ─────────────────────────────
  [AV]  Anna V.           ▼
```

| Element | Display | When hidden |
|---------|---------|-------------|
| Level + bar | `L4 Specialist ████████░░` | Never |
| Streak | `🔥 12` | If streak = 0 |
| Badge count | `🏅 6` | If badges = 0 |
| Weekly rank | `#3 weekly ████████░░░` | If 0 XP this week |

**Click target**: entire zone links to `/profile` (full PlayerProfile page).  
**Accessibility**: wrapper `<Box>` with `role="button"`, `tabIndex={0}`, `aria-label="View your profile: Level 4 Specialist, 12-day streak, 6 badges"`. Interactive elements use `onKeyDown` for Enter/Space.

**What does NOT go in the sidebar:**
- Individual badge icons (too noisy for 280px)
- XP number (private — bar is sufficient)
- Challenge status (lives in workspace dashboard)
- Season countdown (lives in workspace header)

**Responsive**: mobile (Template 1b) — moves into hamburger drawer, below credits, same compact treatment.

---

## Business-Day Streak Option

For B2B users who don't work weekends. Configurable per user:

```
Settings > Gamification:
  Streak mode:  ○ Daily (default)   ● Business days (Mon–Fri)
```

- **Daily**: streak counts every calendar day (UTC). Weekend counts.
- **Business days**: streak counts Mon–Fri. Sat–Sun are "free" — don't advance streak but don't break it.
- `player_profiles.streak_mode` VARCHAR(20) DEFAULT 'daily'
- `PlayerProfile.recordActivity()` checks mode before streak logic

This prevents the dark pattern of forcing weekend work to maintain a streak.

---

## Anti-Patterns — Explicitly Rejected

| ❌ Anti-Pattern | Why Rejected |
|----------------|-------------|
| Streak freeze (pay to preserve) | Monetizes motivation. Erodes trust. |
| Leaderboard with absolute XP | Toxic competition in B2B context |
| XP decay for inactivity | B2B has legitimate breaks (vacation, project cycles) |
| Public badge broadcast | Creates performative anxiety |
| Multi-channel notifications | Each extra channel reduces all channels' impact |
| Forced weekend engagement | Business-day streak option prevents this |

---

## Accessibility (WCAG 2.1 AA)

| Element | Requirement | Implementation |
|---------|-------------|---------------|
| Sidebar XP bar | `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` | MUI `LinearProgress` props |
| Sidebar streak | `aria-hidden="true"` on emoji + `aria-label="Streak: 12 giorni"` on wrapper | Inline `<Box aria-label>` |
| Sidebar badge count | `aria-hidden="true"` on emoji + `aria-label="6 badge sbloccati"` on wrapper | Inline `<Box aria-label>` |
| Level-up banner | `role="status"`, `aria-live="polite"` | Replicate `CompletionBanner` pattern |
| XP toast | `role="status"`, `aria-live="polite"` | MUI `Snackbar` default |
| Badge unlock toast | `role="status"`, `aria-live="polite"` | MUI `Snackbar` default |
| Rarity badge cards | Include text label: "Common", "Rare", "Epic", "Legendary" | Color is NOT the only indicator |
| Badge progress ring | `role="progressbar"`, `aria-valuenow={current}`, `aria-valuemax={target}` | MUI `CircularProgress` props |
| Sparkle animation | `prefers-reduced-motion: reduce` → `animation: none` | CSS media query |
| Sidebar zone (click) | Entire zone is clickable (280×56px) → exceeds 44×44px minimum | No `onClick` on child elements, only on wrapper |

## Toast Priority System

Prevents collision between system toasts and gamification toasts by using three `SnackbarProvider` instances with different anchor positions:

| Channel | Anchor | Max Visible | Examples |
|---------|--------|-------------|----------|
| **System** | `bottom-left` | 3 | Errors, save confirmations, delete confirmations |
| **Gamification** | `bottom-center` | 1 | XP earned, badge unlock, lucky bonus |
| **Ambient** | `top-right` | 1 | Streak nudge, activity pulse, challenge completed |

```typescript
// apps/frontend/src/providers/ToastProvider.tsx

<SnackbarProvider
  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
  maxSnack={3}
  dense
>
  <SnackbarProvider
    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    maxSnack={1}
  >
    <SnackbarProvider
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      maxSnack={1}
    >
      {children}
    </SnackbarProvider>
  </SnackbarProvider>
</SnackbarProvider>
```

## Rarity Visual Treatment

Badge cards use `rarity.*` design tokens from [[Design Tokens]]:

| Tier | Border | Background | Text | Badge Label |
|------|--------|------------|------|-------------|
| Common | `rarity.common.border` (#9CA3AF) | `rarity.common.bg` (#F3F4F6) | `rarity.common.text` (#374151) | "Common" |
| Rare | `rarity.rare.border` (#3B82F6) | `rarity.rare.bg` (#EFF6FF) | `rarity.rare.text` (#1E40AF) | "Rare" |
| Epic | `rarity.epic.border` (#7C3AED) | `rarity.epic.bg` (#F5F3FF) | `rarity.epic.text` (#5B21B6) | "Epic" |
| Legendary | `rarity.legendary.border` (#D97706) | `rarity.legendary.bg` (#FFFBEB) | `rarity.legendary.text` (#92400E) | "Legendary" |

Toast border color matches the rarity tier. Badge cards on the profile page show the text label below the badge name — never rely on color alone.

## Sources

- [[Gamification]] — Domain model and architecture
- [[PlayerProfile]] — Aggregate root providing XP, level, streak data
- [[Gamification#achievements-badges|Achievements & Badges]] — Badge catalog
- [[Gamification#Workspace Gamification]] — Challenges and leaderboard
- [[UX Wireframes]] — Sidebar layout and notification patterns
- [[Design Tokens]] — Accent colors, gradients, animation tokens