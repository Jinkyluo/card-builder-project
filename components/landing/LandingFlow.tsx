"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpIcon, DownloadIcon, HelpCircleIcon, XIcon } from "lucide-react";
import { CardFacePreview } from "@/components/CardFacePreview";
import { QrSvgDom } from "@/components/QrSvgDom";
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
import { ExportFormatActions } from "@/components/ExportFormatActions";
import { decodeQrFromFile } from "@/lib/qr/decode";
import { getQrModules, type QrModules } from "@/lib/qr/generate";
import {
  addHistory,
  listHistory,
  newHistoryId,
  saveDraft,
  type HistoryEntry,
} from "@/lib/storage/idb";
import type { CardState, TemplateId } from "@/lib/types/card";
import { defaultCardState } from "@/lib/types/card";
import {
  applyLandingDoneTemplateSwitch,
  buildCardStateFromLandingInput,
  landingGenerateBlockedReason,
} from "@/lib/landing/parsePersonalPaste";
import {
  buildExportPdfFilename,
  buildExportPngFilename,
} from "@/lib/export/pdf/exportFilename";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import studio from "@/app/studio/page.module.css";
import styles from "./landing.module.css";

const NARROW_EXPORT_MEDIA = "(max-width: 1024px)";

function historyEntryTemplateLabel(templateId: TemplateId): "Shoplazza" | "Subotiz" {
  return templateId === "A" ? "Shoplazza" : "Subotiz";
}

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

type Phase = "welcome" | "transition" | "done";

function miniState(id: TemplateId): CardState {
  return { ...defaultCardState(), templateId: id };
}

/** 斜条 glare 0–100% → translate 分量，限制在 [-50%, 0%]（50→-25% 为初始居中） */
function doneCardGlareTranslatePct(pct: number): number {
  return Math.max(-50, Math.min(0, -0.5 * pct));
}

export function LandingFlow(): JSX.Element {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("A");
  const [pasteText, setPasteText] = useState("");
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [welcomeQrModules, setWelcomeQrModules] = useState<QrModules | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [doneState, setDoneState] = useState<CardState | null>(null);
  const [doneQrModules, setDoneQrModules] = useState<QrModules | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });
  const reducedMotionRef = useRef(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<HistoryEntry[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingRgb, setExportingRgb] = useState(false);
  const [exportingCmyk, setExportingCmyk] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const narrowLayout = useNarrowLayoutForExport();
  const qrInputRef = useRef<HTMLInputElement>(null);
  const frontFaceRef = useRef<HTMLDivElement>(null);
  const backFaceRef = useRef<HTMLDivElement>(null);
  const frontPreviewRef = useRef<HTMLDivElement>(null);
  const exportFrontRef = useRef<HTMLDivElement>(null);
  const exportBackRef = useRef<HTMLDivElement>(null);
  const pushedDoneRef = useRef(false);
  const transitionCardRef = useRef<HTMLDivElement>(null);
  /** 完成页仅切换模板时的过渡：结束后不写历史记录 */
  const landingTransitionSkipHistoryRef = useRef(false);

  /** 完成页仍在 `/` 时，仅点 `/#welcome` 不会让 App Router 卸载本组件，phase 会一直是 done；需显式回到欢迎 */
  const goToWelcome = useCallback(() => {
    setPhase("welcome");
    setDoneState(null);
    setFlipped(false);
    setTilt({ rx: 0, ry: 0 });
    setGlare({ x: 50, y: 50 });
    pushedDoneRef.current = false;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/#welcome");
    }
    void router.replace("/#welcome");
  }, [router]);

  const shopMini = useMemo(() => miniState("A"), []);
  const subMini = useMemo(() => miniState("B"), []);

  useEffect(() => {
    if (!qrPayload) {
      setWelcomeQrModules(null);
      return;
    }
    let c = false;
    void getQrModules(qrPayload).then((m) => {
      if (!c) setWelcomeQrModules(m);
    });
    return () => {
      c = true;
    };
  }, [qrPayload]);

  useEffect(() => {
    const p = doneState?.qr?.payload;
    if (!p) {
      setDoneQrModules(null);
      return;
    }
    let c = false;
    void getQrModules(p).then((m) => {
      if (!c) setDoneQrModules(m);
    });
    return () => {
      c = true;
    };
  }, [doneState?.qr?.payload]);

  useEffect(() => {
    const onPop = () => {
      setPhase((ph) => (ph === "done" ? "welcome" : ph));
      setFlipped(false);
      setTilt({ rx: 0, ry: 0 });
      setGlare({ x: 50, y: 50 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (phase === "done" && !pushedDoneRef.current) {
      pushedDoneRef.current = true;
      window.history.pushState({ cardLanding: "done" }, "");
    }
    if (phase !== "done") {
      pushedDoneRef.current = false;
    }
  }, [phase]);

  const onQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const payload = await decodeQrFromFile(file);
      if (!payload) {
        setGenerateError("未能识别二维码，请换一张清晰的图片。");
        return;
      }
      setQrPayload(payload);
      setGenerateError(null);
    } catch {
      setGenerateError("读取图片失败。");
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    try {
      setHistoryRows(await listHistory());
    } catch {
      setHistoryRows([]);
    }
  };

  const applyHistoryToWelcome = (row: HistoryEntry) => {
    setPasteText(row.pasteRaw ?? "");
    setSelectedTemplate(row.state.templateId);
    setQrPayload(row.state.qr?.payload ?? null);
    setHistoryOpen(false);
    setGenerateError(null);
  };

  const openHistoryInStudio = async (row: HistoryEntry) => {
    await saveDraft(row.state);
    setHistoryOpen(false);
    router.push("/studio");
  };

  const runGenerate = () => {
    setGenerateError(null);
    const block = landingGenerateBlockedReason({
      pasteRaw: pasteText,
      templateId: selectedTemplate,
      hasQr: Boolean(qrPayload),
    });
    if (block) {
      setGenerateError(block);
      return;
    }
    if (!qrPayload) return;
    landingTransitionSkipHistoryRef.current = false;
    const next = buildCardStateFromLandingInput({
      templateId: selectedTemplate,
      pasteRaw: pasteText,
      qrPayload,
    });
    void saveDraft(next);
    setDoneState(next);
    setPhase("transition");
  };

  const onDonePageTemplateSwitch = (id: TemplateId) => {
    if (phase !== "done" || !doneState || id === doneState.templateId) return;
    landingTransitionSkipHistoryRef.current = true;
    setSelectedTemplate(id);
    setFlipped(false);
    setPhase("transition");
  };

  useEffect(() => {
    if (phase !== "transition" || !doneState) return;
    const el = transitionCardRef.current;
    const minMs = 900;
    const start = Date.now();
    let cancelled = false;
    let committed = false;

    const finish = () => {
      if (cancelled || committed) return;
      committed = true;
      void (async () => {
        if (doneState) {
          const merged = applyLandingDoneTemplateSwitch(
            doneState,
            selectedTemplate,
          );
          setDoneState(merged);
          setSelectedTemplate(merged.templateId);
          await saveDraft(merged);
          if (!landingTransitionSkipHistoryRef.current) {
            await addHistory({
              id: newHistoryId(),
              createdAt: Date.now(),
              label: merged.shared.name.trim() || "未命名名片",
              state: merged,
              pasteRaw: pasteText,
            });
          }
          landingTransitionSkipHistoryRef.current = false;
        }
        setPhase("done");
      })();
    };

    const onEnd = () => {
      if (Date.now() - start < minMs) {
        window.setTimeout(finish, minMs - (Date.now() - start));
      } else {
        finish();
      }
    };

    el?.addEventListener("animationend", onEnd, { once: true });
    const timer = window.setTimeout(onEnd, 1400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      el?.removeEventListener("animationend", onEnd);
    };
  }, [phase, doneState, pasteText, selectedTemplate]);

  const onExportPdf = async (colorSpace: "rgb" | "cmyk") => {
    if (!doneState) return;
    const setExporting =
      colorSpace === "cmyk" ? setExportingCmyk : setExportingRgb;
    setExporting(true);
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...doneState, colorSpace }),
      });
      if (!response.ok) {
        throw new Error("导出失败，请重试。");
      }
      const blob = await response.blob();
      const cd = response.headers.get("Content-Disposition") ?? "";
      const matched = cd.match(/filename\*=UTF-8''([^;]+)/);
      const filename = matched?.[1]
        ? decodeURIComponent(matched[1])
        : buildExportPdfFilename(doneState, colorSpace);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportMenuOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const onExportPng = useCallback(async () => {
    if (!doneState) return;
    const front = exportFrontRef.current ?? frontPreviewRef.current;
    const back = exportBackRef.current;
    setExportingPng(true);
    try {
      if (!front || !back) throw new Error("预览未就绪");
      const { compositePreviewFacesToPngBlob } = await import(
        "@/lib/export/png/compositePreviewPng"
      );
      const blob = await compositePreviewFacesToPngBlob(front, back, {
        gapPx: 0,
        outputWidthPx: 1920,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildExportPngFilename(doneState);
      a.click();
      URL.revokeObjectURL(url);
      setExportMenuOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "导出 PNG 失败");
    } finally {
      setExportingPng(false);
    }
  }, [doneState]);

  const transitionState = useMemo((): CardState => {
    if (!doneState) return miniState(selectedTemplate);
    const id = selectedTemplate;
    const base: CardState = { ...doneState, templateId: id };
    return base;
  }, [doneState, selectedTemplate]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotionRef.current = mq.matches;
      if (mq.matches) {
        setTilt({ rx: 0, ry: 0 });
        setGlare({ x: 50, y: 50 });
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const onDoneTiltMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reducedMotionRef.current) return;
      const zone = e.currentTarget;
      const r = zone.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const centerX = r.width / 2;
      const centerY = r.height / 2;
      const rx = (y - centerY) / 15;
      const ry = (centerX - x) / 15;
      setTilt({ rx, ry });

      // 高光必须与「当前名片面」同一坐标系：用可见面的 getBoundingClientRect，不能用交互区比例
      const faceEl = flipped ? backFaceRef.current : frontFaceRef.current;
      if (faceEl) {
        const fr = faceEl.getBoundingClientRect();
        if (fr.width > 0 && fr.height > 0) {
          const gx = ((e.clientX - fr.left) / fr.width) * 100;
          const gy = ((e.clientY - fr.top) / fr.height) * 100;
          setGlare({
            x: Math.min(100, Math.max(0, gx)),
            y: Math.min(100, Math.max(0, gy)),
          });
        }
      }
    },
    [flipped],
  );

  const onDoneTiltLeave = useCallback(() => {
    setTilt({ rx: 0, ry: 0 });
    setGlare({ x: 50, y: 50 });
  }, []);

  useEffect(() => {
    if (phase !== "done") {
      setTilt({ rx: 0, ry: 0 });
      setGlare({ x: 50, y: 50 });
    }
  }, [phase]);

  const primaryCta = () => {
    if (!qrPayload) {
      qrInputRef.current?.click();
      return;
    }
    runGenerate();
  };

  if (phase === "transition" && doneState) {
    return (
      <div className={styles.transitionLayer} aria-busy>
        <div className={styles.transitionBgArt} aria-hidden />
        <div ref={transitionCardRef} className={styles.transitionCard}>
          <div className={styles.transitionCardPreview}>
            <CardFacePreview
              variant="export"
              state={transitionState}
              side="back"
              qrModules={null}
            />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done" && doneState) {
    return (
      <main className={studio.page} id="top">
        <div className={studio.shell}>
          <div aria-hidden="true" className={studio.pageGuides}>
            <span className={studio.pageGuideLineLeft} />
            <span className={studio.pageGuideLineRight} />
          </div>

          <section className={studio.hero}>
            <div className={studio.heroHeader}>
              <span aria-hidden="true" className={studio.heroGuideLineLeft} />
              <span aria-hidden="true" className={studio.heroGuideLineRight} />
              <span aria-hidden="true" className={studio.heroGuideNodeLeft} />
              <span aria-hidden="true" className={studio.heroGuideNodeRight} />
              <Link
                href="/#welcome"
                prefetch={false}
                className={studio.brandLink}
                aria-label="返回欢迎页"
                onClick={(e) => {
                  e.preventDefault();
                  goToWelcome();
                }}
              >
                <Image
                  src="/design/logo-red.svg"
                  alt="Shoplazza"
                  width={127}
                  height={30}
                  className={studio.brandLogo}
                  priority
                />
                <span className={studio.brandText}>Card Builder</span>
              </Link>
              <div
                className={cn(studio.heroCenter, styles.landingHeroCenterSpacer)}
                aria-hidden
              />
              <div className={studio.heroActions}>
                <div className={studio.templateSwitch} aria-label="模板切换">
                  <span
                    aria-hidden
                    className={cn(
                      studio.templateSwitchThumb,
                      doneState.templateId === "A"
                        ? studio.templateSwitchThumbShoplazza
                        : studio.templateSwitchThumbSubotiz,
                    )}
                  />
                  {(["A", "B"] as const).map((tid) => {
                    const active = doneState.templateId === tid;
                    const label = tid === "A" ? "Shoplazza" : "Subotiz";
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => onDonePageTemplateSwitch(tid)}
                        className={cn(
                          studio.templateSwitchButton,
                          active && studio.templateSwitchButtonOnThumb,
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <div className={styles.landingBody}>
            <div className={styles.doneShell}>
              <div className={styles.doneBlock}>
                <h1 className={styles.doneTitle}>完成啦!</h1>
                <div
                  className={styles.doneTiltZone}
                  onMouseMove={onDoneTiltMove}
                  onMouseLeave={onDoneTiltLeave}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setFlipped((f) => !f);
                    }
                  }}
                >
                  <div
                    className={styles.cardTiltWrapper}
                    style={{
                      transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                    }}
                  >
                    <div className={styles.doneCardScale}>
                      <div
                        role="button"
                        tabIndex={0}
                        className={styles.flipInner}
                        data-flipped={flipped ? "true" : "false"}
                        onClick={() => setFlipped((f) => !f)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setFlipped((f) => !f);
                          }
                        }}
                        aria-label={flipped ? "显示正面" : "显示背面"}
                      >
                        <div ref={frontFaceRef} className={styles.face}>
                          <CardFacePreview
                            ref={frontPreviewRef}
                            state={doneState}
                            side="front"
                            qrModules={doneQrModules}
                          />
                          <div
                            className={styles.cardGlare}
                            style={{
                              transform: `translate(${doneCardGlareTranslatePct(glare.x)}%, ${doneCardGlareTranslatePct(glare.y)}%)`,
                            }}
                            aria-hidden
                          />
                        </div>
                        <div
                          ref={backFaceRef}
                          className={`${styles.face} ${styles.faceBack}`}
                        >
                          <CardFacePreview
                            state={doneState}
                            side="back"
                            qrModules={doneQrModules}
                          />
                          <div
                            className={styles.cardGlare}
                            style={{
                              transform: `translate(${doneCardGlareTranslatePct(100 - glare.x)}%, ${doneCardGlareTranslatePct(glare.y)}%)`,
                            }}
                            aria-hidden
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.doneActions}>
                  <Button
                    type="button"
                    variant="default"
                    className="h-10 min-h-10 shrink-0 rounded-full px-6 sm:h-10"
                    onClick={() => setExportMenuOpen(true)}
                    disabled={exportingRgb || exportingCmyk || exportingPng}
                  >
                    <DownloadIcon className="mr-1 size-4" />
                    导出
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-h-10 shrink-0 rounded-full px-6 sm:h-10"
                    onClick={() => router.push("/studio")}
                  >
                    进入编辑器
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.hiddenExport} aria-hidden>
          <CardFacePreview
            ref={exportFrontRef}
            variant="export"
            state={doneState}
            side="front"
            qrModules={doneQrModules}
          />
          <CardFacePreview
            ref={exportBackRef}
            variant="export"
            state={doneState}
            side="back"
            qrModules={doneQrModules}
          />
        </div>

        <Dialog
          open={exportMenuOpen && !narrowLayout}
          onOpenChange={(o) => {
            if (!o) setExportMenuOpen(false);
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
              <DialogClose render={<Button variant="ghost" />}>取消</DialogClose>
            </DialogFooter>
          </DialogPopup>
        </Dialog>

        <Drawer
          open={exportMenuOpen && narrowLayout}
          onOpenChange={(o) => {
            if (!o) setExportMenuOpen(false);
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
            <DrawerFooter variant="bare" className="justify-center">
              <DrawerClose render={<Button variant="outline" />}>关闭</DrawerClose>
            </DrawerFooter>
          </DrawerPopup>
        </Drawer>
      </main>
    );
  }

  return (
    <main className={cn(studio.page, styles.landingFlowPageBg)} id="top">
      <div className={studio.shell}>
        <div aria-hidden="true" className={studio.pageGuides}>
          <span className={studio.pageGuideLineLeft} />
          <span className={studio.pageGuideLineRight} />
        </div>

        <section className={studio.hero}>
          <div className={studio.heroHeader}>
            <span aria-hidden="true" className={studio.heroGuideLineLeft} />
            <span aria-hidden="true" className={studio.heroGuideLineRight} />
            <span aria-hidden="true" className={studio.heroGuideNodeLeft} />
            <span aria-hidden="true" className={studio.heroGuideNodeRight} />
            <Link href="/#welcome" className={studio.brandLink}>
              <Image
                src="/design/logo-red.svg"
                alt="Shoplazza"
                width={127}
                height={30}
                className={studio.brandLogo}
                priority
              />
              <span className={studio.brandText}>Card Builder</span>
            </Link>
            <div
              className={cn(studio.heroCenter, styles.landingHeroCenterSpacer)}
              aria-hidden
            />
            <div className={studio.heroActions}>
              <button
                type="button"
                className={cn(studio.buttonBase, studio.secondaryButton)}
                onClick={openHistory}
              >
                历史记录
              </button>
              <button
                type="button"
                className={cn(studio.buttonBase, studio.secondaryButton)}
                onClick={() => router.push("/studio")}
              >
                进入编辑器
              </button>
            </div>
          </div>
        </section>

        <div className={styles.landingBody}>
        <div className={styles.landingOverlap}>
          <div
            className={styles.templateStage}
            id="welcome"
            aria-label="选择名片模板"
          >
            <div className={styles.templateDeck}>
              <div
                role="button"
                tabIndex={0}
                className={styles.templateCardWrap}
                data-selected={selectedTemplate === "A" ? "true" : "false"}
                data-side="left"
                onClick={() => setSelectedTemplate("A")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedTemplate("A");
                  }
                }}
              >
                <div className={styles.templateCardInner}>
                  <CardFacePreview
                    variant="export"
                    state={shopMini}
                    side="back"
                    qrModules={null}
                  />
                </div>
              </div>
              <div
                role="button"
                tabIndex={0}
                className={styles.templateCardWrap}
                data-selected={selectedTemplate === "B" ? "true" : "false"}
                data-side="right"
                onClick={() => setSelectedTemplate("B")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedTemplate("B");
                  }
                }}
              >
                <div className={styles.templateCardInner}>
                  <CardFacePreview
                    variant="export"
                    state={subMini}
                    side="back"
                    qrModules={null}
                  />
                </div>
              </div>
            </div>
          </div>

          <section className={styles.modal} aria-label="欢迎">
          <h2 className={styles.modalTitle}>
            Hey, Welcome! 先选择上面的名片模板，再输入个人信息，剩下的交给我吧！
          </h2>
          <div className={styles.textAreaShell}>
            <textarea
              className={styles.textArea}
              placeholder="请输入个人信息，用逗号隔开，会自动识别哦"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              aria-label="个人信息"
            />
            {welcomeQrModules && (
              <div className={styles.qrCorner}>
                <QrSvgDom modules={welcomeQrModules} sizeMm={10} />
                <button
                  type="button"
                  className={styles.qrCornerRemove}
                  aria-label="删除二维码"
                  onClick={() => {
                    setQrPayload(null);
                    setGenerateError(null);
                    if (qrInputRef.current) qrInputRef.current.value = "";
                  }}
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            )}
          </div>
          <div className={styles.modalHintRow}>
            <span className={styles.hintText}>
              <TooltipProvider delay={150} closeDelay={120}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label="自动识别说明"
                        className={styles.hintHelpButton}
                      />
                    }
                  >
                    <HelpCircleIcon
                      aria-hidden
                      className={styles.hintHelpIcon}
                    />
                  </TooltipTrigger>
                  <TooltipPopup
                    side="top"
                    align="start"
                    sideOffset={8}
                    className="max-w-[300px]"
                  >
                    <div className="whitespace-normal px-2 py-2 text-left text-xs leading-relaxed text-balance">
                      自动识别目前仅支持中文版以及国内主要办公城市地址，特殊地址、信息或全英文名片可以点击右上角「进入编辑器」进行手动输入。
                    </div>
                  </TooltipPopup>
                </Tooltip>
              </TooltipProvider>
              信息包括：中文名，英文名(选填)，岗位，电话，邮箱，城市
            </span>
            <Button
              type="button"
              className="h-10 min-h-10 shrink-0 self-start rounded-full px-5 sm:h-10"
              onClick={primaryCta}
            >
              <ArrowUpIcon className="mr-1 size-4" />
              {qrPayload ? "生成" : "上传企微二维码"}
            </Button>
          </div>
          <input
            ref={qrInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onQrFile}
          />
          {generateError && (
            <p className={styles.errorText} role="alert">
              {generateError}
            </p>
          )}
        </section>
        </div>
        </div>
      </div>

      <Dialog open={historyOpen && !narrowLayout} onOpenChange={setHistoryOpen}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>历史记录</DialogTitle>
            <DialogDescription>保存在本设备，最近若干次生成。</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex max-h-80 flex-col gap-4 overflow-y-auto">
            {historyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无记录</p>
            ) : (
              historyRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border px-3 py-4"
                >
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{row.label}</span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          row.state.templateId === "A"
                            ? "bg-red-50 text-[#f30006]"
                            : "bg-purple-50 text-purple-900",
                        )}
                        aria-label={`模板 ${historyEntryTemplateLabel(row.state.templateId)}`}
                      >
                        {historyEntryTemplateLabel(row.state.templateId)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      type="button"
                      className="rounded-full"
                      onClick={() => applyHistoryToWelcome(row)}
                    >
                      再次导入信息
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      className="rounded-full shadow-none"
                      onClick={() => void openHistoryInStudio(row)}
                    >
                      打开编辑器
                    </Button>
                  </div>
                </div>
              ))
            )}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>关闭</DialogClose>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <Drawer open={historyOpen && narrowLayout} onOpenChange={setHistoryOpen}>
        <DrawerPopup showBar>
          <DrawerHeader className="text-center">
            <DrawerTitle>历史记录</DrawerTitle>
            <DrawerDescription>保存在本设备。</DrawerDescription>
          </DrawerHeader>
          <DrawerPanel className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-4">
            {historyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无记录</p>
            ) : (
              historyRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-lg border px-3 py-4"
                >
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{row.label}</span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          row.state.templateId === "A"
                            ? "bg-red-50 text-[#f30006]"
                            : "bg-purple-50 text-purple-900",
                        )}
                        aria-label={`模板 ${historyEntryTemplateLabel(row.state.templateId)}`}
                      >
                        {historyEntryTemplateLabel(row.state.templateId)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      type="button"
                      className="rounded-full"
                      onClick={() => applyHistoryToWelcome(row)}
                    >
                      再次导入信息
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      className="rounded-full shadow-none"
                      onClick={() => void openHistoryInStudio(row)}
                    >
                      打开编辑器
                    </Button>
                  </div>
                </div>
              ))
            )}
          </DrawerPanel>
          <DrawerFooter variant="bare">
            <DrawerClose render={<Button variant="outline" />}>关闭</DrawerClose>
          </DrawerFooter>
        </DrawerPopup>
      </Drawer>
    </main>
  );
}
