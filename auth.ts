import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authSecret = process.env.AUTH_SECRET || process.env.AUTH_SECRET_FALLBACK;

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const ownerEmail = process.env.AUTH_USER_EMAIL?.trim().toLowerCase();
        const ownerPasswordHash = process.env.AUTH_USER_PASSWORD_HASH?.trim();

        if (!ownerEmail || !ownerPasswordHash) {
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();
        if (email !== ownerEmail) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, ownerPasswordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: "owner",
          email: ownerEmail,
          name: "Owner",
        };
      },
    }),
  ],
});
