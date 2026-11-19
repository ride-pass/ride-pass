import { redirect } from "next/navigation";

// 시연은 가상 렌털사 신청 화면에서 시작한다 (CLAUDE.md 3절 1단계).
export default function Home() {
  redirect("/partner/apply");
}
