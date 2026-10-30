import { NextResponse, type NextRequest } from "next/server";

// Mientras el login sea de demo (cualquiera elige usuario), en internet la app se protege
// con una clave compartida: APP_PASSWORD. Sin esa variable (local) o con login de Google
// activo (GOOGLE_CLIENT_ID) no pide nada.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password || process.env.GOOGLE_CLIENT_ID) return NextResponse.next();
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [, pass] = atob(auth.slice(6)).split(":");
    if (pass === password) return NextResponse.next();
  }
  return new NextResponse("Clave requerida", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Rindefi"' } });
}

export const config = {
  // El webhook de WhatsApp lo llama Meta y no puede mandar la clave; /api/health es el chequeo de estado.
  matcher: ["/((?!api/whatsapp|api/health|_next/static|_next/image|icon.svg).*)"],
};
