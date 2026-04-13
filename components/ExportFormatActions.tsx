"use client";

import { Button } from "@/components/ui/button";

export type ExportFormatActionsProps = {
  onRgbPdf: () => void | Promise<void>;
  onPng: () => void | Promise<void>;
  onCmykPdf: () => void | Promise<void>;
  exportingRgb: boolean;
  exportingPng: boolean;
  exportingCmyk: boolean;
};

export function ExportFormatActions({
  onRgbPdf,
  onPng,
  onCmykPdf,
  exportingRgb,
  exportingPng,
  exportingCmyk,
}: ExportFormatActionsProps): JSX.Element {
  const busy = exportingRgb || exportingPng || exportingCmyk;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <Button
        type="button"
        variant="default"
        className="w-full"
        loading={exportingRgb}
        disabled={busy && !exportingRgb}
        onClick={() => void onRgbPdf()}
      >
        电子版 PDF 文件
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={exportingPng}
        disabled={busy && !exportingPng}
        onClick={() => void onPng()}
      >
        电子版 PNG 图片
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={exportingCmyk}
        disabled={busy && !exportingCmyk}
        onClick={() => void onCmykPdf()}
      >
        印刷版 PDF 文件
      </Button>
    </div>
  );
}
