import { fail } from "@/lib/api";

export async function requireApiAuth() {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.email) {
    return fail("UNAUTHORIZED", "Authentication required.", 401);
  }

  return null;
}
