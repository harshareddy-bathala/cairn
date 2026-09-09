import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, allowedEmails, sessions, users, verificationTokens } from "@/db/schema";

const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const config: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    /** the allowlist. Cairn is invite-only by construction. */
    async signIn({ user }) {
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;
      const [allowed] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email));
      return Boolean(allowed);
    },
    async session({ session, user }) {
      if (session.user && user) {
        const [row] = await db.select().from(users).where(eq(users.id, user.id));
        session.user.id = user.id;
        session.user.handle = row?.handle ?? null;
        session.user.startedAt = row?.startedAt ?? null;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
export const hasProviders = hasGoogle;
