Extract the 8 core data points from the briefing information in the context below.

## Context Structure
The context is organized in labeled sections injected by the system:

- **[File - briefing]**: The uploaded briefing document (.txt/.md/.docx). This is your PRIMARY data source. All company, product, audience, offer, tone, competitor, and proof data comes from here.
- **[Input - objective]**: The user's stated campaign objective/goal. This SUPPLEMENTS the file data. If the file and the user input conflict on campaign objective, use the file's data as the primary source and note the user's input as supplementary context.

## Extraction Priority
1. Extract the 6 mandatory fields from the file content first
2. If `campaign_objective` is unclear in the file, use the user's `objective` input to resolve it
3. Extract opportunistic fields ONLY if the file explicitly contains competitor names or proof elements
4. Every field that cannot be found in any source gets "non disponibile"

## Fields to Extract
`company`, `product_or_service`, `target_audience`, `campaign_objective`, `primary_offer`, `tone`, `extracted_competitors`, `extracted_proof_elements`

Output ONLY the JSON object with all 8 fields. No preamble, no explanation, no code fences.