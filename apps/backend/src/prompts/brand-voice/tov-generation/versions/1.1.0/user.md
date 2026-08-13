Synthesize a complete Brand Tone of Voice document from the extraction payload provided in the context.

## Extraction Data
The context contains a JSON extraction from Step 1 with these fields:

| Field | Maps to TOV Section |
|---|---|
| `brand_or_company` | Identità del Brand > Nome + Settore/Categoria; Valori e Posizionamento |
| `target_audience` | Voce e Tono > Registro Linguistico; Linguaggio > Struttura Frasi |
| `tone` | Voce e Tono (primary source; if "non disponibile", build from market + audience context) |
| `product_or_service` | Identità del Brand > Personalità; Valori e Posizionamento > Promessa |
| `market` | Valori e Posizionamento > Posizionamento; Adattamento per Canale |

## Section-Specific Instructions

### Sections built from extraction fields
Identità del Brand, Valori e Posizionamento, Voce e Tono: use the mapped extraction fields directly. If tone is "non disponibile", infer from market segment and audience profile — but mark the entire TOV as synthetic (see system prompt Guardrail #6).

### Synthesis sections
- **Linguaggio**: derive from tone (words that embody it, words that violate it), audience (sentence complexity), and market context (specialist vs general language)
- **Adattamento per Canale**: derive from audience demographics (where they consume content) and market positioning (B2B → LinkedIn focus, D2C → Instagram/TikTok focus)
- **Esempi**: create a correct example that demonstrates the TOV's key principles, and a wrong example that violates them in a recognizable way
- **Adattamento per Awareness Level**: group the 5 awareness levels into 3 TOV categories as shown in the output structure

### Synthetic TOV
If the extraction's `tone` field is "non disponibile", the TOV is entirely synthetic — built from inference. Add the synthetic warning per Guardrail #6 at the top of the document. This is critical: a synthetic TOV used without validation will produce inconsistent brand voice downstream.

## Critical Rules
1. "Non specificato nel documento di input" is the ONLY phrase allowed for missing data
2. Mark all inferences with "(inferito dal contesto)"
3. Never fabricate brand values, mission statements, or personality traits
4. Write entirely in Italian
5. Output raw markdown starting with the synthetic warning (if applicable) then `## Identità del Brand` — no preamble, no code fences