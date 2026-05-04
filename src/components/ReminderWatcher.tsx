import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

const KEY = "copilot.lastReminderToast";

export function ReminderWatcher() {
  const { reminders, activeProfile } = useStore();

  useEffect(() => {
    if (!activeProfile) return;
    const today = new Date();
    const dateKey = `${activeProfile.id}-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    if (localStorage.getItem(KEY) === dateKey) return;

    const due = reminders.filter((r) => r.enabled && r.day_of_month === today.getDate());
    if (!due.length) return;

    due.forEach((r) => toast.message(`Lembrete: ${r.title}`));
    localStorage.setItem(KEY, dateKey);
  }, [reminders, activeProfile]);

  return null;
}
