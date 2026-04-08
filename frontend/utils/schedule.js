/**
 * Schedule computation utilities.
 * Determines which stack items are active on a given date
 * based on their selected days of the week.
 */

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
 * Filter stack items to those scheduled for a given date.
 * Uses daysOfWeek array (0=Sun, 1=Mon, ..., 6=Sat).
 * @param {Array} stack - Array of stack item objects
 * @param {string} dateString - ISO date "YYYY-MM-DD"
 * @returns {Array} Items active on that date
 */
export function getItemsForDate(stack, dateString) {
  const target = new Date(dateString + 'T00:00:00');
  const dayOfWeek = target.getDay(); // 0=Sun, 6=Sat

  return stack.filter((item) => {
    const days = item.daysOfWeek;
    // Legacy items with no daysOfWeek show every day
    if (!days || !Array.isArray(days)) return true;
    return days.includes(dayOfWeek);
  });
}

/**
 * Get today's date as "YYYY-MM-DD" in local time.
 */
export function todayString() {
  return toLocalDateString(new Date());
}

/**
 * Generate an array of date strings centered around today.
 * @param {number} pastDays - Days before today (default 90)
 * @param {number} futureDays - Days after today (default 90)
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
 * All 7 days for the day picker UI.
 */
export const WEEKDAYS = [
  { index: 0, short: 'S', label: 'Sun' },
  { index: 1, short: 'M', label: 'Mon' },
  { index: 2, short: 'T', label: 'Tue' },
  { index: 3, short: 'W', label: 'Wed' },
  { index: 4, short: 'T', label: 'Thu' },
  { index: 5, short: 'F', label: 'Fri' },
  { index: 6, short: 'S', label: 'Sat' },
];

/**
 * Describe a daysOfWeek array as a readable string.
 * e.g. [0,1,2,3,4,5,6] → "Every day"
 *      [1,3,5] → "Mon, Wed, Fri"
 */
export function describeDays(daysOfWeek) {
  if (!daysOfWeek || daysOfWeek.length === 0) return 'No days selected';
  if (daysOfWeek.length === 7) return 'Every day';
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((d) => labels[d])
    .join(', ');
}

/**
 * Apply default values to a stack item that may be missing new fields.
 * Migrates old frequency-based items to daysOfWeek.
 */
export function migrateItem(item) {
  // Already has daysOfWeek — no migration needed
  if (item.daysOfWeek && Array.isArray(item.daysOfWeek)) {
    return { route: null, ...item };
  }

  // Convert old frequency format to daysOfWeek
  let daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // default: every day

  if (item.frequency === 'weekly' && item.startDate) {
    const d = new Date(item.startDate + 'T00:00:00');
    daysOfWeek = [d.getDay()];
  } else if (item.frequency === 'biweekly' && item.startDate) {
    // Can't perfectly represent biweekly as days-of-week, default to that one day
    const d = new Date(item.startDate + 'T00:00:00');
    daysOfWeek = [d.getDay()];
  }

  const migrated = { ...item, daysOfWeek, route: item.route || null };
  // Clean up old fields
  delete migrated.frequency;
  delete migrated.startDate;
  delete migrated.endDate;
  return migrated;
}
