import QRCode from "qrcode";

export type QrModules = {
  size: number;
  /** [y][x] 是否深色模块 */
  cells: boolean[][];
};

/**
 * 生成二维码模块矩阵，用于矢量绘制（预览 SVG / PDF Rect）。
 */
export async function getQrModules(
  payload: string,
  errorCorrectionLevel: "L" | "M" | "Q" | "H" = "H"
): Promise<QrModules> {
  const qr = await QRCode.create(payload, { errorCorrectionLevel });
  const size = qr.modules.size;
  const cells: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    cells[y] = [];
    for (let x = 0; x < size; x++) {
      cells[y][x] = Boolean(qr.modules.get(x, y));
    }
  }
  return { size, cells };
}
