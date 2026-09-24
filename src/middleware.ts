import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rutas que no requieren autenticación
const publicRoutes = ["/login", "/registro", "/api/auth"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Permitir archivos estáticos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Verificar si hay token de sesión (cookie)
  const sessionToken =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token")

  if (!sessionToken) {
    // Redirigir al login si no hay sesión
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Proteger páginas; cada API valida la sesión y responde con JSON
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
}
