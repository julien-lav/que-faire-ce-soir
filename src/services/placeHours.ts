import type { ListingPlace } from './listing'
import { formatIntervals, isOpenAt, parseOpeningHours, scheduleLines } from './openingHours'
import { parisWeekday } from './timeWindow'

// Turns an OpenStreetMap `opening_hours` value into what a card shows: today's hours and, when an
// hour is chosen, whether the place is open then.
// `known` is false when the hours exist but could not be read. `closed` is true only when known
// hours say the place is closed: with an hour chosen, closed at that hour; without, closed all day.
export function hoursInfo(
  raw: string,
  hour: number | null,
): { place: Partial<ListingPlace>; known: boolean; closed: boolean } {
  const week = parseOpeningHours(raw)
  if (!week) {
    return {
      place: {
        schedule: [raw],
        scheduleSource: 'OpenStreetMap',
        detail: 'Horaires : voir la fiche',
        detailIcon: '🕐',
      },
      known: false,
      closed: false,
    }
  }

  const today = parisWeekday()
  const todayHours = formatIntervals(week[today]!)
  const place: Partial<ListingPlace> = {
    times: todayHours,
    schedule: scheduleLines(week),
    scheduleSource: 'OpenStreetMap',
  }
  let closed = todayHours.length === 0

  if (hour !== null) {
    // Midnight belongs to the next day
    const open = hour === 0 ? isOpenAt(week, (today + 1) % 7, 0) : isOpenAt(week, today, hour * 60)
    const label = `${String(hour).padStart(2, '0')}h`
    place.status = { open, label: open ? `Ouvert à ${label}` : `Fermé à ${label}` }
    closed = !open
  }
  return { place, known: true, closed }
}
