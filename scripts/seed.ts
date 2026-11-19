// npm run seed — 더미 데이터를 만들고 검증한 뒤 src/data/fixtures/*.json에 쓴다 (CLAUDE.md 4-1, 4-6).
// 검증에 실패하면 파일을 쓰지 않고 종료 코드 1로 끝난다.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_TODAY } from "@/config/demo";
import { deriveRiderMetrics } from "@/data/derive";
import { FIXTURE_FILES, riderRecordsFrom } from "@/data/fixtureSet";
import { formatRupiah } from "@/lib/format";
import { generateFixtures } from "./generate";
import { checkFixtures } from "./seedChecks";

export const FIXTURE_DIR = join(import.meta.dirname, "..", "src", "data", "fixtures");

export function serialize(data: unknown): string {
  return JSON.stringify(data, null, 2) + "\n";
}

function main() {
  const fx = generateFixtures(DEMO_TODAY);
  const problems = checkFixtures(fx, DEMO_TODAY);
  if (problems.length) {
    console.error("검증 실패 — 파일을 쓰지 않았습니다:");
    for (const p of problems) console.error(`  ✗ ${p}`);
    process.exit(1);
  }

  mkdirSync(FIXTURE_DIR, { recursive: true });
  for (const name of FIXTURE_FILES) {
    writeFileSync(join(FIXTURE_DIR, `${name}.json`), serialize(fx[name]));
  }

  console.log(`기준일 ${DEMO_TODAY} · 검증 통과`);
  for (const rider of fx.riders) {
    const m = deriveRiderMetrics(riderRecordsFrom(fx, rider));
    const rate = m.depositMatchRate === null ? "-" : m.depositMatchRate.toFixed(2);
    console.log(
      `  ${rider.id.padEnd(8)} 월 순수입 ${formatRupiah(m.monthlyNet).padStart(13)}` +
        ` · 활동 ${m.consecutiveActiveMonths}개월 · 입금 일치 ${rate}` +
        ` · 활동일 ${m.activeDays30}/30 · 앱 ${m.platformCount30}개`,
    );
  }
  for (const name of FIXTURE_FILES) console.log(`  ${name}.json: ${fx[name].length}건`);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
