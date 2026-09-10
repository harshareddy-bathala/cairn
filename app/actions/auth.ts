"use server";

import { signOut } from "@/auth";

/**
 * Signing out.
 *
 * A server action rather than `signOut` from next-auth/react, so the nav does
 * not need a SessionProvider around the whole app to offer one button.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}
