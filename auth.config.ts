import type { NextAuthConfig } from "next-auth";

type Role = "walker" | "manager";

/**
 * Edge-safe config (no DB / bcrypt). Shared by middleware and the full server
 * instance in lib/auth.ts. RBAC by path lives in the `authorized` callback.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role as Role | undefined;

      if (pathname === "/login") {
        if (isLoggedIn) return Response.redirect(new URL("/", request.nextUrl));
        return true;
      }

      if (!isLoggedIn) return false; // → redirect to /login

      // Manager-only areas (analytics + admin)
      const managerOnly = ["/dashboard", "/admin"];
      if (managerOnly.some((p) => pathname.startsWith(p)) && role !== "manager") {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      // Logging visits is walker-only (manager supervises)
      const walkerOnly = ["/visitas/nueva"];
      if (walkerOnly.some((p) => pathname.startsWith(p)) && role !== "walker") {
        return Response.redirect(new URL("/", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
