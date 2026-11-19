import Image from "next/image";
import { APP_NAME, LOGO_HEIGHT, LOGO_PATH, LOGO_WIDTH, SLOGAN } from "@/config/brand";

// 임시 첫 화면. 시연 1단계(렌털 신청 화면 진입) 작업에서 교체한다.
// 로고 이미지에 영어 슬로건이 들어 있어 따로 쓰지 않는다.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
      <Image
        src={LOGO_PATH}
        alt={APP_NAME}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority
        className="h-auto w-full max-w-[280px]"
      />
      <span className="text-base font-medium">{SLOGAN.ko}</span>
    </main>
  );
}
