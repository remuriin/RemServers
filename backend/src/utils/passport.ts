import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`,
    },
    (_accessToken, _refreshToken, profile, done) => {
      // Pass the profile data through to the callback handler
      const user = {
        google_id: profile.id,
        email: profile.emails?.[0]?.value || '',
        name: profile.displayName || '',
      };
      done(null, user);
    }
  )
);

export default passport;
