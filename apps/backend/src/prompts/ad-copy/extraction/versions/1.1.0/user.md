EXTRACT — do NOT generate ads. Output ONLY JSON. No markdown, no Italian, no prose.

## Context Structure
The context is organized in labeled sections injected by the system:

- **[Asset - brief]**: The workspace brief asset. Primary source for product/service, primary offer, proof points, campaign context.
- **[Asset - persona]**: Workspace persona assets (1+, required). Primary source for target audience, pain points, objections. May include multiple persona entries.
- **[Asset - angle]** (optional): Marketing angle assets. Creative direction — angle names, awareness level assignments, core narratives.
- **[Input - goal]**: Campaign objective selected by the user (Awareness, Traffic, Engagement, Leads, Sales).
- **[Input - tone]**: Tone preference selected by the user (Professional, Casual, Urgente, Empatico, Autorevole).
- **[Input - copyLength]**: Copy length format selected by the user (short, medium, long).

## Extraction Priority
1. Brief → product, offer, proof points, campaign context
2. Personas → audience, pain points, objections, cluster opportunities
3. Angles → creative direction, angle candidates (if available)
4. Inputs → goal (direct pass-through), tone (direct pass-through), copyLength (direct pass-through)

Extract all 11 fields. Use "non disponibile" for missing data. Output pure JSON.