"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DownloadIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "@/app/studio/page.module.css";
import { CardFacePreview } from "@/components/CardFacePreview";
import { migrateLegacyCardState } from "@/lib/card/effectiveFields";
import { finalizeShoplazzaATemplateFields } from "@/lib/card/shoplazzaAddressSlots";
import {
  inferPhoneRegionAndLocalNumber,
  normalizePhoneDigits,
  PHONE_REGION_OPTIONS,
  validatePhoneForRegion,
} from "@/lib/config/phoneRegions";
import type { CardState, TemplateId } from "@/lib/types/card";
import {
  defaultCardState,
  normalizeShoplazzaCompanyStored,
  SHOPLAZZA_DEFAULT_WEBSITE,
} from "@/lib/types/card";
import { loadDraft, saveDraft } from "@/lib/storage/idb";
import { getQrModules, type QrModules } from "@/lib/qr/generate";
import { decodeQrFromFile } from "@/lib/qr/decode";
import {
  buildExportPdfFilename,
  buildExportPngFilename,
} from "@/lib/export/pdf/exportFilename";
import {
  ShoplazzaAddressPresetBlock,
  SidebarFieldRow,
} from "@/components/SidebarFieldRow";
import { ExportFormatActions } from "@/components/ExportFormatActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";

const DEBOUNCE_MS = 400;

/** 与 `page.module.css` 中底栏固定布局断点一致 */
const NARROW_EXPORT_MEDIA = "(max-width: 1024px)";

/**
 * 仅在客户端 effect 中读取 matchMedia，避免 SSR / 水合阶段触碰 window 导致异常或阻塞。
 */
function useNarrowLayoutForExport(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_EXPORT_MEDIA);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

/** 模板切换说明已确认后写入 localStorage，同浏览器仅首次再弹窗 */
const TEMPLATE_SWITCH_CONFIRM_STORAGE_KEY =
  "cardBuilder:templateSwitchConfirmSeen";

function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  ms: number
) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: T) => {
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => fn(...args), ms);
    },
    [fn, ms]
  );
}

/** 旧版单层 fields 迁移、去除头像字段、规范化电话 */
function normalizeCardState(raw: unknown): CardState {
  const migrated = migrateLegacyCardState(raw);
  const assets = { ...migrated.assets } as CardState["assets"] & {
    avatarDataUrl?: string;
  };
  delete assets.avatarDataUrl;
  const visibility = {
    name: migrated.visibility?.name !== false,
    englishName: migrated.visibility?.englishName !== false,
  };
  const normalizedPhone = migrated.shared.phoneRegion
    ? {
        phoneRegion: migrated.shared.phoneRegion,
        phone: normalizePhoneDigits(migrated.shared.phone ?? ""),
      }
    : inferPhoneRegionAndLocalNumber(migrated.shared.phone ?? "");

  const a = migrated.templateFields.A;
  const shoplazzaCompany = normalizeShoplazzaCompanyStored(a.company);
  const shoplazzaWebsite =
    a.website?.trim() || SHOPLAZZA_DEFAULT_WEBSITE;

  return {
    ...migrated,
    assets,
    visibility,
    shared: {
      ...migrated.shared,
      ...normalizedPhone,
    },
    templateFields: {
      ...migrated.templateFields,
      A: finalizeShoplazzaATemplateFields({
        ...a,
        company: shoplazzaCompany,
        website: shoplazzaWebsite,
      }),
    },
  };
}

export function CardStudioApp() {
  const [state, setState] = useState<CardState>(defaultCardState);
  /** IndexedDB 草稿已尝试加载后再自动保存，避免用默认状态覆盖本地草稿 */
  const [draftBootstrapDone, setDraftBootstrapDone] = useState(false);
  const [qrModules, setQrModules] = useState<QrModules | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [manualQr, setManualQr] = useState("");
  const [exportingRgb, setExportingRgb] = useState(false);
  const [exportingCmyk, setExportingCmyk] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const narrowLayout = useNarrowLayoutForExport();
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const frontPreviewRef = useRef<HTMLDivElement | null>(null);
  const backPreviewRef = useRef<HTMLDivElement | null>(null);
  const exportFrontRef = useRef<HTMLDivElement | null>(null);
  const exportBackRef = useRef<HTMLDivElement | null>(null);
  const isNameFieldVisible = (key: string) => state.visibility[key] !== false;
  const phoneError = validatePhoneForRegion(
    state.shared.phoneRegion,
    state.shared.phone
  );

  const persistDraft = useDebouncedCallback((next: CardState) => {
    void saveDraft(next);
  }, DEBOUNCE_MS);

  useEffect(() => {
    let cancelled = false;
    const failsafeMs = 4000;
    const failsafeId = globalThis.setTimeout(() => {
      if (!cancelled) setDraftBootstrapDone(true);
    }, failsafeMs);

    void (async () => {
      try {
        const draft = await loadDraft();
        if (!cancelled && draft) {
          const normalized = normalizeCardState(draft);
          setState(normalized);
          setManualQr(normalized.qr?.payload ?? "");
        }
      } catch (error) {
        console.error("Failed to load draft", error);
      } finally {
        globalThis.clearTimeout(failsafeId);
        if (!cancelled) setDraftBootstrapDone(true);
      }
    })();

    return () => {
      cancelled = true;
      globalThis.clearTimeout(failsafeId);
    };
  }, []);

  useEffect(() => {
    if (!draftBootstrapDone) return;
    persistDraft(state);
  }, [state, draftBootstrapDone, persistDraft]);

  useEffect(() => {
    const p = state.qr?.payload;
    if (!p) {
      setQrModules(null);
      return;
    }
    let cancelled = false;
    void getQrModules(p).then((m) => {
      if (!cancelled) setQrModules(m);
    });
    return () => {
      cancelled = true;
    };
  }, [state.qr?.payload]);

  type SidebarGroup = { title: string; keys: string[] };

  const sidebarGroups = useMemo((): SidebarGroup[] => {
    const companySectionTitle =
      state.templateId === "A" ? "公司信息" : "地址信息";
    return [
      { title: "基础信息", keys: ["name", "englishName", "title"] },
      { title: "联系方式", keys: ["phone", "email", "website"] },
      { title: companySectionTitle, keys: ["company"] },
    ];
  }, [state.templateId]);

  const setTemplate = (id: TemplateId) => {
    let skipConfirm = false;
    try {
      skipConfirm =
        window.localStorage.getItem(TEMPLATE_SWITCH_CONFIRM_STORAGE_KEY) ===
        "1";
    } catch {
      skipConfirm = false;
    }

    if (!skipConfirm) {
      const ok = window.confirm(
        "切换模板将保留姓名、电话、邮箱前缀与二维码；公司与网站信息分别保存在各模板中，互不影响。是否继续？"
      );
      if (!ok) return;
      try {
        window.localStorage.setItem(TEMPLATE_SWITCH_CONFIRM_STORAGE_KEY, "1");
      } catch {
        /* 私密模式等可忽略 */
      }
    }

    setState((s) => {
      if (id === "B") {
        return {
          ...s,
          templateId: id,
          templateFields: {
            ...s.templateFields,
            B: {
              ...s.templateFields.B,
              addressPreset:
                s.templateFields.B.addressPreset || "city-shenzhen",
            },
          },
        };
      }
      return { ...s, templateId: id };
    });
  };

  const onQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setQrError(null);
    try {
      const payload = await decodeQrFromFile(file);
      if (!payload) {
        setQrError("未能从图片中识别二维码，请换一张清晰的图，或手动填写内容。");
        return;
      }
      setState((s) => ({ ...s, qr: { payload } }));
      setManualQr(payload);
    } catch {
      setQrError("读取图片失败。");
    }
  };

  const openQrPicker = useCallback(() => {
    qrFileInputRef.current?.click();
  }, []);

  const applyManualQr = () => {
    const t = manualQr.trim();
    if (!t) {
      setState((s) => ({ ...s, qr: null }));
      return;
    }
    setState((s) => ({ ...s, qr: { payload: t } }));
    setQrError(null);
  };

  const onExportPdf = async (colorSpace: "rgb" | "cmyk") => {
    const setExporting =
      colorSpace === "cmyk" ? setExportingCmyk : setExportingRgb;
    setExporting(true);
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...state, colorSpace }),
      });

      if (!response.ok) {
        let message = "导出电子版失败，请重试。";
        const contentType = response.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) {
            message = `导出电子版失败：${payload.error}`;
          }
        } else {
          const text = await response.text();
          if (text.trim()) {
            message = `导出电子版失败：${text.trim()}`;
          }
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") ?? "";
      const matched = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
      const filename = matched?.[1]
        ? decodeURIComponent(matched[1])
        : buildExportPdfFilename(state, colorSpace);

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportMenuOpen(false);
    } catch (error) {
      console.error("Failed to export PDF", error);
      window.alert(
        error instanceof Error ? error.message : "导出电子版失败，请重试。"
      );
    } finally {
      setExporting(false);
    }
  };

  const onExportPng = useCallback(async () => {
    const front = exportFrontRef.current ?? frontPreviewRef.current;
    const back = exportBackRef.current ?? backPreviewRef.current;
    setExportingPng(true);
    try {
      if (!front || !back) {
        throw new Error("预览未就绪，请稍后重试。");
      }
      const { compositePreviewFacesToPngBlob } = await import(
        "@/lib/export/png/compositePreviewPng"
      );
      const blob = await compositePreviewFacesToPngBlob(front, back, {
        gapPx: 0,
        outputWidthPx: 1920,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildExportPngFilename(state);
      anchor.click();
      URL.revokeObjectURL(url);
      setExportMenuOpen(false);
    } catch (error) {
      console.error("Failed to export PNG", error);
      window.alert(
        error instanceof Error ? error.message : "导出 PNG 失败，请重试。"
      );
    } finally {
      setExportingPng(false);
    }
  }, [state]);

  return (
    <main className={styles.page} id="top">
      <div className={styles.shell}>
        <div aria-hidden="true" className={styles.pageGuides}>
          <span className={styles.pageGuideLineLeft} />
          <span className={styles.pageGuideLineRight} />
        </div>
        <section className={styles.hero}>
          <div className={styles.heroHeader}>
            <span aria-hidden="true" className={styles.heroGuideLineLeft} />
            <span aria-hidden="true" className={styles.heroGuideLineRight} />
            <span aria-hidden="true" className={styles.heroGuideNodeLeft} />
            <span aria-hidden="true" className={styles.heroGuideNodeRight} />
            <Link
              href="/#welcome"
              className={styles.brandLink}
              prefetch={false}
              aria-label="返回欢迎页"
            >
              <Image
                src="/design/logo-red.svg"
                alt="Shoplazza"
                width={127}
                height={30}
                className={styles.brandLogo}
                priority
              />
              <span className={styles.brandText}>Card Builder</span>
            </Link>

            <div className={styles.heroCenter}>
              <div className={styles.templateSwitch} aria-label="模板切换">
                <span
                  aria-hidden
                  className={cn(
                    styles.templateSwitchThumb,
                    state.templateId === "A"
                      ? styles.templateSwitchThumbShoplazza
                      : styles.templateSwitchThumbSubotiz
                  )}
                />
                {(["A", "B"] as TemplateId[]).map((id) => {
                  const active = state.templateId === id;
                  const label = id === "A" ? "Shoplazza" : "Subotiz";
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (id !== state.templateId) {
                          setTemplate(id);
                        }
                      }}
                      className={cn(
                        styles.templateSwitchButton,
                        active && styles.templateSwitchButtonOnThumb
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.heroActions}>
              <button
                type="button"
                disabled={exportingRgb || exportingCmyk || exportingPng}
                onClick={() => setExportMenuOpen(true)}
                className={cn(
                  styles.buttonBase,
                  styles.primaryButton,
                  (exportingRgb || exportingCmyk || exportingPng) &&
                    styles.buttonDisabled
                )}
              >
                <DownloadIcon />
                {exportingRgb || exportingCmyk || exportingPng
                  ? "导出中…"
                  : "导出"}
              </button>
            </div>
          </div>
        </section>

        <div className={styles.contentArea}>
          <aside className={styles.sidebar}>
            <section className={styles.surfaceCard} id="content" aria-label="内容">
              <div className={styles.fieldStack}>
                {sidebarGroups.map((group) => (
                  <div key={group.title} className={styles.fieldGroup}>
                    <div className={styles.fieldGroupFields}>
                      {group.keys.map((key) => (
                        <div key={key} className={styles.fieldBlock}>
                          <SidebarFieldRow
                            fieldKey={key}
                            state={state}
                            setState={setState}
                            phoneError={phoneError}
                            isNameFieldVisible={isNameFieldVisible}
                          />
                        </div>
                      ))}
                      {state.templateId === "A" && group.title === "公司信息" && (
                        <>
                          <div className={styles.fieldBlock}>
                            <ShoplazzaAddressPresetBlock state={state} setState={setState} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.surfaceCard} id="qr" aria-label="二维码">
              <div className={styles.fieldStack}>
                <div className={cn(styles.uploadRow, styles.qrUploadToolbar)}>
                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={onQrFile}
                  />
                  <button
                    type="button"
                    className={cn(styles.buttonBase, styles.qrUploadPillButton)}
                    onClick={openQrPicker}
                  >
                    <Upload aria-hidden />
                    上传二维码
                  </button>
                  <button
                    type="button"
                    className={cn(styles.buttonBase, styles.qrClearOutlineButton)}
                    onClick={() => {
                      setManualQr("");
                      setState((s) => ({ ...s, qr: null }));
                      setQrError(null);
                    }}
                  >
                    清除
                  </button>
                </div>

                {qrError && (
                  <p className={cn(styles.helperText, styles.errorText)}>
                    {qrError}
                  </p>
                )}

                <div className={styles.fieldBlock}>
                  <div className={cn(styles.controlShell, styles.qrManualShell)}>
                    <textarea
                      className={styles.qrManualTextarea}
                      rows={5}
                      aria-label="二维码内容"
                      placeholder="输入链接地址或任意文本"
                      value={manualQr}
                      onChange={(e) => setManualQr(e.target.value)}
                    />
                    <button
                      type="button"
                      className={cn(styles.buttonBase, styles.qrApplyPillButton)}
                      onClick={applyManualQr}
                    >
                      应用
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </aside>

          <div className={styles.previewColumn}>
            <section className={styles.previewPanel} id="preview">
              <div className={styles.previewHeader}>
                <div className={styles.previewTitleWrap}>
                  <h2 className={styles.sectionTitle}>实时预览</h2>
                </div>
                <span className={styles.previewMetaText}>名片尺寸 90 × 55 mm</span>
              </div>

              <div className={styles.previewFaces}>
                <div className={styles.previewFaceBlock}>
                  <CardFacePreview
                    ref={frontPreviewRef}
                    state={state}
                    side="front"
                    qrModules={qrModules}
                    onQrPlaceholderClick={openQrPicker}
                  />
                </div>

                <div className={styles.previewFaceBlock}>
                  <CardFacePreview
                    ref={backPreviewRef}
                    state={state}
                    side="back"
                    qrModules={qrModules}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div
          className="pointer-events-none fixed top-0 left-[-10000px] z-0 flex flex-col gap-0"
          aria-hidden
        >
          <CardFacePreview
            ref={exportFrontRef}
            variant="export"
            state={state}
            side="front"
            qrModules={qrModules}
          />
          <CardFacePreview
            ref={exportBackRef}
            variant="export"
            state={state}
            side="back"
            qrModules={qrModules}
          />
        </div>

        <Dialog
          open={exportMenuOpen && !narrowLayout}
          onOpenChange={(open) => {
            if (!open) setExportMenuOpen(false);
          }}
        >
          <DialogPopup>
            <DialogHeader>
              <DialogTitle>选择导出格式</DialogTitle>
              <DialogDescription>
                下载电子版或印刷版文件；PNG 为与预览一致的屏幕色彩图片（正反面纵向拼接）。
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-2">
              <ExportFormatActions
                exportingRgb={exportingRgb}
                exportingPng={exportingPng}
                exportingCmyk={exportingCmyk}
                onRgbPdf={() => void onExportPdf("rgb")}
                onPng={() => void onExportPng()}
                onCmykPdf={() => void onExportPdf("cmyk")}
              />
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>
                取消
              </DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>

        <Drawer
          open={exportMenuOpen && narrowLayout}
          onOpenChange={(open) => {
            if (!open) setExportMenuOpen(false);
          }}
        >
          <DrawerPopup showBar>
            <DrawerHeader className="text-center">
              <DrawerTitle>选择导出格式</DrawerTitle>
              <DrawerDescription>
                下载电子版或印刷版文件；PNG 为与预览一致的屏幕色彩图片（正反面纵向拼接）。
              </DrawerDescription>
            </DrawerHeader>
            <DrawerPanel className="flex flex-col gap-2 px-6 pb-2">
              <ExportFormatActions
                exportingRgb={exportingRgb}
                exportingPng={exportingPng}
                exportingCmyk={exportingCmyk}
                onRgbPdf={() => void onExportPdf("rgb")}
                onPng={() => void onExportPng()}
                onCmykPdf={() => void onExportPdf("cmyk")}
              />
            </DrawerPanel>
            <DrawerFooter
              className="justify-center sm:justify-center"
              variant="bare"
            >
              <DrawerClose render={<Button variant="outline" />}>
                关闭
              </DrawerClose>
            </DrawerFooter>
          </DrawerPopup>
        </Drawer>
      </div>
    </main>
  );
}
