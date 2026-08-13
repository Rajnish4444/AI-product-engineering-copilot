/**
 * NextAuth v5 configuration. GitHub OAuth is the sole user-auth mechanism —
 * see ADR-0001. Session is a signed JWT cookie (no database).
 *
 * The GitHub App that grants repo access is separate from this OAuth App;
 * see docs/runbook.md for the two-App setup.
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
  interface Session {
    githubLogin?: string;
  }
}

type JwtWithLogin = { githubLogin?: string } & Record<string, unknown>;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
      const t = token as JwtWithLogin;
      const login = (profile as { login?: unknown } | undefined)?.login;
      if (typeof login === "string") t.githubLogin = login;
      return t;
    },
    async session({ session, token }) {
      const login = (token as JwtWithLogin).githubLogin;
      if (login) session.githubLogin = login;
      return session;
    },
  },
});
