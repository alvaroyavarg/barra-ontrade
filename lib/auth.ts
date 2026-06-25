import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success || !db) return null;

        const rows = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email.trim().toLowerCase()))
          .limit(1);

        const u = rows[0];
        if (!u || !u.active || !u.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, u.passwordHash);
        if (!ok) return null;

        return { id: u.id, email: u.email, name: u.name, role: u.role };
      },
    }),
  ],
});
