"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DownloadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";
import { CardFacePreview } from "@/components/CardFacePreview";
import {
  ADDRESS_PRESETS,
  buildAddressText,
  inferAddressPresetId,
} from "@/lib/config/addressPresets";
import {
  getPhoneRegionOption,
  inferPhoneRegionAndLocalNumber,
  normalizePhoneDigits,
  PHONE_REGION_OPTIONS,
  validatePhoneForRegion,
} from "@/lib/config/phoneRegions";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CardState, TemplateId } from "@/lib/types/card";
import { DEFAULT_FIELD_VALUES, defaultCardState } from "@/lib/types/card";
import { loadDraft, saveDraft } from "@/lib/storage/idb";
import { getQrModules, type QrModules } from "@/lib/qr/generate";
import { decodeQrFromFile } from "@/lib/qr/decode";
import { buildExportPdfFilename } from "@/lib/export/pdf/exportFilename";
import {
  ShoplazzaAddressPresetBlock,
  SidebarFieldRow,
} from "@/components/SidebarFieldRow";

const DEBOUNCE_MS = 400;

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** 去除旧版草稿里的头像字段，避免占位存储 */
function normalizeCardState(raw: CardState): CardState {
  const assets = { ...raw.assets } as CardState["assets"] & {
    avatarDataUrl?: string;
  };
  delete assets.avatarDataUrl;
  const visibility = {
    name: raw.visibility?.name !== false,
    englishName: raw.visibility?.englishName !== false,
  };
  const locks = {
    company: raw.locks?.company !== false,
  };
  const addressPreset = raw.fields.addressPreset || inferAddressPresetId(raw.fields.address);
  const normalizedPhone = raw.fields.phoneRegion
    ? {
        phoneRegion: raw.fields.phoneRegion,
        phone: normalizePhoneDigits(raw.fields.phone ?? ""),
      }
    : inferPhoneRegionAndLocalNumber(raw.fields.phone ?? "");
  return {
    ...raw,
    assets,
    fields: {
      ...raw.fields,
      company: raw.fields.company || "深圳店匠科技有限公司",
      addressPreset,
      address: buildAddressText(addressPreset),
      phoneRegion: normalizedPhone.phoneRegion,
      phone: normalizedPhone.phone,
    },
    visibility,
    locks,
  };
}

export default function HomePage() {
  const [state, setState] = useState<CardState>(defaultCardState);
  const [hydrated, setHydrated] = useState(false);
  const [qrModules, setQrModules] = useState<QrModules | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [manualQr, setManualQr] = useState("");
  const [exportingRgb, setExportingRgb] = useState(false);
  const [exportingCmyk, setExportingCmyk] = useState(false);
  const [subotizDialogOpen, setSubotizDialogOpen] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedPhoneRegion = getPhoneRegionOption(state.fields.phoneRegion);
  const isNameFieldVisible = (key: string) => state.visibility[key] !== false;
  const phoneError = validatePhoneForRegion(
    state.fields.phoneRegion,
    state.fields.phone
  );

  const persistDraft = useDebouncedCallback((next: CardState) => {
    void saveDraft(next);
  }, DEBOUNCE_MS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistDraft(state);
  }, [state, hydrated, persistDraft]);

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
    if (state.templateId === "A") {
      return [
        { title: "基础信息", keys: ["name", "englishName", "title"] },
        { title: "联系方式", keys: ["phone", "email", "website"] },
        { title: "公司信息", keys: ["company"] },
      ];
    }
    return [
      { title: "基础信息", keys: ["name", "title", "department"] },
      { title: "联系方式", keys: ["phone", "email"] },
      { title: "公司信息", keys: ["company", "address", "addressExtra", "wechat"] },
    ];
  }, [state.templateId]);

  const setTemplate = (id: TemplateId) => {
    const ok = window.confirm(
      "切换模板将保留已填内容中字段名一致的部分，其余字段可在表单中继续编辑。是否继续？"
    );
    if (!ok) return;
    const next = defaultCardState();
    next.templateId = id;
    const merged = { ...next.fields, ...state.fields };
    next.fields = merged;
    if (id === "A") {
      const addressPreset =
        merged.addressPreset || inferAddressPresetId(merged.address);
      next.fields.addressPreset = addressPreset;
      next.fields.address = buildAddressText(addressPreset);
      next.fields.company = merged.company || "深圳店匠科技有限公司";
    }
    next.assets = { ...state.assets };
    next.visibility = { ...state.visibility };
    next.locks = { ...state.locks };
    next.qr = state.qr;
    setState(next);
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
    } catch (error) {
      console.error("Failed to export PDF", error);
      window.alert(
        error instanceof Error ? error.message : "导出电子版失败，请重试。"
      );
    } finally {
      setExporting(false);
    }
  };

  if (!hydrated) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingShell}>
          <div className={styles.loadingCard}>加载中…</div>
        </div>
      </main>
    );
  }

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
            <a href="#top" className={styles.brandLink}>
              <Image
                src="/design/logo-red.svg"
                alt="Shoplazza"
                width={127}
                height={30}
                className={styles.brandLogo}
                priority
              />
              <span className={styles.brandText}>Card Builder</span>
            </a>

            <div className={styles.heroCenter}>
              <div className={styles.templateSwitch} aria-label="模板切换">
                {(["A", "B"] as TemplateId[]).map((id) => {
                  const active = state.templateId === id;
                  const label = id === "A" ? "Shoplazza" : "Subotiz";
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (id === "B") {
                          setSubotizDialogOpen(true);
                          return;
                        }
                        if (id !== state.templateId) {
                          setTemplate(id);
                        }
                      }}
                      className={cn(
                        styles.templateSwitchButton,
                        active &&
                          (id === "A"
                            ? styles.templateSwitchButtonShoplazzaActive
                            : styles.templateSwitchButtonSubotizActive)
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
                disabled={exportingRgb}
                onClick={() => void onExportPdf("rgb")}
                className={cn(
                  styles.buttonBase,
                  styles.primaryButton,
                  exportingRgb && styles.buttonDisabled
                )}
              >
                <DownloadIcon />
                {exportingRgb ? "导出中…" : "导出电子版"}
              </button>
              <button
                type="button"
                disabled={exportingCmyk}
                onClick={() => void onExportPdf("cmyk")}
                className={cn(
                  styles.buttonBase,
                  styles.secondaryButton,
                  exportingCmyk && styles.buttonDisabled
                )}
              >
                <DownloadIcon />
                {exportingCmyk ? "导出中…" : "导出印刷 PDF (CMYK)"}
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
                            selectedPhoneRegion={selectedPhoneRegion}
                            isNameFieldVisible={isNameFieldVisible}
                          />
                        </div>
                      ))}
                      {state.templateId === "A" && group.title === "公司信息" && (
                        <>
                          <div className={styles.fieldBlock}>
                            <ShoplazzaAddressPresetBlock state={state} setState={setState} />
                          </div>
                          {state.fields.addressPreset === "none" && (
                            <div className={styles.fieldBlock}>
                              <SidebarFieldRow
                                fieldKey="addressExtra"
                                state={state}
                                setState={setState}
                                phoneError={phoneError}
                                selectedPhoneRegion={selectedPhoneRegion}
                                isNameFieldVisible={isNameFieldVisible}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {state.templateId === "B" && (
              <section className={styles.surfaceCard}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleWrap}>
                    <h2 className={styles.sectionTitle}>Logo</h2>
                  </div>
                </div>

                <div className={styles.uploadRow}>
                  <label
                    className={cn(
                      styles.buttonBase,
                      styles.secondaryButton,
                      styles.uploadButton
                    )}
                  >
                    上传 Logo
                    <input
                      type="file"
                      accept="image/*"
                      className={styles.hiddenInput}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        const url = await fileToDataUrl(f);
                        setState((s) => ({
                          ...s,
                          assets: { ...s.assets, logoDataUrl: url },
                        }));
                      }}
                    />
                  </label>
                  {state.assets.logoDataUrl && (
                    <button
                      type="button"
                      className={cn(styles.buttonBase, styles.linkButton)}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          assets: { ...s.assets, logoDataUrl: undefined },
                        }))
                      }
                    >
                      清除 Logo
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className={styles.surfaceCard} id="qr" aria-label="二维码">
              <div className={styles.fieldStack}>
                <div className={styles.uploadRow}>
                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={onQrFile}
                  />
                  <button
                    type="button"
                    className={cn(styles.buttonBase, styles.secondaryButton)}
                    onClick={openQrPicker}
                  >
                    上传二维码图片
                  </button>
                  <button
                    type="button"
                    className={cn(styles.buttonBase, styles.linkButton)}
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
                  <div className={styles.controlShell}>
                    <input
                      className={styles.control}
                      aria-label="二维码内容"
                      placeholder="输入链接、名片地址或任意文本"
                      value={manualQr}
                      onChange={(e) => setManualQr(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.qrActionRow}>
                  <button
                    type="button"
                    className={cn(styles.buttonBase, styles.primaryButton)}
                    onClick={applyManualQr}
                  >
                    应用内容
                  </button>
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
                    state={state}
                    side="front"
                    qrModules={qrModules}
                    onQrPlaceholderClick={openQrPicker}
                  />
                </div>

                <div className={styles.previewFaceBlock}>
                  <CardFacePreview
                    state={state}
                    side="back"
                    qrModules={qrModules}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <Dialog open={subotizDialogOpen} onOpenChange={setSubotizDialogOpen}>
          <DialogPopup className={styles.noticeDialog}>
            <DialogHeader>
              <DialogTitle>模板搭建中...</DialogTitle>
              <DialogDescription>
                Subotiz 模板暂未开放，完成后会在这里提供切换。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter variant="bare" className={styles.noticeDialogFooter}>
              <button
                type="button"
                className={cn(styles.buttonBase, styles.primaryButton)}
                onClick={() => setSubotizDialogOpen(false)}
              >
                知道了
              </button>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
      </div>
    </main>
  );
}
