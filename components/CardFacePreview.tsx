"use client";

import { forwardRef } from "react";
import type { CardState } from "@/lib/types/card";
import {
  BACK_LOGO_BOUNDS_MM,
  FRONT_LOGO_BOUNDS_MM,
  SHOPLAZZA_BACK_LOGO,
  SHOPLAZZA_FRONT_LOGO,
} from "@/lib/brand/shoplazza";
import { SUBOTIZ_BACK_LOGO, SUBOTIZ_FRONT_LOGO } from "@/lib/brand/subotiz";
import { cn } from "@/lib/utils";
import {
  CARD_HEIGHT_MM,
  CARD_WIDTH_MM,
  getTemplate,
  type TemplateLayout,
} from "@/lib/layout/cardLayout";
import {
  resolveBlockLeftMm,
  resolveBlockLineHeightPt,
  resolveBlockTopMm,
} from "@/lib/layout/dynamicPositions";
import { resolveFieldDisplayValue } from "@/lib/fields/displayValue";
import { QrSvgDom } from "@/components/QrSvgDom";
import type { QrModules } from "@/lib/qr/generate";

/** 固定小数位，避免 SSR 与浏览器浮点序列化不一致导致水合警告 */
function layoutMm(n: number): string {
  return `${Number(n.toFixed(4))}mm`;
}

function layoutPt(n: number): string {
  return `${Number(n.toFixed(4))}pt`;
}

type Props = {
  state: CardState;
  side: "front" | "back";
  qrModules: QrModules | null;
  onQrPlaceholderClick?: () => void;
  className?: string;
  /** `export`：无圆角与 ring，用于 PNG 栅格化；默认 `preview` 与实时预览一致 */
  variant?: "preview" | "export";
};

function FaceContent({
  layout,
  side,
  state,
  qrModules,
  onQrPlaceholderClick,
}: {
  layout: TemplateLayout;
  side: "front" | "back";
  state: CardState;
  qrModules: QrModules | null;
  onQrPlaceholderClick?: () => void;
}) {
  const face = layout[side];
  const qrPos = layout.qr[side];
  const payload = state.qr?.payload;

  const subotizChrome = state.templateId === "B";

  return (
    <>
      {state.templateId === "A" && side === "front" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SHOPLAZZA_FRONT_LOGO}
          alt=""
          className="absolute object-contain"
          style={{
            left: `${FRONT_LOGO_BOUNDS_MM.left}mm`,
            top: `${FRONT_LOGO_BOUNDS_MM.top}mm`,
            width: `${FRONT_LOGO_BOUNDS_MM.width}mm`,
            height: `${FRONT_LOGO_BOUNDS_MM.height}mm`,
          }}
        />
      )}

      {state.templateId === "B" && side === "front" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SUBOTIZ_FRONT_LOGO}
          alt=""
          className="absolute object-contain"
          style={{
            left: `${FRONT_LOGO_BOUNDS_MM.left}mm`,
            top: `${FRONT_LOGO_BOUNDS_MM.top}mm`,
            width: `${FRONT_LOGO_BOUNDS_MM.width}mm`,
            height: `${FRONT_LOGO_BOUNDS_MM.height}mm`,
          }}
        />
      )}

      {state.templateId === "A" && side === "back" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SHOPLAZZA_BACK_LOGO}
          alt=""
          className="absolute object-contain"
          style={{
            left: `${BACK_LOGO_BOUNDS_MM.left}mm`,
            top: `${BACK_LOGO_BOUNDS_MM.top}mm`,
            width: `${BACK_LOGO_BOUNDS_MM.width}mm`,
            height: `${BACK_LOGO_BOUNDS_MM.height}mm`,
          }}
        />
      )}

      {state.templateId === "B" && side === "back" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={SUBOTIZ_BACK_LOGO}
          alt=""
          className="absolute object-contain"
          style={{
            left: `${BACK_LOGO_BOUNDS_MM.left}mm`,
            top: `${BACK_LOGO_BOUNDS_MM.top}mm`,
            width: `${BACK_LOGO_BOUNDS_MM.width}mm`,
            height: `${BACK_LOGO_BOUNDS_MM.height}mm`,
          }}
        />
      )}

      {face.blocks.map((b) => {
        const text = resolveFieldDisplayValue(state, b.key);
        if (
          (b.key === "address" || b.key === "addressExtra") &&
          !text.trim()
        ) {
          return null;
        }
        if (b.key === "englishName" && !text.trim()) {
          return null;
        }
        const color = b.useMutedColor ? face.muted : face.text;
        const lineHeightPt = resolveBlockLineHeightPt(layout, side, b);
        return (
          <div
            key={b.key}
            className="absolute leading-tight"
            suppressHydrationWarning
            style={{
              left: layoutMm(resolveBlockLeftMm(layout, side, state, b)),
              top: layoutMm(resolveBlockTopMm(layout, side, state, b)),
              fontSize: layoutPt(b.fontSizePt),
              fontWeight: b.fontWeight ?? 400,
              lineHeight:
                lineHeightPt != null ? layoutPt(lineHeightPt) : undefined,
              whiteSpace: "pre-wrap",
              color,
              fontFamily:
                b.fontFamily === "harmony"
                  ? 'var(--font-harmony-embedded), "HarmonyOS Sans SC", "Noto Sans SC", sans-serif'
                  : b.fontFamily === "pp-right"
                    ? 'var(--font-pp-right), "PP Right Grotesk Wide Regular", sans-serif'
                    : b.fontFamily === "dm-sans"
                      ? 'var(--font-dm-sans), "DM Sans", ui-sans-serif, system-ui, sans-serif'
                      : undefined,
              maxWidth:
                b.maxWidthMm != null ? layoutMm(b.maxWidthMm) : undefined,
            }}
          >
            {text}
          </div>
        );
      })}

      {qrPos && payload && qrModules && (
        <div
          className="absolute"
          style={{
            left: `${qrPos.leftMm}mm`,
            top: `${qrPos.topMm}mm`,
            width: `${layout.qr.sizeMm}mm`,
            height: `${layout.qr.sizeMm}mm`,
            color: layout.front.text,
          }}
        >
          <QrSvgDom modules={qrModules} sizeMm={layout.qr.sizeMm} />
        </div>
      )}

      {qrPos && !payload && onQrPlaceholderClick && (
        <button
          type="button"
          className={cn(
            "absolute grid cursor-pointer place-items-center rounded-[1.6mm] border border-dashed bg-white/22 px-[1.2mm] text-center text-[4.2pt] leading-tight font-medium transition-colors hover:bg-white/36",
            subotizChrome
              ? "border-[#7700ea]/35 text-[#7700ea]/58 hover:text-[#7700ea]/72"
              : "border-black/20 text-black/42 hover:text-black/58"
          )}
          style={{
            left: `${qrPos.leftMm}mm`,
            top: `${qrPos.topMm}mm`,
            width: `${layout.qr.sizeMm}mm`,
            height: `${layout.qr.sizeMm}mm`,
            fontFamily:
              'var(--font-harmony-embedded), "HarmonyOS Sans SC", "Noto Sans SC", sans-serif',
          }}
          onClick={onQrPlaceholderClick}
        >
          上传
          <br />
          二维码
        </button>
      )}
    </>
  );
}

export const CardFacePreview = forwardRef<HTMLDivElement, Props>(
  function CardFacePreview(
    {
      state,
      side,
      qrModules,
      onQrPlaceholderClick,
      className,
      variant = "preview",
    },
    ref
  ) {
    const layout = getTemplate(state.templateId);
    const face = layout[side];

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          variant === "preview" && "rounded-sm shadow-md ring-1 ring-black/10",
          className
        )}
        style={{
          width: `${CARD_WIDTH_MM}mm`,
          height: `${CARD_HEIGHT_MM}mm`,
          backgroundColor: face.bg,
          fontFamily:
            'var(--font-harmony, "HarmonyOS Sans", "Noto Sans SC", system-ui, sans-serif)',
        }}
      >
        <FaceContent
          layout={layout}
          side={side}
          state={state}
          qrModules={qrModules}
          onQrPlaceholderClick={onQrPlaceholderClick}
        />
      </div>
    );
  }
);

CardFacePreview.displayName = "CardFacePreview";
