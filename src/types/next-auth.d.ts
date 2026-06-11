import type { DefaultSession } from "next-auth";

export type UserRole = "walker" | "manager" | "cpa";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    routeId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      routeId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: UserRole;
    routeId: string | null;
  }
}
