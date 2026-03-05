import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

type Props = {
  children: ReactNode;
};

export default async function FinanceLayout({ children }: Props) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
