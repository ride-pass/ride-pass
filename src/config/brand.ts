// 서비스 이름·브랜드 값은 이 파일 한 곳에서만 정한다 (CLAUDE.md 1절).
// 근거: 「Trailcred 로고」 브랜드 확정안 (박성원, 2026-11-19).
// 이름 뜻: Trail(일한 흔적) + Cred(신용·증명).
export const APP_NAME = "Trailcred";

// 슬로건 (CLAUDE.md 1절). 영어는 로고 아래 태그라인, 한국어는 발표 메인 문구.
export const SLOGAN = {
  ko: "일한 흔적이 신용이 된다",
  en: "Turn your trail into credit.",
  // TODO: 원어민 검수
  id: "Setiap jejak kerjamu jadi bukti.",
} as const;

// TODO: 로고 SVG(가로형·보라 바탕용·앱 아이콘)를 public/brand/에 넣고 경로를 추가
