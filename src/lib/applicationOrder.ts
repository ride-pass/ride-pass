// 신청을 "가장 최근 것부터" 줄 세운다. 조작판 「보낸 곳 결과 보내기」가 가장 최근 대기 중 신청을 고를 때 쓴다.
// submittedAt은 날짜만 있어서(CLAUDE.md 4-3) 같은 날 두 곳에 보내면 날짜로는 순서를 가릴 수 없다.
// mockRepository가 만든 신청 id는 끝에 만든 순번이 붙으므로(app-<rider>-<partner>-<n>) 같은 날이면 그 순번이 큰 쪽이 최근이다.
// fixture 신청(app-siti-rental-a 등)은 순번이 없어 0으로 본다. 앱에서 만든 신청보다 먼저 생긴 것이다.

import type { Application } from "@/data/types";

/** id 끝의 만든 순번. 없으면 0 */
export function creationSeq(id: string): number {
  const m = /-(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}

/** sort()에 넘기는 비교 함수: 날짜가 늦은 것 → 같은 날이면 나중에 만든 것이 앞 */
export function newestFirst(a: Application, b: Application): number {
  return b.submittedAt.localeCompare(a.submittedAt) || creationSeq(b.id) - creationSeq(a.id);
}
