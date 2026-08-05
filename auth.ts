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
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.subAdminRole = dbUser.subAdminRole ?? null;
          token.isActive = dbUser.isActive;
        }
      }

      // Handle session updates (e.g., role change)
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.subAdminRole = (token.subAdminRole as string | null) ?? null;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth sign-ins, ensure user has a role assigned
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
  events: {
    async createUser({ user }) {
      // When a new user is created via OAuth, create their parent profile by default
      if (user.id) {
        await prisma.parentProfile.create({
          data: { userId: user.id },
        });
      }
    },
  },
});
