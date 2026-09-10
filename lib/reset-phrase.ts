/**
 * The phrase that arms the reset.
 *
 * It lives here rather than in `app/actions/reset.ts` because a "use server"
 * module may only export async functions — exporting a string alongside them
 * invalidates the whole module, and the failure is a bundler error at runtime,
 * not a type error at build. Same split as `lib/reminder-slots` and
 * `lib/reminders`: the constant the client needs, on its own.
 */
export const RESET_PHRASE = "start over";
