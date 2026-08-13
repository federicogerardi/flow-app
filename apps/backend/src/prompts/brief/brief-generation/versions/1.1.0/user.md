Generate the complete 11-section creative brief from the extraction data provided in the context.

## Extraction Data
The context contains a JSON extraction from Step 1 with these fields:

| Field | Maps to Brief Section |
|---|---|
| `company` | Panoramica > Azienda |
| `product_or_service` | Panoramica > Prodotto/Servizio + Categoria/Settore; Offerta e Meccanismo > Offerta Core |
| `target_audience` | Target Audience (all sub-fields) |
| `campaign_objective` | Obiettivo Campagna (all sub-fields); Contesto Funnel > Funnel Goal + Stadio |
| `primary_offer` | Offerta e Meccanismo (all sub-fields); Contesto Funnel > CTA Primaria |
| `tone` | Brand Voice e Tono (all sub-fields) |
| `extracted_competitors` | Mercato e Competizione > Competitor Principali (CONDITIONAL — use only if not "non disponibile") |
| `extracted_proof_elements` | Proof e Credibilità (CONDITIONAL — use only if not "non disponibile") |

## Section-Specific Instructions

### Sections built from mandatory extraction fields
Panoramica, Obiettivo Campagna, Target Audience, Offerta e Meccanismo, Brand Voice e Tono, Vincoli Creativi, Contesto Funnel: use the mapped extraction fields directly. Enrich with safe inferences (funnel stage from objective, CTA from offer type, tone register from market context).

### Conditional sections
Mercato e Competizione, Proof e Credibilità, Pilastri di Messaggio: check if the corresponding extraction field is "non disponibile" BEFORE writing. If data is missing, use the single-bullet placeholder format from the system prompt — do not fabricate content.

### Synthesis sections
Vincoli Creativi: derive from product type (e.g., SaaS → include CTA button, avoid unsubstantiated claims) and tone. If no specific constraints in the extraction, provide reasonable defaults based on the product category.

## Critical Rules
1. "Non specificato nel documento di input" is the ONLY phrase allowed for missing data — never "N/A", "TBD", or empty bullets
2. Never fabricate competitor names, testimonials, metrics, certifications, or case studies
3. Write entirely in Italian
4. Output raw markdown starting with `## Panoramica` — no preamble, no code fences