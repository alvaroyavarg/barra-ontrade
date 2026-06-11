import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth, ROLE_HOME } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect(ROLE_HOME[session.user.role] ?? "/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Key 3<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted">Ejecución On Trade</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
