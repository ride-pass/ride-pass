import { APP_NAME, LOGO_TAGLINE } from "@/config/brand";
import ko from "@/i18n/ko.json";

// 임시 첫 화면. 시연 1단계(렌털 신청 화면 진입) 작업에서 교체한다.
// TODO: i18n 구조(언어 토글)를 만들면 ko.json 직접 import를 교체
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2">
      <span className="text-3xl font-bold text-brand-purple">{APP_NAME}</span>
      <span className="text-sm">{LOGO_TAGLINE}</span>
      <span className="text-base font-medium">{ko.brand.slogan}</span>
    </main>
  );
}
