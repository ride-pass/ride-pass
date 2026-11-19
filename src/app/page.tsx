import { APP_NAME, SLOGAN } from "@/config/brand";

// 임시 첫 화면. 시연 1단계(렌털 신청 화면 진입) 작업에서 교체한다.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2">
      <span className="text-3xl font-bold text-brand-purple">{APP_NAME}</span>
      <span className="text-sm">{SLOGAN.en}</span>
      <span className="text-base font-medium">{SLOGAN.ko}</span>
    </main>
  );
}
