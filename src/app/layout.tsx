import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DemoProvider } from "@/components/demo/DemoProvider";
import { APP_ICON_PATH, APP_NAME } from "@/config/brand";
import "./globals.css";

// Pretendard (SIL OFL 1.1, src/app/fonts/Pretendard-LICENSE.txt)
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  icons: { icon: APP_ICON_PATH, apple: APP_ICON_PATH },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* 모바일 화면 우선: Figma 기준 390px 폭의 앱 프레임 */}
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col bg-canvas">
          <DemoProvider>{children}</DemoProvider>
        </div>
      </body>
    </html>
  );
}
