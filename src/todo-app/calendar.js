// Calendar grid assembly: combines data.js's date-math with heatmap
// ratio/band and reminder lookups into render-ready cell objects. Pure — no
// DOM. render.js paints what this module builds.

import { monthDates, weekDates, band, dayRatio, addDays, weekdayOf } from './data.js';

// English, Monday-first (matches weekDates()'s week-start convention) —
// the app's UI is English throughout, per user preference when this was
// added (a calendar formatting follow-up, not part of the original spec).
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function buildCell(date, today, stores, reminders) {
  const ratio = dayRatio(date, stores);
  return {
    date,
    isToday: date === today,
    band: band(ratio.done, ratio.total),
    reminder: reminders.find((r) => r.date === date) || null,
  };
}

// Real day cells padded with { blank: true } placeholders so day N always
// sits under the correct weekday column, completing partial weeks at both
// ends — the alignment a weekday header row (Mon..Sun) needs to be
// meaningful, matching a normal calendar (Google/iOS Calendar, etc.).
function buildMonthCells(year, month, today, stores, reminders) {
  const dates = monthDates(year, month);
  const leadingBlanks = (weekdayOf(dates[0]) + 6) % 7; // Mon=1 -> 0 blanks ... Sun=0 -> 6 blanks
  const cells = dates.map((date) => buildCell(date, today, stores, reminders));
  const trailingBlanks = (7 - ((leadingBlanks + cells.length) % 7)) % 7;
  return [
    ...Array.from({ length: leadingBlanks }, () => ({ blank: true })),
    ...cells,
    ...Array.from({ length: trailingBlanks }, () => ({ blank: true })),
  ];
}

// Month/week views return a flat array of cells (month's may include
// { blank: true } padding). Year view returns 12 { label, cells } groups —
// one panel per month, shown all at once, each with its own (unpadded,
// since there's no weekday header inside it to align to) day grid.
export function buildGrid(view, referenceDate, today, stores, reminders = []) {
  if (view === 'week') {
    return weekDates(referenceDate).map((date) => buildCell(date, today, stores, reminders));
  }
  if (view === 'year') {
    const year = Number(referenceDate.slice(0, 4));
    return MONTH_LABELS.map((label, index) => ({
      label,
      cells: monthDates(year, index + 1).map((date) => buildCell(date, today, stores, reminders)),
    }));
  }
  const [year, month] = referenceDate.split('-').map(Number);
  return buildMonthCells(year, month, today, stores, reminders);
}

function firstOfMonth(isoDate) {
  return `${isoDate.slice(0, 7)}-01`;
}

function firstOfYear(isoDate) {
  return `${isoDate.slice(0, 4)}-01-01`;
}

export function shiftPeriod(referenceDate, view, direction) {
  if (view === 'week') return addDays(referenceDate, 7 * direction);
  if (view === 'year') {
    const year = Number(referenceDate.slice(0, 4)) + direction;
    return `${year}-01-01`;
  }
  // month
  const [year, month] = referenceDate.split('-').map(Number);
  const total = (year * 12 + (month - 1)) + direction;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

// Normalizes "today" onto a representative reference date for a given view
// (month -> 1st of this month, year -> Jan 1, week -> today itself, since
// weekDates() derives the containing week from any date in it).
export function referenceDateForToday(view, today) {
  if (view === 'month') return firstOfMonth(today);
  if (view === 'year') return firstOfYear(today);
  return today;
}
