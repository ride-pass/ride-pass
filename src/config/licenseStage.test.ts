import { describe, expect, it } from "vitest";
import { LICENSE_STAGE } from "./licenseStage";

describe("LICENSE_STAGE", () => {
  it("기본값은 A단계다 (CLAUDE.md 2-4)", () => {
    expect(LICENSE_STAGE).toBe("A");
  });
});
