import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
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
        console.log("DEBUG: Authorize called with:", rawCredentials);
        
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          console.log("DEBUG: Schema parse failed");
          return null;
        }

        const ownerEmail = process.env.AUTH_USER_EMAIL?.trim().toLowerCase();
        const ownerPasswordHash = process.env.AUTH_USER_PASSWORD_HASH?.trim();

        console.log("DEBUG: ownerEmail:", ownerEmail);
        console.log("DEBUG: ownerPasswordHash exists:", !!ownerPasswordHash);

        if (!ownerEmail || !ownerPasswordHash) {
          console.log("DEBUG: Missing env vars");
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();
        if (email !== ownerEmail) {
          console.log("DEBUG: Email mismatch", { email, ownerEmail });
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, ownerPasswordHash);
        console.log("DEBUG: password being compared:", parsed.data.password);
        console.log("DEBUG: hash being compared:", ownerPasswordHash);
        console.log("DEBUG: passwordMatches:", passwordMatches);
        
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
