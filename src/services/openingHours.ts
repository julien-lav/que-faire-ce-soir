// Minimal reader for OpenStreetMap's `opening_hours` syntax, e.g.
// "Tu-Th 10:00-18:00; Fr 10:00-21:00; Sa-Su 10:00-18:00" or "Mo-Fr 09:00-12:00, 14:00-18:00".
// It only understands weekdays and times; anything else (months, weeks, sunrise...) returns null
// so that callers can show the raw text instead of guessing.

// Minutes since midnight, [start, end)
export type Interval = [number, number]
// Index 0 = Monday ... 6 = Sunday
export type Week = Interval[][]

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const DAY = '(?:[A-Z][a-z]|PH|SH)'
const RULE = new RegExp(`^(${DAY}(?:-[A-Z][a-z])?(?:\\s*,\\s*${DAY}(?:-[A-Z][a-z])?)*)?\\s*(.*)$`)
const TIME_RANGE = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/

function parseDays(spec: string): number[] | null {
  const days = new Set<number>()
  for (const part of spec.split(',')) {
    const p = part.trim()
    // Public / school holidays are ignored: we only show the regular week
    if (p === 'PH' || p === 'SH') continue
    const m = /^([A-Z][a-z])(?:-([A-Z][a-z]))?$/.exec(p)
    const from = DAYS.indexOf(m?.[1] ?? '')
    const to = m?.[2] ? DAYS.indexOf(m[2]) : from
    if (!m || from === -1 || to === -1) return null
    for (let d = from; ; d = (d + 1) % 7) {
      days.add(d)
      if (d === to) break
    }
  }
  return [...days]
}

function parseTimes(spec: string): Interval[] | null {
  const text = spec.trim().toLowerCase()
  if (text === 'off' || text === 'closed') return []

  const intervals: Interval[] = []
  for (const part of spec.split(',')) {
    const m = TIME_RANGE.exec(part.trim())
    if (!m) return null
    const start = Number(m[1]) * 60 + Number(m[2])
    let end = Number(m[3]) * 60 + Number(m[4])
    // Past midnight ("20:00-02:00"): keep the part of the evening that belongs to this day
    if (end <= start) end = 1440
    intervals.push([start, Math.min(end, 1440)])
  }
  return intervals
}

export function parseOpeningHours(raw: string): Week | null {
  const week: Week = Array.from({ length: 7 }, () => [])
  const clean = raw.replace(/"[^"]*"/g, '').trim()

  if (clean === '24/7') return week.map(() => [[0, 1440]] as Interval[])

  for (const rule of clean.split(';').map((r) => r.trim()).filter(Boolean)) {
    const m = RULE.exec(rule)
    if (!m) return null
    const days = m[1] ? parseDays(m[1]) : [0, 1, 2, 3, 4, 5, 6]
    const intervals = parseTimes(m[2] ?? '')
    if (!days || !intervals) return null
    // A later rule overrides the earlier ones for the days it names
    for (const d of days) week[d] = intervals
  }
  return week
}

const formatMinutes = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export const formatIntervals = (intervals: Interval[]) =>
  intervals.map(([s, e]) => `${formatMinutes(s)}–${formatMinutes(e)}`)

export function isOpenAt(week: Week, day: number, minutes: number): boolean {
  return week[day]!.some(([s, e]) => s <= minutes && minutes < e)
}

// "Lun–Ven : 10:00–18:00", grouping consecutive days that share the same hours
export function scheduleLines(week: Week): string[] {
  const text = (d: number) => (week[d]!.length ? formatIntervals(week[d]!).join(', ') : 'Fermé')
  const lines: string[] = []
  for (let start = 0; start < 7; ) {
    let end = start
    while (end + 1 < 7 && text(end + 1) === text(start)) end++
    const label = start === end ? DAYS_FR[start]! : `${DAYS_FR[start]}–${DAYS_FR[end]}`
    lines.push(`${label} : ${text(start)}`)
    start = end + 1
  }
  return lines
}
