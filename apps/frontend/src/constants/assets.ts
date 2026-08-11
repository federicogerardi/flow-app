export const ASSET_TYPE_LABELS: Record<string, string> = {
  'brief': 'Brief',
  'brand-voice': 'Brand Voice',
  'persona': 'Buyer Persona',
  'angle': 'Marketing Angle',
  'ad-copy': 'Ad Copy',
};

/** Map asset types to their corresponding tool keys */
export const ASSET_TOOL_MAP: Record<string, string> = {
  'brief': 'brief',
  'brand-voice': 'brand-voice',
  'persona': 'buyer-persona',
  'angle': 'marketing-angle',
  'ad-copy': 'ad-copy',
};

/** Inverse of ASSET_TOOL_MAP — toolKey → assetType (produces) for promotable tools */
export const TOOL_PRODUCES_MAP: Record<string, string> = {
  'brief': 'brief',
  'brand-voice': 'brand-voice',
  'buyer-persona': 'persona',
  'marketing-angle': 'angle',
  'ad-copy': 'ad-copy',
};
export const ASSET_NAME_PLACEHOLDERS: Record<string, string> = {
  'brief': 'Campagna Estate 2026',
  'brand-voice': 'Voce brand principale',
  'persona': 'Decision Maker B2B',
  'angle': 'Pain point principale',
  'ad-copy': 'Headline promozione Q3',
};