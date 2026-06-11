import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_HOME: Record<string, string> = {
  walker: "/ruta",
  manager: "/dashboard",
  cpa: "/dashboard",
};

// RBAC por prefijo de ruta. El scope fino (ownership, ruta del walker)
// se re-verifica server-side en cada page/handler — nunca confiar en el cliente.
const ROLE_GATES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["cpa"] },
  { prefix: "/api/admin", roles: ["cpa"] },
  { prefix: "/ruta", roles: ["walker", "cpa"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;
  for (const gate of ROLE_GATES) {
    if (pathname.startsWith(gate.prefix) && !gate.roles.includes(role)) {
      if (isApi) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Protege todo excepto login, endpoints de NextAuth y assets estáticos
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
