import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DemoProvider } from "@/components/demo/DemoProvider";
import { APP_ICON_PATH, APP_NAME, APPLE_ICON_PATH } from "@/config/brand";
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
  icons: { icon: APP_ICON_PATH, apple: APPLE_ICON_PATH },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {/* 화면 틀은 화면 묶음마다 정한다: 기사 화면은 PhoneFrame(390px), 렌털사 업무 화면은 전체 폭 */}
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
