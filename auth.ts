import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit } from "@/lib/security-audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const IS_PROD = process.env.NODE_ENV === "production";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    // Sessions expire after 7 days
    maxAge: 7 * 24 * 60 * 60, // 7 days
    // Re-validate token from DB every 5 minutes — ensures role/suspension changes propagate quickly
    updateAge: 5 * 60, // 5 minutes
  },

  cookies: {
    sessionToken: {
      name: IS_PROD ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,       // Never accessible via JS — prevents XSS token theft
        sameSite: "lax",      // CSRF protection — blocks cross-site POSTs
        secure: IS_PROD,      // HTTPS only in production
        path: "/",
        // No explicit domain — scoped to exact host, not subdomains
      },
    },
    callbackUrl: {
      name: IS_PROD ? "__Secure-authjs.callback-url" : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        path: "/",
      },
    },
    csrfToken: {
      name: IS_PROD ? "__Host-authjs.csrf-token" : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        path: "/",
      },
    },
    pkceCodeVerifier: {
      name: IS_PROD ? "__Secure-authjs.pkce.code_verifier" : "authjs.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        path: "/",
      },
    },
    state: {
      name: IS_PROD ? "__Secure-authjs.state" : "authjs.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        path: "/",
      },
    },
    nonce: {
      name: IS_PROD ? "__Secure-authjs.nonce" : "authjs.nonce",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD,
        path: "/",
      },
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Rate-limit login attempts per email: max 5 per minute
        const email = parsed.data.email.toLowerCase();
        const { allowed } = await checkRateLimit(`login:${email}`, 5);
        if (!allowed) {
          // Silently return null — attacker gets no indication of rate-limiting
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
            isActive: true,
            role: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        if (!user.isActive) return null;

        // Return only the minimum fields needed for the JWT
        // NO password hash, NO sensitive fields
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
      let canonicalBase = baseUrl;
      if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
        canonicalBase = process.env.NEXT_PUBLIC_APP_URL;
      } else if (process.env.AUTH_URL && !process.env.AUTH_URL.includes("localhost")) {
        canonicalBase = process.env.AUTH_URL;
      } else if (process.env.VERCEL_URL) {
        canonicalBase = `https://${process.env.VERCEL_URL}`;
      }

      if (url.startsWith("/")) return `${canonicalBase}${url}`;

      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname.includes("localhost") && !canonicalBase.includes("localhost")) {
          return `${canonicalBase}${parsedUrl.pathname}${parsedUrl.search}`;
        }
        if (parsedUrl.origin === canonicalBase || parsedUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        // invalid URL string — fall through to canonicalBase
      }

      return canonicalBase;
    },

    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, `user` is populated. On subsequent requests, only `token` is present.
      // We ALWAYS re-fetch from DB to ensure role/suspension changes take effect immediately.
      const targetUserId = (user?.id ?? token.id) as string | undefined;

      if (targetUserId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, role: true, subAdminRole: true, customPermissions: true, isActive: true },
        });

        if (!dbUser || !dbUser.isActive) {
          // Wipe entire token — Next-Auth treats an empty token as unauthenticated
          return {} as typeof token;
        }

        // Always overwrite token fields with fresh DB values so role changes propagate instantly
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.subAdminRole = dbUser.subAdminRole ?? null;
        token.customPermissions = dbUser.customPermissions ?? [];
        token.isActive = dbUser.isActive;
      }

      // Handle server-triggered session updates (e.g. role promotion via update())
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (!token?.id || !token?.isActive) {
        return null as any;
      }

      // Expose only what the client strictly needs
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.subAdminRole = (token.subAdminRole as string | null) ?? null;
      session.user.customPermissions = (token.customPermissions as string[]) ?? [];
      session.user.isActive = token.isActive as boolean;
      // session.user.name and session.user.email are already in the JWT sub/name claims
      // We do NOT forward the raw JWT string to the browser
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        // Rate-limit OAuth sign-ins per user ID
        const { allowed } = await checkRateLimit(`oauth:${user.id}`, 10);
        if (!allowed) return false;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isActive: true },
        });
        if (dbUser && !dbUser.isActive) return false;
      }
      return true;
    },
  },
});
