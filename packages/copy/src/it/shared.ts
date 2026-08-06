export const shared = {
  actions: {
    cancel:    'Annulla',
    save:      'Salva',
    delete:    'Elimina',
    remove:    'Rimuovi',
    confirm:   'Conferma',
    retry:     'Riprova',
    download:  'Scarica',
    promote:   'Promuovi ad asset',
    viewAsset: 'Vedi asset',
    close:     'Chiudi',
    send:      'Invia',
  },
  status: {
    loading:          'Caricamento...',
    error:            'Si è verificato un errore',
    empty:            'Nessun elemento',
    success:          'Operazione completata',
    selectWorkspace:  'Seleziona un workspace',
    noWorkspace:      'Nessun workspace disponibile',
  },
  format: {
    date:     'DD/MM/YYYY',
    datetime: 'DD/MM/YYYY HH:mm',
  },
} as const;