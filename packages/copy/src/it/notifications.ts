export const notifications = {
  session: {
    started:   'Generazione avviata',
    completed: 'Risultato pronto',
    failed:    'Generazione fallita',
    cancelled: 'Generazione annullata',
  },
  asset: {
    promoted:   'Promosso ad asset',
    created:    'Asset creato',
    deleted:    'Asset eliminato',
  },
  auth: {
    loggedIn:  'Accesso effettuato',
    loggedOut: 'Disconnesso',
    sessionExpired: 'Sessione scaduta',
  },
} as const;
