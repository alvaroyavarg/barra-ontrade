import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppShell from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell role={session.user.role} userName={session.user.name ?? "Usuario"}>
      {children}
    </AppShell>
  );
}
