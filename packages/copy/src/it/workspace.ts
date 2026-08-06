export const workspace = {
  list: {
    title:       'I tuoi workspace',
    empty:       'Nessun workspace. Creane uno per iniziare.',
    createCta:   'Nuovo workspace',
    createLabel: 'Nome workspace',
  },
  detail: {
    members:      '{count} members',
    deleteTitle:  'Delete workspace',
    assets:       'Asset',
    recentSessions: 'Sessioni recenti',
    noSessions:   'Nessuna sessione. Avvia un tool per iniziare.',
    noAssets:     'Nessun asset. Genera un brief o una brand voice.',
  },
  nav: {
    home:            'Home',
    tools:           'Tools',
    sessions:        'Sessioni',
    assets:          'Asset',
    team:            'Team',
    templates:       'Templates',
    audit:           'Audit Log',
    newGeneration:   'Nuova Generazione',
    backToWorkspace: 'Torna al workspace',
  },
  switcher: {
    selectWorkspace: 'Seleziona un workspace',
    noWorkspaces: 'Nessun workspace',
  },
  assets: {
    renameTitle: 'Rinomina asset',
    renameLabel: 'Nome',
    defaultName: '{type}',
  },
  dashboard: {
    title: 'Dashboard',
    tools: 'Tools',
    recentSessions: 'Sessioni recenti',
    noSessions: 'Nessuna sessione ancora. Seleziona un tool per iniziare.',
    subtitle: 'Seleziona un tool per iniziare a generare contenuti',
  },
} as const;
