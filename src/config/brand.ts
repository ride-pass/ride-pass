// 서비스 이름·브랜드 값은 이 파일 한 곳에서만 정한다 (CLAUDE.md 1절).
// 근거: 「Trailcred 로고」 브랜드 확정안 (박성원, 2026-11-19).
// 이름 뜻: Trail(일한 흔적) + Cred(신용·증명).
export const APP_NAME = "Trailcred";

// 로고 아래에 붙는 영어 태그라인. 로고 일부라 언어 토글과 상관없이 영어로 둔다.
// 한국어·인니어 슬로건은 i18n 파일의 brand.slogan을 쓴다.
export const LOGO_TAGLINE = "Turn your trail into credit.";

// 로고 파일 (public/brand/). 화면은 이 경로만 쓴다.
// 가로형 로고: 심볼 + "Trailcred" + 영어 태그라인. 흰 바탕용, 투명 배경
export const LOGO_PATH = "/brand/Trailcred_logo.webp";
export const LOGO_WIDTH = 1024;
export const LOGO_HEIGHT = 265;

// 앱 아이콘: 보라 바탕 심볼, 1024×1024. 브라우저 탭·홈 화면 아이콘에 쓴다
export const APP_ICON_PATH = "/brand/Trailcred_app_icon_1024.png";

// TODO: 보라 바탕용 로고("Trail" 흰색 + "cred" 라임)를 받으면 경로 추가
