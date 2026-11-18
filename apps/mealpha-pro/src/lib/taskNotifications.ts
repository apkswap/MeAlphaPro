import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Rec } from './store';

type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly';

function notificationId(taskId: string, occurrenceKey: string) {
  const source = taskId + ':' + occurrenceKey;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) % 2147483646 + 1;
}

function advanceReminderDate(date: Date, repeat: ReminderRepeat) {
  const next = new Date(date);
  if (repeat === 'daily') next.setDate(next.getDate() + 1);
  else if (repeat === 'weekly') next.setDate(next.getDate() + 7);
  else if (repeat === 'monthly') {
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
  }
  return next;
}

export function nextTaskReminderDate(reminder: Rec, now = Date.now()): Date | null {
  const date = new Date(reminder.at);
  if (!Number.isFinite(date.getTime())) return null;
  const repeat = (reminder.repeat || 'none') as ReminderRepeat;
  if (repeat === 'none') return date.getTime() > now ? date : null;
  let guard = 0;
  while (date.getTime() <= now && guard++ < 100000) {
    const next = advanceReminderDate(date, repeat);
    date.setTime(next.getTime());
  }
  return date.getTime() > now ? date : null;
}

export async function requestTaskReminderPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const current = await LocalNotifications.checkPermissions();
      const permission = current.display === 'granted' ? current : await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    }
    if (typeof window !== 'undefined' && (window as any).mealphaDesktop?.notify) return true;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') return (await Notification.requestPermission()) === 'granted';
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  } catch (error) {
    console.warn('Task reminder permission could not be checked:', error);
    return false;
  }
}

export async function syncNativeTaskReminders(tasks: Rec[], language: 'fa' | 'en') {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const owned = pending.notifications.filter((item) => item.extra?.source === 'mealpha-task');
    if (owned.length) await LocalNotifications.cancel({ notifications: owned.map((item) => ({ id: item.id })) });

    const now = Date.now();
    const notifications = tasks.filter((task) => task.status !== 'Done').flatMap((task) =>
      (Array.isArray(task.reminders) ? task.reminders : []).filter((reminder: Rec) => reminder.enabled && reminder.at).flatMap((reminder: Rec) => {
        const repeat = (reminder.repeat || 'none') as ReminderRepeat;
        const count = repeat === 'daily' ? 30 : repeat === 'weekly' ? 12 : repeat === 'monthly' ? 12 : 1;
        let at = nextTaskReminderDate(reminder, now);
        const scheduled = [];
        for (let index = 0; at && index < count; index++) {
          const occurrence = at.toISOString();
          scheduled.push({
            id: notificationId(task.id, reminder.id + ':' + occurrence),
            title: language === 'fa' ? 'یادآور تسک' : 'Task reminder',
            body: String(task.title || (language === 'fa' ? 'تسک بدون عنوان' : 'Untitled task')).slice(0, 180),
            schedule: { at: new Date(at), allowWhileIdle: true },
            isExactNotification: true,
            autoCancel: true,
            extra: { source: 'mealpha-task', taskId: task.id, reminderId: reminder.id, occurrence },
          });
          at = repeat === 'none' ? null : advanceReminderDate(at, repeat);
        }
        return scheduled;
      })
    );
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (error) {
    console.warn('Native task reminders could not be synchronized:', error);
  }
}
