import {
  ADDRESS_PRESETS,
  buildAddressText,
  CITY_ADDRESS,
  DEFAULT_ADDRESS_PRESET,
  type AddressPresetId,
} from "@/lib/config/addressPresets";
import {
  inferPhoneRegionAndLocalNumber,
  normalizePhoneDigits,
} from "@/lib/config/phoneRegions";
import {
  defaultCardState,
  emailSuffixForTemplate,
  type CardState,
  type TemplateId,
} from "@/lib/types/card";

export type ParsedPersonalPaste = {
  name: string;
  englishName: string;
  title: string;
  emailLocal: string;
  phone: string;
  phoneRegion: string;
  /** 自由文本：地区 / Base */
  baseText: string;
};

function matchAddressPresetId(baseText: string): AddressPresetId {
  const t = baseText.trim();
  if (!t) return DEFAULT_ADDRESS_PRESET;
  for (const p of ADDRESS_PRESETS) {
    if (p.id === "none") continue;
    if (t.includes(p.label) || p.label.includes(t)) {
      return p.id;
    }
  }
  for (const p of ADDRESS_PRESETS) {
    if (p.id === "none") continue;
    for (const city of p.cities) {
      if (city && (t === city || t.includes(city) || city.includes(t))) {
        return p.id;
      }
    }
  }
  for (const p of ADDRESS_PRESETS) {
    if (p.id === "none") continue;
    const addr = buildAddressText(p.id);
    if (addr && t.split(/\s+/).some((w) => w.length > 1 && addr.includes(w))) {
      return p.id;
    }
  }
  return "none";
}

/**
 * 拆成「行」→ 逗号段 → 空格段；支持 `邮箱/城市`（斜杠仅在 @ 之后视为城市分隔）
 * 例：罗劲华 Ron，13045678989，luojinghua@shoplazza.com/广州
 */
function splitPasteTokens(raw: string): string[] {
  const tokens: string[] = [];
  for (const line of raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)) {
    for (const commaChunk of line
      .split(/[，,、;；|]+/u)
      .map((p) => p.trim())
      .filter(Boolean)) {
      for (const spaceChunk of commaChunk
        .split(/\s+/u)
        .map((p) => p.trim())
        .filter(Boolean)) {
        const at = spaceChunk.indexOf("@");
        const slash = spaceChunk.lastIndexOf("/");
        if (at >= 0 && slash > at) {
          tokens.push(spaceChunk.slice(0, slash).trim());
          tokens.push(spaceChunk.slice(slash + 1).trim());
        } else if (slash >= 0 && at < 0) {
          tokens.push(
            ...spaceChunk
              .split("/")
              .map((s) => s.trim())
              .filter(Boolean)
          );
        } else {
          tokens.push(spaceChunk);
        }
      }
    }
  }
  return tokens;
}

function segmentLooksLikeCity(seg: string): boolean {
  const t = seg.replace(/[。．,，、;；]+$/u, "").trim();
  if (!t || t.includes("@")) return false;
  for (const key of Object.keys(CITY_ADDRESS)) {
    if (t === key || t.includes(key) || key.includes(t)) return true;
  }
  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function standaloneCityTokenSet(): Set<string> {
  const out = new Set<string>();
  for (const k of Object.keys(CITY_ADDRESS)) out.add(k);
  for (const p of ADDRESS_PRESETS) {
    if (p.id === "none") continue;
    for (const c of p.cities) {
      if (c) out.add(c);
    }
  }
  return out;
}

const STANDALONE_CITY_TOKENS = standaloneCityTokenSet();

/** 整段是否仅为城市/地区名单字（与「深圳市…」整行区分） */
function isStandaloneCityToken(seg: string): boolean {
  const t = seg.replace(/[。．,，、;；]+$/u, "").trim();
  if (!t || t.includes("@")) return false;
  return STANDALONE_CITY_TOKENS.has(t);
}

/**
 * Subotiz（模板 B）固定印刷地址，仅 `addressExtra` 可变：去掉纯城市/地区 token、
 * 行尾「…，深圳」式缀词，以及逗号分段中的纯城市段。
 */
export function stripSubotizAddressExtra(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const cities = [...STANDALONE_CITY_TOKENS].sort((a, b) => b.length - a.length);
  const linesOut: string[] = [];
  for (const rawLine of t.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isStandaloneCityToken(line)) continue;
    let row = line;
    for (const city of cities) {
      row = row
        .replace(
          new RegExp(`(?:^|[\\s,，、])${escapeRegExp(city)}[。．，、]?$`, "u"),
          "",
        )
        .trim()
        .replace(/[,，、]\s*$/u, "")
        .trim();
    }
    if (row && !isStandaloneCityToken(row)) linesOut.push(row);
  }
  let joined = linesOut.join("\n").trim();
  if (/[，,]/u.test(joined)) {
    const parts = joined.split(/[，,]/u).map((x) => x.trim()).filter(Boolean);
    const kept = parts.filter((p) => !isStandaloneCityToken(p));
    joined = kept.join("，").trim();
  }
  return joined;
}

/** 完成页切换模板：更新 `templateId`，切到 Subotiz 时顺带清理 `addressExtra` */
export function applyLandingDoneTemplateSwitch(
  prev: CardState,
  templateId: TemplateId,
): CardState {
  if (prev.templateId === templateId) return prev;
  const next: CardState = { ...prev, templateId };
  if (templateId === "B") {
    next.templateFields = {
      ...prev.templateFields,
      B: {
        ...prev.templateFields.B,
        addressExtra: stripSubotizAddressExtra(prev.templateFields.B.addressExtra),
      },
    };
  }
  return next;
}

function segmentIsPhoneLike(seg: string): boolean {
  const d = normalizePhoneDigits(seg);
  return d.length >= 8 && /[\d+]/.test(seg.replace(/\s/g, ""));
}

function segmentIsEmailLike(seg: string): boolean {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(seg);
}

/** 逗号顺序：… 岗位 … 电话 … 时，取电话前、排除姓名/英文名后的岗位片段 */
function inferTitleFromScan(
  scan: string[],
  name: string,
  englishName: string
): string {
  const phoneIdx = scan.findIndex((seg) => segmentIsPhoneLike(seg));
  const visit = (iBegin: number, iEnd: number): string => {
    for (let i = iBegin; i < iEnd; i++) {
      const t = scan[i].trim();
      if (!t) continue;
      if (segmentIsEmailLike(t)) continue;
      if (segmentIsPhoneLike(t)) continue;
      if (segmentLooksLikeCity(t)) continue;
      if (name && t === name) continue;
      if (englishName && t.toLowerCase() === englishName.toLowerCase()) continue;
      if (/[\u4e00-\u9fff]{2,}/.test(t) && t.length <= 48) return t;
      if (
        /^[A-Za-z][A-Za-z\s.'/&\u00b7-]{2,52}$/.test(t) &&
        (/\s/.test(t) || t.length >= 5)
      ) {
        return t;
      }
    }
    return "";
  };

  if (phoneIdx > 0) {
    const t = visit(0, phoneIdx);
    if (t) return t;
  }
  if (phoneIdx < 0) {
    return visit(0, scan.length);
  }
  return "";
}

/** 从用户粘贴的多行文本中尽力提取个人信息 */
export function parsePersonalPaste(
  raw: string,
  templateId: TemplateId
): ParsedPersonalPaste {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const tokens = splitPasteTokens(raw);
  const scan = tokens.length > 0 ? tokens : lines;

  let name = "";
  let englishName = "";
  let title = "";
  let emailLocal = "";
  let phone = "";
  let phoneRegion = defaultCardState().shared.phoneRegion;
  let baseText = "";

  for (const line of scan) {
    const mZh = line.match(/^中文名[：:]\s*(.+)$/);
    if (mZh) {
      name = mZh[1].trim();
      continue;
    }
    const mEn = line.match(/^英文名[：:]\s*(.+)$/i);
    if (mEn) {
      englishName = mEn[1].trim();
      continue;
    }
    const mTitle = line.match(
      /^(职位|岗位名称|岗位|在职岗位)[：:]\s*(.+)$/u
    );
    if (mTitle) {
      title = mTitle[2].trim();
      continue;
    }
    const mBase = line.match(/^(Base|地区|办公地)[：:]\s*(.+)$/i);
    if (mBase) {
      const v = mBase[2].trim();
      baseText = templateId === "B" ? stripSubotizAddressExtra(v) : v;
      continue;
    }
    const emailMatch = line.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
    if (emailMatch) {
      const email = emailMatch[1];
      const suffix = emailSuffixForTemplate(templateId);
      if (email.toLowerCase().endsWith(suffix.toLowerCase())) {
        emailLocal = email.slice(0, -suffix.length).trim();
      } else {
        const at = email.indexOf("@");
        emailLocal = at > 0 ? email.slice(0, at).trim() : email;
      }
      continue;
    }
    const digitCount = line.replace(/\D/g, "").length;
    if (digitCount >= 8 && /[\d+]/.test(line)) {
      const norm = normalizePhoneDigits(line.replace(/\s/g, " "));
      const inferred = inferPhoneRegionAndLocalNumber(norm || line);
      phone = inferred.phone;
      phoneRegion = inferred.phoneRegion;
      continue;
    }
  }

  if (!name) {
    for (const seg of scan) {
      if (
        /中文名|英文名|职位|岗位名称|岗位|Base|地区|办公地|@|^\d[\d\s\-+]{6,}/i.test(
          seg
        )
      ) {
        continue;
      }
      if (segmentLooksLikeCity(seg)) continue;
      if (/[\u4e00-\u9fff]/.test(seg) && !seg.includes("@")) {
        name = seg;
        break;
      }
    }
  }

  if (!englishName) {
    for (const seg of scan) {
      if (seg === name || seg.includes("@")) continue;
      if (segmentLooksLikeCity(seg)) continue;
      if (
        /^[A-Za-z][A-Za-z\s.'-]{0,48}$/.test(seg.trim()) &&
        !/\d{5,}/.test(seg)
      ) {
        englishName = seg.trim();
        break;
      }
    }
  }

  if (!baseText && templateId === "A") {
    for (const seg of scan) {
      if (segmentLooksLikeCity(seg)) {
        baseText = seg.trim();
      }
    }
  }

  if (!title.trim()) {
    const inferred = inferTitleFromScan(scan, name, englishName);
    if (inferred) title = inferred;
  }

  return {
    name,
    englishName,
    title,
    emailLocal,
    phone,
    phoneRegion,
    baseText,
  };
}

/** 合并粘贴解析结果与二维码，生成可保存的 CardState */
export function buildCardStateFromLandingInput(options: {
  templateId: TemplateId;
  pasteRaw: string;
  qrPayload: string;
}): CardState {
  const base = defaultCardState();
  const parsed = parsePersonalPaste(options.pasteRaw, options.templateId);
  const presetId: AddressPresetId =
    options.templateId === "A"
      ? matchAddressPresetId(parsed.baseText)
      : (base.templateFields.A.addressPreset as AddressPresetId);

  const addressExtra =
    options.templateId === "A"
      ? presetId === "none"
        ? parsed.baseText.trim()
        : ""
      : stripSubotizAddressExtra(parsed.baseText.trim());

  const addressPreset: AddressPresetId =
    options.templateId === "A"
      ? presetId
      : (base.templateFields.A.addressPreset as AddressPresetId);

  const englishTrim = parsed.englishName.trim();

  return {
    ...base,
    templateId: options.templateId,
    shared: {
      ...base.shared,
      name: parsed.name || base.shared.name,
      englishName: englishTrim,
      title: parsed.title || base.shared.title,
      emailLocal: parsed.emailLocal || base.shared.emailLocal,
      phone: parsed.phone || base.shared.phone,
      phoneRegion: parsed.phoneRegion || base.shared.phoneRegion,
    },
    visibility: {
      ...base.visibility,
      /* 与 Studio 一致：无英文名时不占位「Name」，字段设为不可见 */
      englishName: englishTrim.length > 0,
    },
    templateFields: {
      ...base.templateFields,
      A: {
        ...base.templateFields.A,
        ...(options.templateId === "A"
          ? {
              addressPreset,
              address: buildAddressText(addressPreset),
              addressExtra,
            }
          : {}),
      },
      B: {
        ...base.templateFields.B,
        ...(options.templateId === "B"
          ? {
              addressExtra,
            }
          : {}),
      },
    },
    qr: { payload: options.qrPayload },
  };
}

export function landingGenerateBlockedReason(options: {
  pasteRaw: string;
  templateId: TemplateId;
  hasQr: boolean;
}): string | null {
  if (!options.hasQr) {
    return "请先上传二维码图片。";
  }
  const parsed = parsePersonalPaste(options.pasteRaw, options.templateId);
  const raw = options.pasteRaw;
  const hasAt = /@/.test(raw);
  const emailOk = parsed.emailLocal.trim().length > 0 || hasAt;
  const digits = (parsed.phone || "").replace(/\D/g, "");
  const rawDigits = raw.replace(/\D/g, "");
  const phoneOk = digits.length >= 8 || rawDigits.length >= 8;
  if (!emailOk || !phoneOk) {
    return "请补充可被识别的电话与邮箱（或检查格式），再点击生成。";
  }
  return null;
}
