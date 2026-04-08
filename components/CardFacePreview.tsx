"use client";

import type { CardState } from "@/lib/types/card";
import {
  BACK_LOGO_BOUNDS_MM,
  FRONT_LOGO_BOUNDS_MM,
  SHOPLAZZA_BACK_LOGO,
  SHOPLAZZA_FRONT_LOGO,
} from "@/lib/brand/shoplazza";
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

type Props = {
  state: CardState;
  side: "front" | "back";
  qrModules: QrModules | null;
  onQrPlaceholderClick?: () => void;
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

  return (
    <>
      {state.templateId === "B" && side === "front" && (
        <div
          className="absolute left-0 top-0 h-[3mm] w-full"
          style={{ backgroundColor: "#334155" }}
        />
      )}

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

      {face.blocks.map((b) => {
        const text = resolveFieldDisplayValue(state, b.key);
        const color = b.useMutedColor ? face.muted : face.text;
        return (
          <div
            key={b.key}
            className="absolute leading-tight"
            style={{
              left: `${resolveBlockLeftMm(layout, side, state, b)}mm`,
              top: `${resolveBlockTopMm(layout, side, state, b)}mm`,
              fontSize: `${b.fontSizePt}pt`,
              fontWeight: b.fontWeight ?? 400,
              lineHeight:
                resolveBlockLineHeightPt(layout, side, b) != null
                  ? `${resolveBlockLineHeightPt(layout, side, b)}pt`
                  : undefined,
              whiteSpace: "pre-wrap",
              color,
              fontFamily:
                b.fontFamily === "harmony"
                  ? 'var(--font-harmony-embedded), "HarmonyOS Sans SC", "Noto Sans SC", sans-serif'
                  : b.fontFamily === "pp-right"
                    ? 'var(--font-pp-right), "PP Right Grotesk Wide Regular", sans-serif'
                    : undefined,
              maxWidth: b.maxWidthMm != null ? `${b.maxWidthMm}mm` : undefined,
            }}
          >
            {text}
          </div>
        );
      })}

      {side === "back" &&
        state.assets.logoDataUrl &&
        state.templateId === "B" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.assets.logoDataUrl}
            alt=""
            className="absolute object-contain"
            style={{
              left: "8mm",
              top: "8mm",
              width: "28mm",
              height: "10mm",
            }}
          />
        )}

      {qrPos && payload && qrModules && (
        <div
          className="absolute text-black"
          style={{
            left: `${qrPos.leftMm}mm`,
            top: `${qrPos.topMm}mm`,
            width: `${layout.qr.sizeMm}mm`,
            height: `${layout.qr.sizeMm}mm`,
          }}
        >
          <QrSvgDom modules={qrModules} sizeMm={layout.qr.sizeMm} />
        </div>
      )}

      {qrPos && !payload && onQrPlaceholderClick && (
        <button
          type="button"
          className="absolute grid place-items-center rounded-[1.6mm] border border-dashed border-black/20 bg-white/22 px-[1.2mm] text-center text-[4.2pt] leading-tight font-medium text-black/42 transition-colors hover:bg-white/36 hover:text-black/58"
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

export function CardFacePreview({
  state,
  side,
  qrModules,
  onQrPlaceholderClick,
}: Props) {
  const layout = getTemplate(state.templateId);
  const face = layout[side];

  return (
    <div
      className="relative overflow-hidden rounded-sm shadow-md ring-1 ring-black/10"
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
