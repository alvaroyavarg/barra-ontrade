import { redirect } from "next/navigation";
import { auth, ROLE_HOME } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");
  redirect(ROLE_HOME[session.user.role] ?? "/login");
}
