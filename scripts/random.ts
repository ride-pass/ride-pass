// 시드를 고정한 난수 생성기 (mulberry32). 같은 시드면 항상 같은 수열이 나온다 (CLAUDE.md 4-1).

export interface Random {
  /** 0 이상 1 미만 */
  next(): number;
  /** min 이상 max 미만 */
  range(min: number, max: number): number;
  /** min 이상 max 이하 정수 */
  int(min: number, max: number): number;
}

export function createRandom(seed: number): Random {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
  };
}
