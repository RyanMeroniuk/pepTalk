/**
 * Schedule computation utilities.
 * Determines which stack items are active on a given date
 * based on their frequency and start date.
 */

const DAY_MS = 86400000;

/**
 * Format a Date object as "YYYY-MM-DD" in local time.
 * Never use toISOString() for this — it converts to UTC
 * and can shift the date in western timezones.
 */
function toLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get the number of days between two date strings.
 * Uses Math.round to handle DST shifts.
 */
function daysBetween(dateA, dateB) {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.round((b - a) / DAY_MS);
}

/**
 * Filter stack items to those scheduled for a given date.
 * @param {Array} stack - Array of stack item objects
 * @param {string} dateString - ISO date "YYYY-MM-DD"
 * @returns {Array} Items active on that date
 */
export function getItemsForDate(stack, dateString) {
  return stack.filter((item) => {
    const start = item.startDate;
    if (!start) return true; // legacy items with no startDate show every day

    const diff = daysBetween(start, dateString);
    if (diff < 0) return false; // before start date

    if (item.endDate) {
      const endDiff = daysBetween(item.endDate, dateString);
      if (endDiff > 0) return false; // after end date
    }

    switch (item.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return diff % 7 === 0;
      case 'biweekly':
        return diff % 14 === 0;
      default:
        return true;
    }
  });
}

/**
 * Get today's date as an ISO string "YYYY-MM-DD".
 */
export function todayString() {
  return toLocalDateString(new Date());
}

/**
 * Generate an array of date strings centered around today.
 * @param {number} pastDays - Days before today (default 90)
 * @param {number} futureDays - Days after today (default 90)
 * @returns {Array<{dateString: string, dayOfWeek: string, dayOfMonth: number, isToday: boolean}>}
 */
export function generateDateRange(pastDays = 90, futureDays = 90) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLocal = toLocalDateString(today);
  const days = [];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = -pastDays; i <= futureDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateString = toLocalDateString(d);
    days.push({
      dateString,
      dayOfWeek: weekdays[d.getDay()],
      dayOfMonth: d.getDate(),
      isToday: dateString === todayLocal,
    });
  }

  return days;
}

/**
 * Format a date string for display.
 * @param {string} dateString - "YYYY-MM-DD"
 * @returns {string} e.g. "Tuesday, April 7"
 */
export function formatDateHeader(dateString) {
  const d = new Date(dateString + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Apply default values to a stack item that may be missing new fields.
 * Used for migrating old items that predate the scheduling feature.
 */
export function migrateItem(item) {
  return {
    frequency: 'daily',
    startDate: todayString(),
    endDate: null,
    route: null,
    ...item,
  };
}
