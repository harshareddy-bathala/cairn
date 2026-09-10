import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { reminderSends, users } from "@/db/schema";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { Readout } from "@/components/instrument/readout";
import { ReminderSchedule } from "@/components/instrument/reminder-schedule";
import { TelegramLink } from "@/components/instrument/telegram-link";
import { TimezoneSync } from "@/components/instrument/timezone-sync";
import { ThemeControl } from "@/components/instrument/theme-control";
import { ResetProgress } from "@/components/instrument/reset-progress";
import { progressSummary } from "@/app/actions/reset";
import { REMINDER_LABELS, normaliseSlots } from "@/lib/reminders";
import { telegramConfigured } from "@/lib/telegram";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  const [[row], sends] = await Promise.all([
    db
      .select({
        timezone: users.timezone,
        telegramChatId: users.telegramChatId,
        reminderSlots: users.reminderSlots,
        budgetWeekdayMin: users.budgetWeekdayMin,
        budgetWeekendMin: users.budgetWeekendMin,
      })
      .from(users)
      .where(eq(users.id, userId)),
    db
      .select()
      .from(reminderSends)
      .where(eq(reminderSends.userId, userId))
      .orderBy(desc(reminderSends.sentAt))
      .limit(8),
  ]);

  const summary = await progressSummary();
  const slots = normaliseSlots(row?.reminderSlots);
  const linked = Boolean(row?.telegramChatId);
  const timezone = row?.timezone ?? "Asia/Kolkata";

  return (
    <Boot className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <p className="legend">settings</p>
          <h1 className="mt-1 text-2xl text-hi">Reminders</h1>
          <p className="prose-cairn mt-3 text-base">
            The roadmap failed twice for want of a nudge at the right hour. These are that
            nudge — and nothing more. A reminder reports the trail; it never marks anything
            late, because nothing here can be late.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel legend="appearance">
          <ThemeControl />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="telegram" aux={linked ? "linked" : "not linked"}>
          <TelegramLink linked={linked} configured={telegramConfigured()} />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="schedule" aux={`${slots.filter((s) => s.enabled).length} of ${slots.length} on`}>
          <ReminderSchedule slots={slots} timezone={timezone} linked={linked} />
          <TimezoneSync timezone={timezone} slots={slots} />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="pace budget" aux="day 4 sets these">
          <div className="space-y-2">
            <Readout label="weekday" value={row?.budgetWeekdayMin ?? 240} unit="min" />
            <Readout label="weekend" value={row?.budgetWeekendMin ?? 360} unit="min" />
          </div>
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="start over">
          <ResetProgress summary={summary} />
        </Panel>
      </BootItem>

      {sends.length > 0 && (
        <BootItem>
          <Panel legend="last sends" flush>
            <ul className="divide-y divide-line-soft">
              {sends.map((s) => (
                <li
                  key={`${s.kind}-${s.localDate}`}
                  className="flex items-center gap-3 px-4 py-2 text-sm"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      s.status === "sent" ? "bg-phos" : "bg-ink-700"
                    }`}
                  />
                  <span className="w-24 shrink-0 tabular-nums text-lo">{s.localDate}</span>
                  <span className="min-w-0 flex-1 truncate text-mid">
                    {REMINDER_LABELS[s.kind].label}
                  </span>
                  <span className="truncate text-2xs text-lo">{s.reason ?? "sent"}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </BootItem>
      )}
    </Boot>
  );
}
