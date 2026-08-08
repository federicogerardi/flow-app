export const conversations = {
  notFound:     'Conversazione non trovata',
  contextLabel: 'Contesto workspace',
  input: {
    label:       'Nuovo messaggio',
    placeholder: 'Scrivi un messaggio...',
    sendLabel:   'Invia messaggio',
  },
  empty: {
    title:   'Nessuna conversazione',
    message: 'Avvia una conversazione con un agente per iniziare a chattare.',
    description: 'Chiedimi qualsiasi cosa riguardo le tue esigenze di marketing. Ho accesso completo agli asset del workspace.',
    suggestedLabel: 'Domande suggerite',
    fallbackQuestion1: 'Come posso aiutarti?',
    fallbackQuestion2: 'Come dovrei iniziare questo progetto?',
    fallbackQuestion3: 'Quale informazione ti serve da me?',
  },
  suggested: {
    example: 'Genera 5 varianti di social media post per il lancio di un prodotto',
    strategist: [
      'Quale strategia di marketing dovrei usare per il lancio di un SaaS?',
      'Analizza i miei competitor e suggerisci angoli di posizionamento',
      'Quali canali sarebbero più efficaci per la lead generation B2B?',
    ],
    copywriter: [
      'Scrivi un titolo convincente per una landing page B2B',
      'Aiutami a migliorare il tono di questa campagna email',
    ],
    seoSpecialist: [
      'Suggerisci miglioramenti SEO per il mio articolo',
      'Quale keyword dovrei posizionare per questo argomento?',
      'Audita la mia landing page per SEO on-page',
    ],
    adsSpecialist: [
      'Scrivi 3 varianti di Google Ads per la mia campagna',
      'Suggerisci targeting di pubblico per annunci LinkedIn',
      'Aiutami a fare A/B test sul copy degli annunci',
    ],
    analyst: [
      'Analizza i dati delle mie ultime campagne',
      'Quale metrica dovrei tracciare per il content marketing?',
      'Confronta i nostri tassi di conversione con gli standard del settore',
    ],
    creativeDirector: [
      'Revisiona il mio brand messaging per coerenza',
      'Suggerisci angoli creativi per una campagna testimonial',
      'Aiutami ad allineare identità visiva e scritta',
    ],
    emailMarketer: [
      'Scrivi una sequenza drip per i nuovi iscritti',
      'Aiutami a migliorare il tasso di apertura della newsletter',
      'Suggerisci subject line per una campagna di re-engagement',
    ],
  },
  drawer: {
    closeLabel:  'Chiudi pannello contesto',
    generateCta: 'Genera →',
  },
  agent: {
    avatarFallback: '🤖',
  },
  aria: {
    conversationLabel: 'Conversazione con {agentName}',
  },
} as const;