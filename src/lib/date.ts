// 날짜는 "YYYY-MM-DD" 문자열로만 다루고, 계산은 UTC 일(day) 번호로 한다.
// 시간대에 따라 하루가 밀리는 일을 막기 위해서다. 현재 시각은 쓰지 않는다 (CLAUDE.md 4-1).

export type IsoDate = string;

const DAY_MS = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface DateParts {
  year: number;
  month: number; // 1~12
  day: number;
}

export function parseIsoDate(iso: IsoDate): DateParts {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`잘못된 날짜 형식: ${iso} (YYYY-MM-DD 필요)`);
  const parts = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (fromDayNumber(toDayNumber(iso, parts)) !== iso) {
    throw new Error(`존재하지 않는 날짜: ${iso}`);
  }
  return parts;
}

function toDayNumber(iso: IsoDate, parts?: DateParts): number {
  const p = parts ?? parseIsoDate(iso);
  return Date.UTC(p.year, p.month - 1, p.day) / DAY_MS;
}

function fromDayNumber(n: number): IsoDate {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

/** iso에 days일을 더한 날짜 (음수면 뺀다) */
export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromDayNumber(toDayNumber(iso) + days);
}

/** to - from 의 일수. 같은 날이면 0 */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** start <= iso <= end (양 끝 포함) */
export function isWithin(iso: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return iso >= start && iso <= end;
}

/** 요일 번호. 0 = 일요일 … 6 = 토요일 */
export function dayOfWeek(iso: IsoDate): number {
  return new Date(toDayNumber(iso) * DAY_MS).getUTCDay();
}
