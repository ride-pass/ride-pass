import { describe, expect, it } from "vitest";
import { LICENSE_STAGE } from "./licenseStage";

describe("LICENSE_STAGE", () => {
  it("PKA 인가 후 단계(C)로 고정한다 (CLAUDE.md 2-4)", () => {
    expect(LICENSE_STAGE).toBe("C");
  });
});
