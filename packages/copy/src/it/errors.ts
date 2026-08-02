export const errors = {
  readiness: {
    missingFile:  'File briefing mancante',
    missingText:  'Campo obbligatorio non compilato',
    missingAsset: 'Asset "{type}" richiesto ma non disponibile',
    missingWorkspace: 'Seleziona un workspace prima di iniziare',
  },
  generation: {
    llmTimeout:     'Il servizio di generazione non risponde. Riprova.',
    quotaExceeded:  'Crediti esauriti per questo mese. Si resettano il {date}.',
    artifactGate:   'Limite di generazioni raggiunto. Contatta l\'assistenza.',
    sessionNotFound:'Sessione non trovata',
    cancelled:      'Generazione annullata dall\'utente',
    failed:         'Generazione fallita',
    failedToStart:  'Impossibile avviare la sessione',
  },
  auth: {
    invalidCredentials: 'Email o password non validi',
    sessionExpired:     'Sessione scaduta. Effettua nuovamente il login.',
    unauthorized:       'Accesso non autorizzato',
    forbidden:          'Non hai i permessi per questa operazione',
  },
  workspace: {
    notFound:       'Workspace non trovato',
    nameRequired:   'Il nome del workspace è obbligatorio',
    deleteConfirm:  'Eliminare il workspace "{name}"? Questa azione è irreversibile.',
  },
  asset: {
    typeExists:     'Un asset di tipo "{type}" esiste già in questo workspace',
    notFound:       'Asset non trovato',
    uploadFailed:   'Caricamento file fallito',
  },
  network: {
    connectionLost: 'Connessione persa. Verifica la tua rete.',
    serverError:    'Errore del server. Riprova più tardi.',
    rateLimited:    'Troppe richieste. Attendi qualche secondo.',
  },
} as const;
