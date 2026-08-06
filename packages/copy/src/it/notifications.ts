export const notifications = {
  session: {
    started:   'Generazione avviata',
    completed: 'Risultato pronto',
    failed:    'Generazione fallita',
    cancelled: 'Generazione annullata',
  },
  asset: {
    promoted:         'Promosso ad asset',
    promotedWithType: 'Asset "{type}" promosso',
    promotedWithName: '"{name}" promosso ad asset',
    created:          'Asset creato',
    deleted:          'Asset eliminato',
    renamed:          'Asset rinominato',
    renameFailed:     'Impossibile rinominare l\'asset',
  },
  auth: {
    loggedIn:  'Accesso effettuato',
    loggedOut: 'Disconnesso',
    sessionExpired: 'Sessione scaduta',
  },
} as const;
