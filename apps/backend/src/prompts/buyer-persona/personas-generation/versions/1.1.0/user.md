Generate the complete 10-section buyer persona document from the extraction data provided in the context.

## Extraction Data
The context contains a JSON extraction from Step 1 with these fields:

| Field | Maps to Persona Section |
|---|---|
| `demographics` | Nome Persona, Dati Demografici |
| `goals` | Obiettivi e Motivazioni |
| `pain_point` | Pain Point e Frustrazioni, Trigger di Acquisto |
| `behaviors` | Comportamenti e Abitudini |
| `objections` | Obiezioni e Barriere |

## Section-Specific Instructions

### Sections built from extraction fields
Nome Persona, Dati Demografici, Obiettivi e Motivazioni, Pain Point e Frustrazioni, Comportamenti e Abitudini, Obiezioni e Barriere: use the mapped extraction fields directly. Enrich with safe inferences (education from role, channels from demographic profile, messaging triggers from pain point type).

### Synthesis sections
- **Messaggistica Efficace**: derive from pain points (what language addresses them), goals (what outcomes to emphasize), and objections (what proof to provide). Every messaging recommendation must trace back to extraction data.
- **Trigger di Acquisto**: derive from pain points (what problem creates urgency), goals (what milestone triggers action), and objections (what removes the barrier).
- **Provenienza Dati**: mechanical report ONLY. List which fields had data vs were "non disponibile." List safe inferences made. Do not evaluate quality — just report provenance.

### Conditional sub-fields
- **Cosa Deve Vedere per Convertire** (in Obiezioni e Barriere): if the extraction contains NO trust factors or stated conversion triggers, write "Non specificato nel documento di input."

## Critical Rules
1. "Non specificato nel documento di input" is the ONLY phrase allowed for missing data — never "N/A", "TBD", or empty bullets
2. NEVER fabricate specific numbers: no percentages, time durations, or price figures unless the extraction explicitly contains them
3. Specificity comes from elaborating on STATED data, not from inventing plausible-sounding details
4. Write entirely in Italian
5. Output raw markdown starting with `## Nome Persona` — no preamble, no code fences