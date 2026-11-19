// 허가 단계 스위치 (CLAUDE.md 2-4).
// "A" = 허가 없이 시작하는 지금 단계(기사 화면: 신용 준비도만).
// "C" = PKA 인가 후 목표 단계(기사 화면: 신용도 + 「PKA 인가 후 제공 기능」 배지).
// 신용도는 모든 단계에서 계산한다. 이 값은 기사 화면에 무엇을 보여 줄지만 정한다.
export type LicenseStage = "A" | "C";

export const LICENSE_STAGE: LicenseStage = "A";
