export const auth = {
  login: {
    title:    'Accedi',
    email:    'Email',
    password: 'Password',
    submit:   'Accedi',
    noAccount: 'Non hai un account?',
    signUp:   'Registrati',
    google:   'Accedi con Google',
    error:    'Email o password non validi',
  },
  register: {
    title:           'Registrati',
    email:           'Email',
    password:        'Password',
    confirmPassword: 'Conferma password',
    submit:          'Crea account',
    hasAccount:      'Hai già un account?',
    signIn:          'Accedi',
    passwordMismatch:'Le password non corrispondono',
  },
} as const;
