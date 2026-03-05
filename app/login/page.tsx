import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let session = null;
  
  try {
    session = await auth();
  } catch (error) {
    console.warn("Auth session check failed:", error);
  }

  if (session?.user?.email) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
