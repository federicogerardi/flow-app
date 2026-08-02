import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { AuthService, AuthResult } from '../api/auth/auth-service.js';
import type { UserRepository } from '@flow-app/domain';

export function configurePassport(
  authService: AuthService,
  userRepo: UserRepository,
  googleConfig?: { clientId: string; clientSecret: string; callbackUrl: string },
): void {
  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const result = await authService.login(email, password);
          done(null, result as unknown as Express.User);
        } catch (err) {
          done(err, false);
        }
      },
    ),
  );

  if (googleConfig) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleConfig.clientId,
          clientSecret: googleConfig.clientSecret,
          callbackURL: googleConfig.callbackUrl,
          scope: ['email', 'profile'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              done(new Error('No email found in Google profile'), false);
              return;
            }

            const result = await authService.loginWithOAuth({
              email,
              provider: 'google',
              providerId: profile.id,
            });
            done(null, result as unknown as Express.User);
          } catch (err) {
            done(err, false);
          }
        },
      ),
    );
  }

  passport.serializeUser((user: Express.User, done) => {
    const authResult = user as unknown as AuthResult;
    done(null, authResult.user?.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userRepo.findById(id);
      done(null, (user as unknown as Express.User) ?? false);
    } catch (err) {
      done(err, false);
    }
  });
}
