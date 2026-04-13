"use client";

/**
 * `html-to-image` 内部 `img.onerror = reject` 会把 DOM Event / ErrorEvent 传入 reject，
 * 上层若当作 Error 展示会变成 “[object Event]”。
 */
function asRasterFailure(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === "object" && reason !== null) {
    const m = (reason as { message?: string }).message;
    if (typeof m === "string" && m.trim() !== "") {
      return new Error(m);
    }
  }
  return new Error(
    "页面转为图片失败，常见于字体或图片资源。请稍后重试，或换用 PDF 导出。"
  );
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片解码失败"));
    img.src = dataUrl;
  });
}

export type CompositePreviewPngOptions = {
  pixelRatio?: number;
  /** 正背面之间的空白像素，默认 0 无缝拼接 */
  gapPx?: number;
  /** 输出图宽度（像素），高度按比例；默认 1920 */
  outputWidthPx?: number;
};

/**
 * 将两张名片预览 DOM 栅格化为纵向拼接的单张 PNG（正面上、背面下），再缩放到目标宽度。
 */
export async function compositePreviewFacesToPngBlob(
  frontEl: HTMLElement,
  backEl: HTMLElement,
  options: CompositePreviewPngOptions = {}
): Promise<Blob> {
  const { toPng } = await import("html-to-image");

  const pixelRatio = options.pixelRatio ?? 3;
  const gapPx = options.gapPx ?? 0;
  const outputWidthPx = options.outputWidthPx ?? 1920;

  const captureOpts = { pixelRatio, cacheBust: true as const };

  const capture = async (el: HTMLElement) => {
    try {
      return await toPng(el, captureOpts);
    } catch (e) {
      throw asRasterFailure(e);
    }
  };

  const [frontDataUrl, backDataUrl] = await Promise.all([
    capture(frontEl),
    capture(backEl),
  ]);

  const [frontImg, backImg] = await Promise.all([
    loadImage(frontDataUrl),
    loadImage(backDataUrl),
  ]);

  const w = Math.max(frontImg.naturalWidth, backImg.naturalWidth);
  const h = frontImg.naturalHeight + gapPx + backImg.naturalHeight;
  if (w < 1 || h < 1) {
    throw new Error("捕获尺寸异常，请重试导出。");
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("无法创建画布上下文");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  const xFront = (w - frontImg.naturalWidth) / 2;
  const xBack = (w - backImg.naturalWidth) / 2;
  ctx.drawImage(frontImg, xFront, 0);
  ctx.drawImage(backImg, xBack, frontImg.naturalHeight + gapPx);

  const outW = outputWidthPx;
  const outH = Math.max(1, Math.round((h * outW) / w));

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const octx = outCanvas.getContext("2d");
  if (!octx) {
    throw new Error("无法创建输出画布");
  }
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(canvas, 0, 0, w, h, 0, 0, outW, outH);

  return await new Promise((resolve, reject) => {
    outCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 编码失败"));
    }, "image/png");
  });
}
