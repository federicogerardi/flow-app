Build the Meta Ads strategy canvas from the extraction data provided in the context.

## Context Structure
The context is organized in labeled sections injected by the system:

- **[Previous Step 1]**: JSON extraction with 11 fields: product/service, target audience, campaign objective, primary offer, proof points, pain points, objections, angles, cluster opportunities, angle candidates, and tone preference.

## Field → Canvas Mapping

| Extraction Field | Maps to Canvas Section |
|---|---|
| `productOrService` + `primaryOffer` | Strategic Snapshot, Offer Positioning |
| `targetAudience` + `clusterOpportunities` | Target Clusters (characteristics, pain points, desired outcomes) |
| `tone` | Tone in Strategic Snapshot; calibrates Messaging Tone for every cluster |
| `campaignObjective` | Strategic Snapshot |
| `dominantPainPoints` + `angleCandidates` | Target Clusters → Angle core narratives |
| `angles` | Target Clusters → Angle integration (or synthesize from pain points if unavailable) |
| `proofPoints` | Brand Facts Bank (credibility, social proof, authority, trust) |
| `objections` | Objection Handling Matrix (counter-message + required proof) |

## Tone Calibration Rule
If `tone` is provided in the extraction, it is authoritative. Apply it consistently to every cluster's "Messaging Tone" field. Use the tone calibration guidelines from the system prompt. If tone is "non disponibile", use cluster characteristics to determine the messaging tone (default behavior).

Produce the full strategy canvas: 3+ audience clusters with tone-calibrated messaging, 2 angles per cluster with awareness fit, brand facts bank, objection handling matrix, and offer positioning. Every angle must be grounded in the extraction data.

Write in Italian. Awareness level labels in English.

Output ONLY the strategy canvas. No preamble, no explanation.