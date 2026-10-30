import type { NextRequest } from "next/server";

export const STATE_COOKIE = "rindefi_oauth_state";

// URL de vuelta registrada en Google Cloud: <origen>/api/auth/google/callback
export const callbackUrl = (req: NextRequest) => `${process.env.AUTH_URL ?? req.nextUrl.origin}/api/auth/google/callback`;
