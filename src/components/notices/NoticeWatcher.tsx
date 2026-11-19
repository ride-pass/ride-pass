"use client";

// 기사 앱이 켜져 있는 동안 새 알림(기관의 열람·승인·거절)이 생기면 화면 위에 토스트로 알린다.
// 분할 보기에서 오른쪽 렌털사 화면이 승인하면, 왼쪽 기사 폰에 바로 뜨는 장면이 여기서 나온다.
// 처음 읽은 알림은 "이미 본 것"으로 두고, 그 뒤에 생긴 것만 띄운다. 화면을 그리지 않는다.

import { useEffect, useRef } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { useToast } from "@/components/ui/Toast";
import { listNotices, listPartners } from "@/data/repository";
import { noticeText } from "./noticeText";

export function NoticeWatcher() {
  const t = useT();
  const toast = useToast();
  const { riderId, lang, dataVersion } = useDemo();
  const seen = useRef<{ riderId: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [notices, partners] = await Promise.all([listNotices(riderId), listPartners()]);
      if (cancelled) return;
      if (!seen.current || seen.current.riderId !== riderId) {
        seen.current = { riderId, ids: new Set(notices.map((n) => n.id)) };
        return;
      }
      // 오래된 것부터 띄운다 (listNotices는 최근 것 먼저)
      for (const n of [...notices].reverse()) {
        if (seen.current.ids.has(n.id)) continue;
        seen.current.ids.add(n.id);
        toast(noticeText(t, n, partners, lang), n.kind === "approved" ? "success" : "default");
      }
    })();
    return () => {
      cancelled = true;
    };
    // 새 알림은 dataVersion이 오를 때 확인한다 (다른 화면의 변경·조작판)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderId, dataVersion]);

  return null;
}
