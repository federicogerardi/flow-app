Build the full context map and angle matrix from the extraction data provided in the context.

## Extraction Data
The context contains a JSON extraction from Step 1:

| Extraction Field | Maps to Matrix Output |
|---|---|
| `personaClusters` | Context Map > Persona Clusters; Angle Matrix > Persona Focus (per angle) |
| `desireMatrix` | Context Map > Core Desires; Angle Matrix > Desire Focus (per angle) |
| `awarenessDistribution` | Context Map > Awareness Distribution; Awareness Coverage Check |
| `painPoints` | Context Map > Priority Objections; Angle Matrix > Trigger Problem |
| `objections` | Context Map > Priority Objections; Angle Matrix > Proof Requirement |
| `marketSignals` | Angle Matrix > Strategic Rationale (evidence source) |
| `angleCandidates` | Angle Matrix — expand each candidate into a full angle profile |

## Ranking Instructions
1. Score each angle on the 4 dimensions ANCHORED TO EXTRACTION DATA — never from external assumptions:
   - **Strategic Fit**: does it address a documented objective/pain point from the brief/personas?
   - **Audience Resonance**: does it speak to specific persona cluster needs documented in the extraction?
   - **Communication Clarity**: how instantly graspable is the core idea?
   - **Evidence Anchoring**: how well supported is it by extraction data (pain points, objections, market signals)?
2. Rank top 3 using the deterministic tie-break
3. Include awareness coverage check — flag if fewer than 3 levels are represented
4. If extraction data is sparse for any dimension, score conservatively (2-3) and note the gap in Risk Notes

## Critical Rules
- Scores are strategic estimates, not quantitative predictions
- Never fabricate market data, competitor names, or proof claims to justify scores
- Awareness labels in English only
- No persona names in output
- Write in Italian

Output ONLY the artifact. No preamble, no explanation.