Extract structured awareness evidence, pain points, objections, market signals, and angle candidates from the context provided below.

## Context Structure
The context is organized in labeled sections injected by the system:

- **[Asset - brief]**: The workspace brief asset. Business context: company, product/service, target market, campaign objectives, offer details, and tone. Always present (required).
- **[Asset - persona]**, **[Asset - persona #2]**, etc.: One or more workspace persona assets. Audience profiles: demographics, goals, pain points, behaviors, objections. Required — at least one persona must be present.

## Extraction Priority
1. Extract `personaClusters` by grouping similar persona profiles — use demographics, goals, pain points, and behaviors from the persona assets
2. Classify each cluster's dominant awareness level using the 5 canonical levels and boundary rules. Base classification on the CONCRETE evidence in the persona profiles, not on assumptions
3. Extract `desireMatrix` from the goals and pain points across all personas
4. Extract `painPoints` and `objections` directly from persona assets and brief
5. Extract `marketSignals` from any explicit mentions in the brief (market positioning, competitive context) and personas (channel preferences, search behavior)
6. Generate `angleCandidates` by cross-referencing pain points with awareness levels — each angle targets a specific persona cluster at a specific awareness level
7. Every field that cannot be found in any source gets "non disponibile"

## Critical Rules
- NEVER classify a profile as Product Aware just because they name a solution category — see boundary rules
- NEVER invent competitor names, market data, or search volumes
- Awareness labels in English only
- No persona names in output

## Fields to Extract
`personaClusters`, `desireMatrix`, `awarenessDistribution`, `painPoints`, `objections`, `marketSignals`, `angleCandidates`

Output ONLY the JSON object with all 7 fields. No preamble, no explanation, no code fences.