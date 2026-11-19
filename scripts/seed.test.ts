import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURE_FILES } from "@/data/fixtureSet";
import { generateFixtures } from "./generate";
import { FIXTURE_DIR, serialize } from "./seed";
import { checkFixtures } from "./seedChecks";

describe("더미 데이터 (CLAUDE.md 4-6)", () => {
  const fresh = generateFixtures();

  it("새로 만든 데이터가 페르소나 표 검증을 통과한다", () => {
    expect(checkFixtures(fresh)).toEqual([]);
  });

  it("같은 시드로 두 번 만들면 결과가 같다", () => {
    expect(generateFixtures()).toEqual(fresh);
  });

  it.each(FIXTURE_FILES)("커밋된 %s.json이 지금 시드로 만든 결과와 같다 (손으로 고치지 않았다)", (name) => {
    const committed = readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf8");
    expect(committed, "npm run seed를 다시 돌리고 커밋하세요").toBe(serialize(fresh[name]));
  });

  it("실제 플랫폼·금융사 이름이 들어 있지 않다 (CLAUDE.md 2-3)", () => {
    const text = JSON.stringify(fresh).toLowerCase();
    const banned = ["gojek", "grab", "maxim", "indrive", "adira", "fif", "bri", "mandiri", "bca", "jasindo", "evmoto", "maka"];
    for (const word of banned) expect(text, word).not.toMatch(new RegExp(`\\b${word}\\b`));
  });
});
