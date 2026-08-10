import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId:
        process.env.GOOGLE_CLIENT_ID ||
        process.env.AUTH_GOOGLE_ID ||
        "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ||
        process.env.AUTH_GOOGLE_SECRET ||
        "",
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
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!isValid) return null;

        if (!user.isActive) return null;

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
      // Determine canonical app origin in production vs local dev
      let canonicalBase = baseUrl;
      if (
        process.env.NEXT_PUBLIC_APP_URL &&
        !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ) {
        canonicalBase = process.env.NEXT_PUBLIC_APP_URL;
      } else if (process.env.AUTH_URL && !process.env.AUTH_URL.includes("localhost")) {
        canonicalBase = process.env.AUTH_URL;
      } else if (process.env.VERCEL_URL) {
        canonicalBase = `https://${process.env.VERCEL_URL}`;
      }

      // If callbackUrl is relative (e.g. "/login", "/"), resolve against canonical origin
      if (url.startsWith("/")) {
        return `${canonicalBase}${url}`;
      }

      // If callbackUrl is an absolute URL pointing to localhost in production, sanitize it
      try {
        const parsedUrl = new URL(url);
        if (
          parsedUrl.hostname.includes("localhost") &&
          !canonicalBase.includes("localhost")
        ) {
          return `${canonicalBase}${parsedUrl.pathname}${parsedUrl.search}`;
        }
        // Allow same-origin redirects
        if (parsedUrl.origin === canonicalBase || parsedUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        // invalid URL string
      }

      return canonicalBase;
    },
    async jwt({ token, user, trigger, session }) {
      const targetUserId = (user?.id || token.id) as string | undefined;

      if (targetUserId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, role: true, subAdminRole: true, isActive: true },
        });

        if (!dbUser || !dbUser.isActive) {
          // User deleted or suspended — wipe token fields
          return {} as typeof token;
        }

        token.id = dbUser.id;
        token.role = dbUser.role;
        token.subAdminRole = dbUser.subAdminRole ?? null;
        token.isActive = dbUser.isActive;
      }

      // Handle session updates (e.g., role change)
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token?.id || !token?.isActive) {
        // Return empty object for deleted / suspended users so auth() returns null
        return null as any;
      }

      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.subAdminRole = (token.subAdminRole as string | null) ?? null;
      session.user.isActive = token.isActive as boolean;
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth sign-ins, block suspended users
      if (account?.provider === "google" && user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        if (dbUser && !dbUser.isActive) {
          return false; // Block suspended users
        }
      }
      return true;
    },
  },
});
