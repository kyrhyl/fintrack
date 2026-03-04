import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

type Props = {
  children: ReactNode;
};

export default function FinanceLayout({ children }: Props) {
  return <AppShell>{children}</AppShell>;
}
