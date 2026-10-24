/**
 * Chokepoint traffic, from IMF PortWatch.
 *
 * PortWatch publishes daily vessel transits for 28 maritime chokepoints,
 * derived from AIS, through a public ArcGIS endpoint that needs no key. This
 * is the one part of the shipping picture that is both free and genuinely
 * live-ish: lanes are geography and barely change, vessel positions need a
 * paid or always-on feed, but how many ships went through the Suez yesterday
 * is published and costs nothing.
 *
 * It lags about a week and is revised, which is why every reading carries its
 * own date rather than being presented as "now".
 *
 * A number on its own says nothing here — 50 ships through the Panama Canal
 * is quiet, 50 through the Bosporus is busy — so each chokepoint also gets its
 * own recent average and the same window a year earlier. That comparison is
 * the entire point: it is what turns a count into "this has changed".
 */

const SERVICE =
  'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query'

/** The source publishes daily and lags days, so asking more often is waste. */
export const CHOKEPOINT_REVALIDATE = 60 * 60 * 6

/** Days of history behind each reading. */
const WINDOW = 30

export interface ChokepointReading {
  id: string
  /** The day this reading is for — not today. */
  date: string
  total: number
  tanker: number
  container: number
  dryBulk: number
  /** Mean daily transits over the trailing window. */
  recent: number
  /** Mean over the same window a year earlier, when the source goes back. */
  lastYear: number | null
  /** Trailing window of daily totals, oldest first. */
  series: number[]
}

interface Attributes {
  [key: string]: string | number | null
}

async function query(params: Record<string, string>): Promise<Attributes[]> {
  const url = `${SERVICE}?${new URLSearchParams({ f: 'json', ...params })}`
  const res = await fetch(url, { next: { revalidate: CHOKEPOINT_REVALIDATE } })
  if (!res.ok) throw new Error(`PortWatch ${res.status}`)
  const body = await res.json()
  if (body.error) throw new Error(`PortWatch: ${body.error.message ?? 'query failed'}`)
  return (body.features ?? []).map((f: { attributes: Attributes }) => f.attributes)
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function num(v: string | number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** Mean daily transits per chokepoint over a date range. */
async function meanOver(from: string, to: string): Promise<Map<string, number>> {
  const rows = await query({
    where: `date >= '${from}' AND date <= '${to}'`,
    groupByFieldsForStatistics: 'portid',
    outStatistics: JSON.stringify([
      { statisticType: 'avg', onStatisticField: 'n_total', outStatisticFieldName: 'mean' },
    ]),
  })
  return new Map(rows.map(r => [String(r.portid), Math.round(num(r.mean) * 10) / 10]))
}

export async function getChokepointTraffic(): Promise<{
  readings: ChokepointReading[]
  latestDate: string | null
}> {
  // What the source actually has, rather than what today's date implies: it
  // runs about a week behind and that gap is not fixed.
  const newest = await query({
    where: '1=1',
    outFields: 'date',
    orderByFields: 'date DESC',
    resultRecordCount: '1',
  })
  const latestDate = newest.length ? String(newest[0].date) : null
  if (!latestDate) return { readings: [], latestDate: null }

  const from = shiftDays(latestDate, -(WINDOW - 1))
  const yearFrom = shiftDays(from, -365)
  const yearTo = shiftDays(latestDate, -365)

  const [history, recent, lastYear] = await Promise.all([
    // 28 chokepoints over 30 days is 840 rows, inside the service's 1000 cap.
    query({
      where: `date >= '${from}' AND date <= '${latestDate}'`,
      outFields: 'portid,date,n_total,n_tanker,n_container,n_dry_bulk',
      orderByFields: 'date ASC',
      resultRecordCount: '1000',
    }),
    meanOver(from, latestDate),
    meanOver(yearFrom, yearTo).catch(() => new Map<string, number>()),
  ])

  const byPort = new Map<string, Attributes[]>()
  for (const row of history) {
    const id = String(row.portid)
    const list = byPort.get(id)
    if (list) list.push(row)
    else byPort.set(id, [row])
  }

  const readings: ChokepointReading[] = []
  for (const [id, rows] of byPort) {
    const last = rows[rows.length - 1]
    readings.push({
      id,
      date: String(last.date),
      total: num(last.n_total),
      tanker: num(last.n_tanker),
      container: num(last.n_container),
      dryBulk: num(last.n_dry_bulk),
      recent: recent.get(id) ?? 0,
      lastYear: lastYear.get(id) ?? null,
      series: rows.map(r => num(r.n_total)),
    })
  }

  return { readings, latestDate }
}
