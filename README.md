# Card Builder Project

A Next.js-based business card builder for editing fixed card templates, previewing both sides, decoding QR codes, and exporting vector PDF files.

## Current Status

- Current release: `v1.0.0`
- Active editable template: `Shoplazza 名片` (`Template A`)
- `Template B` exists in code but is still disabled in the UI

## Features

- Edit core business card fields in a fixed-layout form
- Preview front and back card faces in the browser
- Upload a QR code image, decode it, and redraw it at a normalized vector size
- Manually input QR payload text or links
- Export a two-page vector PDF from the server (RGB for screen, or **DeviceCMYK** for print)
- Persist draft state in IndexedDB
- Support multi-region phone formatting and validation
- Support address presets for the Shoplazza template

## Tech Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- PDFKit
- `idb`
- `qrcode`
- `jsqr`

## 交付给同事

源码包与安装说明在 **`delivery/`** 目录：将其中最新的 `card-studio-v*-source.zip` 与 `delivery/README.md` 一并提供即可。需要重新生成 zip 时，在仓库根目录执行：

```bash
bash scripts/package-delivery.sh
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run lint:

```bash
npm run lint
```

## Project Structure

```text
app/                    Next.js app router entrypoints
app/api/export/pdf/     Server-side PDF export route
components/             UI preview components
lib/config/             Address and phone configuration
lib/export/pdf/         PDF rendering pipeline
lib/layout/             Template definitions and positioning logic
lib/qr/                 QR generation and decoding helpers
lib/storage/            IndexedDB draft/history storage
lib/types/              Shared application types
public/design/          Static SVG design assets
public/fonts/           Embedded font assets
```

## Versioning

The project uses semantic version tags in Git:

- `v1.0.0` for the current initial deliverable
- patch releases for fixes, e.g. `v1.0.1`
- minor releases for backward-compatible features, e.g. `v1.1.0`
- major releases for breaking changes, e.g. `v2.0.0`

The release version should stay aligned across:

- Git tag
- `package.json` version
- `CHANGELOG.md`

## Notes

- **CMYK PDF**: Choose「导出印刷 PDF (CMYK)」in the UI, or POST `/api/export/pdf` with JSON body `{ ..., "colorSpace": "cmyk" }`. Template A (Shoplazza) uses press-specified CMYK values in code; Template B uses CMYK converted from the on-screen hex until separate ink values are provided.
- **Shoplazza SVG logos** are rendered via `svg-to-pdfkit` and may remain **DeviceRGB** inside the PDF even when the rest of the page uses DeviceCMYK; embedded user images (Template B) are also typically RGB. Adjust in prepress if your printer requires all assets in CMYK.
- The repository ignores local build output and dependencies by default
