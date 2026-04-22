import {
  ADDRESS_PRESETS,
  CITY_ADDRESS,
} from "@/lib/config/addressPresets";
import {
  finalizeShoplazzaATemplateFields,
  slotsFromLandingMatchedCities,
} from "@/lib/card/shoplazzaAddressSlots";
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
  /** 自由文本：地区 / Base（含标签行原文，模板 B 等仍用） */
  baseText: string;
  /**
   * 从 Base/扫描中识别出的城市 key（与 CITY_ADDRESS 键一致），按出现顺序、去重、最多 3 个。
   */
  matchedCities: string[];
  /** 预置城市以外的片段；模板 A 写入末槽 `customText` 或追加到第三条 */
  addressCustomNote: string;
};

/** 拆成「行」→ 逗号段 → 空格段；支持 `邮箱/城市`（斜杠仅在 @ 之后视为城市分隔）
 * 例：罗劲华 Ron，13045678989，luojinghua@shoplazza.com/广州
 * 例：熊悉丞 Lucas Xiong，… → 中文名与英文全名分为两个 token
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
      if (pushMixedChineseEnglishNameTokensTo(commaChunk, tokens)) continue;
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

/** 单段是否可稳定归一为某个 CITY_ADDRESS 城市 key（避免长详细地址被误判） */
function cityKeyFromRegionPart(part: string): string | null {
  const t = part.replace(/[。．,，、;；]+$/u, "").trim();
  if (!t || t.length > 18) return null;
  if (isStandaloneCityToken(t)) return t;
  const keys = Object.keys(CITY_ADDRESS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (t === k || t === `${k}市`) return k;
    if (t.startsWith(k) && t.length <= k.length + 1) return k;
  }
  return null;
}

/** 将 Base 一行按逗号等拆开：前两个可识别城市进列表，其余合并为自定义地址 */
function parseRegionFieldValue(value: string): {
  cities: string[];
  custom: string;
} {
  const parts = value.split(/[,，、;；\n]+/u).map((p) => p.trim()).filter(Boolean);
  const cities: string[] = [];
  const customParts: string[] = [];
  for (const part of parts) {
    const k = cityKeyFromRegionPart(part);
    if (k && cities.length < 3 && !cities.includes(k)) {
      cities.push(k);
      continue;
    }
    if (part) customParts.push(part);
  }
  return { cities, custom: customParts.join("，").trim() };
}

function collectCitiesFromScanForA(scan: string[]): string[] {
  const out: string[] = [];
  for (const seg of scan) {
    if (
      /中文名|英文名|职位|岗位名称|岗位|Base|地区|办公地|@|^\d[\d\s\-+]{6,}/i.test(
        seg
      )
    ) {
      continue;
    }
    if (!segmentLooksLikeCity(seg)) continue;
    const k = cityKeyFromRegionPart(seg);
    if (!k) continue;
    if (out.length >= 3) break;
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

/** 完成页切换模板：更新 `templateId` */
export function applyLandingDoneTemplateSwitch(
  prev: CardState,
  templateId: TemplateId,
): CardState {
  if (prev.templateId === templateId) return prev;
  return { ...prev, templateId };
}

function segmentIsPhoneLike(seg: string): boolean {
  const d = normalizePhoneDigits(seg);
  return d.length >= 8 && /[\d+]/.test(seg.replace(/\s/g, ""));
}

function segmentIsEmailLike(seg: string): boolean {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(seg);
}

/** 逗号拆出的「Lucas」「Xiong」等应合并为全名，避免后续 token 被误判为岗位 */
function inferConsecutiveEnglishAfterName(
  scan: string[],
  name: string
): string {
  const nameIdx = scan.findIndex((s) => s === name);
  if (nameIdx < 0) return "";
  const phoneEmailIdx = scan.findIndex(
    (s, j) => j > nameIdx && (segmentIsPhoneLike(s) || segmentIsEmailLike(s))
  );
  const end = phoneEmailIdx >= 0 ? phoneEmailIdx : scan.length;
  const words: string[] = [];
  const jobishWord =
    /^(?:project|projects|product|products|managers?|director|engineers?|sales|marketing|lead|head|officer|specialists?|consultants?|coordinators?|designers?|developers?|analysts?|vp|ceo|cto|cfo)s?$/i;

  for (let i = nameIdx + 1; i < end; i++) {
    const seg = scan[i].trim();
    if (!seg) continue;
    if (segmentLooksLikeCity(seg)) break;
    if (/[\u4e00-\u9fff]/.test(seg)) break;

    if (
      /^[A-Za-z][A-Za-z\s.'\u00b7-]{0,120}$/u.test(seg) &&
      !/\d/.test(seg)
    ) {
      const segsplit = seg.split(/\s+/).filter(Boolean);
      const parts = segsplit.filter((p) => /^[A-Za-z][A-Za-z.'-]*$/u.test(p));
      if (parts.length === segsplit.length && parts.length > 0) {
        for (const p of parts) {
          if (jobishWord.test(p)) {
            if (words.length === 0) continue;
            return words.join(" ");
          }
          words.push(p);
          if (words.length >= 4) return words.join(" ");
        }
        if (parts.length > 1) return words.join(" ");
        continue;
      }
    }

    if (/^[A-Za-z][A-Za-z.'-]*$/u.test(seg)) {
      if (jobishWord.test(seg)) {
        if (words.length === 0) continue;
        return words.join(" ");
      }
      words.push(seg);
      if (words.length >= 4) return words.join(" ");
      continue;
    }
    break;
  }
  return words.join(" ");
}

function pushMixedChineseEnglishNameTokensTo(
  commaChunk: string,
  tokens: string[]
): boolean {
  const m = commaChunk.match(
    /^([\u4e00-\u9fff\u3007\ufa30-\ufa6a]{1,12})\s+([A-Za-z].*)$/u
  );
  if (!m) return false;
  const en = m[2].trim();
  if (!en || /[\u4e00-\u9fff]/.test(en) || segmentIsEmailLike(en)) return false;
  if (!/^[A-Za-z][A-Za-z\s.'\u00b7-]{0,120}$/u.test(en) || /\d{5,}/.test(en)) {
    return false;
  }
  tokens.push(m[1].trim());
  tokens.push(en);
  return true;
}

function englishNameTokensToSkip(englishName: string): Set<string> {
  const s = new Set<string>();
  const t = englishName.trim();
  if (!t) return s;
  s.add(t.toLowerCase());
  for (const w of t.split(/\s+/)) {
    if (w) s.add(w.toLowerCase());
  }
  return s;
}

/** 逗号顺序：… 岗位 … 电话 … 时，取电话前、排除姓名/英文名后的岗位片段 */
function inferTitleFromScan(
  scan: string[],
  name: string,
  englishName: string
): string {
  const phoneIdx = scan.findIndex((seg) => segmentIsPhoneLike(seg));
  const skipEnglish = englishNameTokensToSkip(englishName);
  const visit = (iBegin: number, iEnd: number): string => {
    for (let i = iBegin; i < iEnd; i++) {
      const t = scan[i].trim();
      if (!t) continue;
      if (segmentIsEmailLike(t)) continue;
      if (segmentIsPhoneLike(t)) continue;
      if (segmentLooksLikeCity(t)) continue;
      if (name && t === name) continue;
      if (skipEnglish.has(t.toLowerCase())) continue;
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
  let matchedCities: string[] = [];
  let addressCustomNote = "";

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
      baseText = v;
      if (templateId === "A") {
        const pr = parseRegionFieldValue(v);
        matchedCities = pr.cities;
        addressCustomNote = pr.custom;
      }
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
        /^[A-Za-z][A-Za-z\s.'-]{0,120}$/.test(seg.trim()) &&
        !/\d{5,}/.test(seg)
      ) {
        englishName = seg.trim();
        break;
      }
    }
  }

  if (name) {
    const merged = inferConsecutiveEnglishAfterName(scan, name);
    if (merged) {
      const p = englishName.trim();
      if (!p || merged.length > p.length) {
        englishName = merged;
      }
    }
  }

  if (templateId === "A" && matchedCities.length === 0) {
    matchedCities = collectCitiesFromScanForA(scan);
  }

  if (templateId === "A" && !addressCustomNote.trim()) {
    const rawLines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLines.length >= 2) {
      const last = rawLines[rawLines.length - 1] ?? "";
      if (
        last &&
        !/^中文名|英文名|职位|岗位名称|岗位|Base|地区|办公地[：:]|邮箱|^Email[：:]/i.test(
          last
        ) &&
        !segmentIsEmailLike(last) &&
        !segmentIsPhoneLike(last)
      ) {
        const { cities: lastCities, custom: lastCustom } =
          parseRegionFieldValue(last);
        if (!lastCities.length && lastCustom) {
          addressCustomNote = lastCustom;
        } else if (lastCities.length > 0 && matchedCities.length === 0) {
          matchedCities = lastCities.slice(0, 3);
          if (lastCustom) addressCustomNote = lastCustom;
        }
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
    matchedCities,
    addressCustomNote,
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
  const customNote = parsed.addressCustomNote.trim();

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
          ? finalizeShoplazzaATemplateFields({
              ...base.templateFields.A,
              addressSlots: slotsFromLandingMatchedCities(
                parsed.matchedCities,
                customNote,
              ),
            })
          : {}),
      },
      B: {
        ...base.templateFields.B,
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
