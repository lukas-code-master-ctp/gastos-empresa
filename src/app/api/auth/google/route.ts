import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { googleEnabled, sign } from "@/lib/auth";
import { callbackUrl, STATE_COOKIE } from "@/lib/google";

// Manda al usuario a elegir su cuenta Google
export function GET(req: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login", req.url));
  const state = randomBytes(16).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, `${state}.${sign(state)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}
