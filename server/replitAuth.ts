import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import express, { type Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import LocalStrategy from 'passport-local';
import bcrypt from 'bcryptjs';

// Determine auth mode: prefer Replit OIDC when REPLIT_DOMAINS is set.
const hasReplit = !!process.env.REPLIT_DOMAINS;
const authProvider = process.env.AUTH_PROVIDER || (hasReplit ? 'replit' : 'local');

if (!hasReplit && process.env.NODE_ENV === 'production' && authProvider !== 'local') {
  console.error("❌ REPLIT_DOMAINS missing in production and AUTH_PROVIDER is not 'local' - authentication will fail");
  console.error("💡 Set REPLIT_DOMAINS for Replit OIDC, or set AUTH_PROVIDER=local and provide secure credentials for production.");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days for better persistence
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: Math.floor(sessionTtl / 1000), // Convert to seconds for PostgreSQL
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    store: sessionStore,
    resave: true, // Force session save to avoid expiration
    saveUninitialized: true, // Save empty sessions
    rolling: true, // Extend session on activity
    cookie: {
      httpOnly: true,
      secure: false, // Allow non-HTTPS for development
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Ensure new users get proper free tier setup
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    subscriptionTier: "free",
    subscriptionStatus: "free", 
    battlesRemaining: 3,
    lastBattleReset: new Date(),
  });
}

function setupLocalAuth(app: Express) {
  // Local strategy: email/password authentication with bcrypt
  passport.use(new LocalStrategy.Strategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email: string, password: string, done: any) => {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      // Verify password
      if (!user.passwordHash) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      // Create session user object
      const sessionUser: any = { id: user.id };
      sessionUser.claims = { sub: user.id, email: user.email };
      sessionUser.expires_at = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365; // 1 year
      
      return done(null, sessionUser);
    } catch (err) {
      return done(err as any);
    }
  }));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Registration endpoint for local auth
  app.post('/api/register', express.json(), async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user with hashed password
      const newUser = await storage.upsertUser({
        email,
        passwordHash,
        firstName: firstName || email.split('@')[0],
        lastName: lastName || '',
        profileImageUrl: '',
        subscriptionTier: 'free',
        subscriptionStatus: 'free',
        battlesRemaining: 3,
        lastBattleReset: new Date(),
      });
      
      // Auto-login after registration
      const sessionUser: any = { id: newUser.id };
      sessionUser.claims = { sub: newUser.id, email: newUser.email };
      sessionUser.expires_at = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
      
      req.login(sessionUser, (err: any) => {
        if (err) return next(err);
        res.json({ ok: true, user: { id: newUser.id, email: newUser.email } });
      });
    } catch (err) {
      next(err);
    }
  });

  // JSON login endpoint for local auth
  app.post('/api/login', express.json(), (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      req.login(user, (err2: any) => {
        if (err2) return next(err2);
        res.json({ ok: true, user });
      });
    })(req, res, next);
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  setupLocalAuth(app);

  if (authProvider !== 'local' && hasReplit) {
    // Replit OIDC provider
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    app.get("/api/login", (req, res, next) => {
      const strategyName = `replitauth:${req.hostname}`;
      const hasStrategy = (passport as any)._strategy?.(strategyName);

      if (!hasStrategy) {
        return res.redirect("/login");
      }

      return passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      const strategyName = `replitauth:${req.hostname}`;
      const hasStrategy = (passport as any)._strategy?.(strategyName);

      if (!hasStrategy) {
        return res.redirect("/login");
      }

      return passport.authenticate(strategyName, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  } else {
    app.get('/api/logout', (req, res) => {
      req.logout(() => res.json({ ok: true }));
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    // Handle cases where isAuthenticated might not be a function
    const isAuth = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : !!req.user;
    if (!isAuth) {
      console.log('User not authenticated via Passport');
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.user as any;
    if (!user || !user.claims) {
      console.log('No user or claims found in session');
      return res.status(401).json({ message: "Unauthorized" });
    }

    // For Pro users with unlimited access, be very lenient
    const userId = user.claims.sub;
    if (userId) {
      try {
        const dbUser = await storage.getUser(userId);
        if (dbUser && dbUser.subscriptionTier === 'pro') {
          // Pro user - always allow access, skip all token checks
          return next();
        }
      } catch (dbError) {
        console.error('Database error checking user:', dbError);
        // Continue with token validation
      }
    }

    // For non-Pro users, check token expiration with generous buffer
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = user.expires_at || user.claims?.exp;
    const bufferTime = 300; // 5 minute buffer
    
    if (!expiresAt || now <= (expiresAt + bufferTime)) {
      return next();
    }

    // Try to refresh token if expired
    const refreshToken = user.refresh_token;
    if (refreshToken) {
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        console.log('Token refreshed successfully');
        return next();
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    console.log('Authentication failed - token expired and refresh failed');
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
