"use client";

import type { ReactElement } from "react";
import type { QrModules } from "@/lib/qr/generate";
import { QR_MODULE_BLEED_RATIO } from "@/lib/qr/moduleBleed";

type Props = {
  modules: QrModules;
  sizeMm: number;
  className?: string;
};

/** 预览用 SVG，与 PDF 模块矩阵一致；横向合并连续模块以减少竖向缝、利于栅格导出 */
export function QrSvgDom({ modules, sizeMm, className }: Props) {
  const { size, cells } = modules;
  const cell = sizeMm / size;
  const bleed = cell * QR_MODULE_BLEED_RATIO;
  const rects: ReactElement[] = [];
  let key = 0;

  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!cells[y]?.[x]) {
        x += 1;
        continue;
      }
      let xEnd = x;
      while (xEnd + 1 < size && cells[y]?.[xEnd + 1]) {
        xEnd += 1;
      }
      const runW = (xEnd - x + 1) * cell;
      rects.push(
        <rect
          key={`qr-${key++}`}
          x={x * cell - bleed}
          y={y * cell - bleed}
          width={runW + 2 * bleed}
          height={cell + 2 * bleed}
          fill="currentColor"
        />
      );
      x = xEnd + 1;
    }
  }

  return (
    <svg
      width={`${sizeMm}mm`}
      height={`${sizeMm}mm`}
      viewBox={`0 0 ${sizeMm} ${sizeMm}`}
      className={className}
      aria-hidden
      shapeRendering="crispEdges"
    >
      {rects}
    </svg>
  );
}
