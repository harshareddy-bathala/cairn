import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { allowedEmails, sessions, users } from "@/db/schema";

export const runtime = "nodejs";

/**
 * Local-only sign-in, so the app is usable before Google OAuth credentials
 * exist. Refuses to run unless BOTH the build is non-production and
 * AUTH_DEV_LOGIN=1 is set explicitly. It still honours the allowlist.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production" || process.env.AUTH_DEV_LOGIN !== "1") {
    return new NextResponse("not found", { status: 404 });
  }

  const email = new URL(req.url).searchParams.get("email")?.toLowerCase().trim();
  if (!email) return new NextResponse("?email= required", { status: 400 });

  const [allowed] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email));
  if (!allowed) return new NextResponse(`${email} is not on the allowlist`, { status: 403 });

  let [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) [user] = await db.insert(users).values({ email }).returning();

  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ sessionToken, userId: user.id, expires });

  const res = NextResponse.redirect(new URL("/today", req.url));
  res.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
