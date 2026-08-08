export const profile = {
  title: 'Profilo',
  stats: {
    title:         'Statistiche Giocatore',
    level:         'Livello',
    levelFormat:   'Lv.{level} — {label}',
    totalXP:       'XP Totali',
    xpFormat:      '{xp} XP',
    nextLevel:     'Prossimo Livello',
    streak:        'Serie',
    streakFormat:  '{count} giorni',
    longestStreak: 'Serie più lunga',
    badges:        'Badge',
    rank:          'Classifica',
    weeklyRank:    'Classifica settimanale',
  },
  badges: {
    title: 'Progresso Badge',
    label: 'Badge',
  },
  season: {
    title: 'Stagione',
  },
  noProfile: 'Profilo non trovato',
} as const;