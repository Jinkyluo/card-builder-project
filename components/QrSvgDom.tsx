"use client";

import type { ReactElement } from "react";
import type { QrModules } from "@/lib/qr/generate";

type Props = {
  modules: QrModules;
  sizeMm: number;
  className?: string;
};

/** 预览用 SVG，与 PDF 模块矩阵一致 */
export function QrSvgDom({ modules, sizeMm, className }: Props) {
  const { size, cells } = modules;
  const cell = sizeMm / size;
  const rects: ReactElement[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!cells[y]?.[x]) continue;
      rects.push(
        <rect
          key={`${x}-${y}`}
          x={x * cell}
          y={y * cell}
          width={cell}
          height={cell}
          fill="currentColor"
        />
      );
    }
  }
  return (
    <svg
      width={`${sizeMm}mm`}
      height={`${sizeMm}mm`}
      viewBox={`0 0 ${sizeMm} ${sizeMm}`}
      className={className}
      aria-hidden
    >
      {rects}
    </svg>
  );
}
