"use client";

// QR 그림. 내용은 URL이 아니라 시연용 표식이다 (스캔해도 진짜 조회가 되는 것처럼 보이지 않게).

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QrCode({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M" }).then(setSvg);
  }, [value]);
  return (
    <div
      role="img"
      aria-label={label}
      className="size-28 [&>svg]:size-full"
      // qrcode가 만든 SVG 문자열 (사용자 입력이 아닌 고정 형식 값)
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
