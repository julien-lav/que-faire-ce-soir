const END_OF_NIGHT_HOUR = 3

// The hour picked by the user is a wall-clock hour in France, whatever the browser's timezone is
const TIMEZONE = 'Europe/Paris'

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parisParts(d: Date) {
  const p = Object.fromEntries(partsFormat.formatToParts(d).map((x) => [x.type, x.value]))
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
  }
}

// "YYYY-MM-DDTHH:mm" as read on a Paris clock
export function formatLocal(d: Date): string {
  const p = Object.fromEntries(partsFormat.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// The instant at which a Paris clock reads y-m-d h:min (handles summer/winter time)
function parisInstant(y: number, m: number, d: number, h: number, min = 0): Date {
  const wanted = Date.UTC(y, m - 1, d, h, min)
  let t = wanted
  for (let i = 0; i < 2; i++) {
    const p = parisParts(new Date(t))
    t += wanted - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  }
  return new Date(t)
}

// Date.UTC normalises day overflow (e.g. the 32nd), so adding days is safe at month ends
function parisDay(base: { year: number; month: number; day: number }, addDays: number) {
  const d = new Date(Date.UTC(base.year, base.month - 1, base.day + addDays))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

// Window from the chosen hour (0h = midnight, i.e. the next day) until the end of the night.
// With no hour chosen: from now.
export function getWindow(hour: number | null): { from: Date; to: Date } {
  const today = parisParts(new Date())
  const startDay = parisDay(today, hour === 0 ? 1 : 0)
  const from =
    hour === null
      ? new Date()
      : parisInstant(startDay.year, startDay.month, startDay.day, hour)

  // Night ends at 03:00 on the morning after the evening that starts at `from`
  const endDay = parisDay(startDay, hour === 0 ? 0 : 1)
  const to = parisInstant(endDay.year, endDay.month, endDay.day, END_OF_NIGHT_HOUR)
  return { from, to }
}
