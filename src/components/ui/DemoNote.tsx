import { FlaskConical } from "lucide-react";

/** "시연용" 안내 한 줄. 가짜 동작을 진짜처럼 보이지 않게 한다 */
export function DemoNote({ children }: { children: string }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
      <FlaskConical className="size-3.5" aria-hidden />
      {children}
    </p>
  );
}
