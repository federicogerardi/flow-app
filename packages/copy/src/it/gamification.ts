export const gamification = {
  zone: {
    xp: 'XP',
    level: 'Lv.{level}',
    streakTooltip: 'Serie più lunga: {count} giorni',
    streakAriaLabel: 'Serie: {count} giorni',
  },
  activity: {
    workingSingular: '{name} sta lavorando',
    workingPlural: '{names} stanno lavorando',
  },
  streakMode: {
    label: 'Modalità serie',
    daily: 'Giornaliera',
    business: 'Giorni lavorativi',
  },
  badges: {
    label: 'Badge',
  },
  challenges: {
    activeLabel: 'Attiva',
    completedLabel: 'Completata',
    activeChallenges: 'Challenge attive',
    completedChallenges: 'Completate',
    weekOf: 'Settimana del {date}',
  },
  toasts: {
    levelUp: 'Level Up! Lv.{level} — {label}',
    levelUpSubtitle: 'Hai sbloccato nuove ricompense e riconoscimenti',
    luckyBonus: 'Bonus Fortunato! +{amount} XP',
    luckyBonusSubtitle: 'Output eccezionale rilevato — ricompensa doppia',
  },
} as const;