Extract the 5 core data points from the brand context provided below.

## Context Structure
The context is organized in labeled sections injected by the system:

- **[Asset - brief]**: The workspace brief asset. This is your PRIMARY data source. Contains structured brand context: company, product/service, target market, campaign objectives, offer details, and tone. The brief provides the foundational brand identity data.
- **[File - material]**: Optional supplemental brand document(s) (.txt/.md/.docx). May contain additional brand guidelines, existing communication examples, or tone specifications. This ENRICHES the brief data — it does not replace it.

## Extraction Priority
1. Extract `brand_or_company` from the brief's company name or any brand name in the file
2. Extract `target_audience` from the brief's target audience section
3. Extract `tone` ONLY from explicit tone descriptors in the brief or file — never infer. Use "non disponibile" if no explicit mention
4. Extract `product_or_service` from the brief's product/service description
5. Extract `market` from the brief's market positioning and competitive context section
6. Use the optional `[File - material]` to enrich any field where the brief is sparse — but never fabricate
7. If the brief and the supplemental file conflict, the brief takes priority
8. Every field that cannot be found in any source gets "non disponibile"

## Fields to Extract
`brand_or_company`, `target_audience`, `tone`, `product_or_service`, `market`

Output ONLY the JSON object with all 5 fields. No preamble, no explanation, no code fences.