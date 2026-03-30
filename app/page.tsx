"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardFacePreview } from "@/components/CardFacePreview";
import {
  ADDRESS_PRESETS,
  buildAddressText,
  inferAddressPresetId,
} from "@/lib/config/addressPresets";
import {
  formatLocalPhoneForDisplay,
  formatPhoneForDisplay,
  getPhoneRegionOption,
  inferPhoneRegionAndLocalNumber,
  normalizePhoneDigits,
  PHONE_REGION_OPTIONS,
  validatePhoneForRegion,
} from "@/lib/config/phoneRegions";
import type { CardState, TemplateId } from "@/lib/types/card";
import { DEFAULT_FIELD_VALUES, defaultCardState } from "@/lib/types/card";
import { getTemplate, TEMPLATES } from "@/lib/layout/cardLayout";
import {
  loadDraft,
  saveDraft,
} from "@/lib/storage/idb";
import {
  getQrModules,
  type QrModules,
} from "@/lib/qr/generate";
import { decodeQrFromFile } from "@/lib/qr/decode";
import { labelForField } from "@/lib/i18n/fieldLabels";

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
  };
}

export default function HomePage() {
  const [state, setState] = useState<CardState>(defaultCardState);
  const [hydrated, setHydrated] = useState(false);
  const [qrModules, setQrModules] = useState<QrModules | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [manualQr, setManualQr] = useState("");
  const [exporting, setExporting] = useState(false);
  const formattedPhone = formatPhoneForDisplay(
    state.fields.phoneRegion,
    state.fields.phone || DEFAULT_FIELD_VALUES.phone
  );
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

  const layout = useMemo(() => getTemplate(state.templateId), [state.templateId]);

  const fieldKeys = useMemo(() => {
    const s = new Set([
      ...layout.frontFieldKeys,
      ...layout.backFieldKeys,
    ]);
    if (state.templateId === "A") {
      s.delete("address");
    }
    return Array.from(s);
  }, [layout, state.templateId]);

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

  const applyManualQr = () => {
    const t = manualQr.trim();
    if (!t) {
      setState((s) => ({ ...s, qr: null }));
      return;
    }
    setState((s) => ({ ...s, qr: { payload: t } }));
    setQrError(null);
  };

  const onExportPdf = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state),
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
        : "名片-RGB.pdf";

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
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        加载中…
      </div>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-50">
      <div className="mx-auto flex h-full max-w-7xl flex-col px-4 py-6">
        <header className="sticky top-0 z-20 mb-6 flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 pb-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">名片制作</h1>
            <p className="mt-1 text-sm text-slate-600">
              固定模板编辑 · 二维码上传解码后按统一尺寸重绘
            </p>
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void onExportPdf()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {exporting ? "导出中…" : "导出电子版"}
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row lg:items-stretch">
          <div className="h-full min-h-0 w-[300px] max-w-full shrink-0 space-y-6 overflow-y-auto overscroll-contain pr-1">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">模板</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => {
                const disabled = id === "B";
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={disabled}
                    onClick={() => id !== state.templateId && setTemplate(id)}
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      disabled
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : state.templateId === id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    {TEMPLATES[id].name}
                    {disabled ? "（搭建中）" : ""}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">内容</h2>
            <div className="mt-3 grid gap-3">
              {fieldKeys.map((key) => (
                <div key={key} className="min-w-0">
                  {key === "phone" ? (
                    <label className="block min-w-0 text-xs text-slate-600">
                      <span className="mb-1 block">{labelForField(key)}</span>
                      <div className="flex min-w-0 gap-2">
                        <select
                          className="w-32 shrink-0 rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                          value={state.fields.phoneRegion ?? ""}
                          onChange={(ev) =>
                            setState((s) => ({
                              ...s,
                              fields: {
                                ...s.fields,
                                phoneRegion: ev.target.value,
                              },
                            }))
                          }
                        >
                          {PHONE_REGION_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.dialCode} {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                          placeholder={formatLocalPhoneForDisplay(
                            state.fields.phoneRegion,
                            DEFAULT_FIELD_VALUES.phone
                          )}
                          value={formatLocalPhoneForDisplay(
                            state.fields.phoneRegion,
                            state.fields.phone
                          )}
                          onChange={(ev) =>
                            setState((s) => ({
                              ...s,
                              fields: {
                                ...s.fields,
                                phone: normalizePhoneDigits(ev.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formattedPhone}</p>
                      {phoneError && (
                        <p className="mt-1 text-xs text-amber-700">{phoneError}</p>
                      )}
                    </label>
                  ) : (
                    <label className="block min-w-0 text-xs text-slate-600">
                      <span className="mb-1 block">{labelForField(key)}</span>
                      <input
                        className="block w-full min-w-0 rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                        placeholder={
                          DEFAULT_FIELD_VALUES[
                            key as keyof typeof DEFAULT_FIELD_VALUES
                          ] ?? ""
                        }
                        value={state.fields[key] ?? ""}
                        onChange={(ev) =>
                          setState((s) => ({
                            ...s,
                            fields: { ...s.fields, [key]: ev.target.value },
                          }))
                        }
                      />
                    </label>
                  )}
                  {state.templateId === "A" && key === "company" && (
                    <label className="mt-3 block min-w-0 text-xs text-slate-600">
                      <span className="mb-1 block">地址地区</span>
                      <select
                        className="block w-full min-w-0 rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                        value={state.fields.addressPreset ?? ""}
                        onChange={(ev) => {
                          const addressPreset = ev.target.value;
                          setState((s) => ({
                            ...s,
                            fields: {
                              ...s.fields,
                              addressPreset,
                              address: buildAddressText(addressPreset),
                            },
                          }));
                        }}
                      >
                        {ADDRESS_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>

          {state.templateId === "B" && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Logo（可选）</h2>
              <p className="mt-1 text-xs text-slate-500">
                模板 B 反面可显示 Logo。
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="cursor-pointer rounded-md bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200">
                  上传 Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
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
                    className="text-sm text-red-600 hover:underline"
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

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">二维码</h2>
            <p className="mt-1 text-xs text-slate-500">
              上传含二维码的图片后系统会解码并生成统一尺寸的矢量码；也可手动填写链接或文本。
            </p>
            <div className="mt-3 space-y-2">
              <label className="cursor-pointer inline-block rounded-md bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200">
                上传二维码图片
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onQrFile}
                />
              </label>
              {qrError && (
                <p className="text-xs text-amber-700">{qrError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  className="min-w-[12rem] flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="手动填写二维码内容"
                  value={manualQr}
                  onChange={(e) => setManualQr(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white"
                  onClick={applyManualQr}
                >
                  应用
                </button>
                <button
                  type="button"
                  className="text-sm text-slate-600 underline"
                  onClick={() => {
                    setManualQr("");
                    setState((s) => ({ ...s, qr: null }));
                    setQrError(null);
                  }}
                >
                  清除
                </button>
              </div>
            </div>
          </section>

          </div>

          <div className="min-h-0 min-w-0 flex-1">
            <section className="sticky top-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">预览</h2>
            <p className="text-xs text-slate-500">
              尺寸 {90}×{55} mm（正面 / 反面）
            </p>
            <div className="mt-4 flex flex-col items-center gap-6">
              <div>
                <p className="mb-2 text-center text-xs text-slate-500">正面</p>
                <CardFacePreview
                  state={state}
                  side="front"
                  qrModules={qrModules}
                />
              </div>
              <div>
                <p className="mb-2 text-center text-xs text-slate-500">反面</p>
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
      </div>
    </main>
  );
}
