Extract the 5 core persona data points from the context provided below.

## Context Structure
The context is organized in labeled sections injected by the system:

- **[Asset - brief]**: The workspace brief asset content. This is your PRIMARY data source. It provides structured context: company, product/service, target audience description, campaign objectives, offer details, and tone. The target audience section of the brief is the single most important source for persona extraction.
- **[File - instructions]**: Optional supplemental file (.txt/.md/.docx). May contain survey results, competitor analysis, interview transcripts, or raw market data. This ENRICHES the brief data — it does not replace it.

## Extraction Priority
1. Extract `goals`, `pain_point`, and `objections` primarily from the brief's target audience section
2. Extract `demographics` from any explicit mentions in the brief or supplemental file
3. Extract `behaviors` from channel/platform mentions and decision patterns in the source
4. If the brief and the supplemental file conflict on a data point, the brief takes priority
5. Every field that cannot be found in any source gets "non disponibile"

## Fields to Extract
`demographics`, `goals`, `pain_point`, `behaviors`, `objections`

Output ONLY the JSON object with all 5 fields. No preamble, no explanation, no code fences.