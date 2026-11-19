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

// 로고 파일 (public/brand/). 화면은 이 경로만 쓴다. 팀 드라이브의 SVG를 쓴다 (CLAUDE.md 6절).
// 가로형 로고: 심볼 + "Trailcred" + 영어 태그라인. 흰 바탕용, 글자는 패스로 변환됨 (viewBox 385×100)
export const LOGO_PATH = "/brand/Trailcred_logo.svg";
export const LOGO_WIDTH = 1155;
export const LOGO_HEIGHT = 300;

// 앱 아이콘: 보라 바탕 심볼. 브라우저 탭 아이콘은 SVG
export const APP_ICON_PATH = "/brand/Trailcred_app_icon.svg";
// 휴대폰 홈 화면 아이콘(apple-touch-icon)은 SVG를 받지 않아 같은 그림의 PNG를 쓴다
export const APPLE_ICON_PATH = "/brand/Trailcred_app_icon_1024.png";

// TODO: 보라 바탕용 로고("Trail" 흰색 + "cred" 라임)를 받으면 경로 추가
