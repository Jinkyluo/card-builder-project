import {
  buildAddressText,
  CITY_ADDRESS,
  DEFAULT_ADDRESS_PRESET,
  inferAddressPresetId,
  normalizeAddressPresetId,
} from "@/lib/config/addressPresets";
import { finalizeShoplazzaATemplateFields } from "@/lib/card/shoplazzaAddressSlots";
import { normalizePhoneDigits } from "@/lib/config/phoneRegions";
import {
  defaultCardState,
  emailSuffixForTemplate,
  SCHEMA_VERSION,
  SHOPLAZZA_DEFAULT_COMPANY,
  SHOPLAZZA_DEFAULT_WEBSITE,
  SUBOTIZ_DEFAULT_COMPANY,
  SUBOTIZ_DEFAULT_WEBSITE,
  type CardState,
  type SharedPersonalFields,
  type TemplateId,
} from "@/lib/types/card";

/** 从完整邮箱解析本地部分（粘贴整邮箱时用） */
export function parseEmailLocal(email: string): string {
  const t = email.trim();
  if (!t) return "";
  const i = t.indexOf("@");
  if (i <= 0) return t.replace(/@/g, "");
  return t.slice(0, i);
}

/**
 * 合并 shared + 当前模板业务字段 + 按模板后缀拼出的 email，
 * 供预览、PDF、dynamicPositions 等与旧 `fields` 平铺结构兼容。
 */
export function getEffectiveFields(state: CardState): Record<string, string> {
  const s = state.shared;
  const suffix = emailSuffixForTemplate(state.templateId);
  const local = s.emailLocal.trim();
  const email = local ? `${local}${suffix}` : `name${suffix}`;

  const common: Record<string, string> = {
    name: s.name,
    englishName: s.englishName,
    title: s.title,
    phoneRegion: s.phoneRegion,
    phoneDialCodeCustom: s.phoneDialCodeCustom ?? "",
    phone: s.phone,
    email,
    contactNote: s.contactNote,
    tagline: s.tagline,
    department: s.department,
    wechat: s.wechat,
  };

  if (state.templateId === "A") {
    const a = state.templateFields.A;
    return {
      ...common,
      company: a.company,
      website: a.website,
      addressPreset: a.addressPreset,
      address: a.address,
      addressExtra: a.addressExtra,
    };
  }

  const b = state.templateFields.B;
  const presetText =
    b.addressPreset === "city-shenzhen"
      ? CITY_ADDRESS["深圳"]
      : (b.addressCustomText ?? "").trim();
  return {
    ...common,
    company: presetText || SUBOTIZ_DEFAULT_COMPANY,
    website: b.website,
    addressPreset: b.addressPreset ?? "",
    address: "",
    addressExtra: "",
  };
}

function isLegacyFlatFields(
  raw: unknown
): raw is {
  templateId: TemplateId;
  fields: Record<string, string>;
  visibility?: Record<string, boolean>;
  locks?: { company?: boolean; website?: boolean };
  assets?: CardState["assets"];
  qr?: CardState["qr"];
} {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "fields" in raw &&
    !("shared" in raw)
  );
}

/** 将 v2 草稿里 B 模板的旧 `addressExtra` 形态归一为新 `addressPreset/addressCustomText` 形态 */
function normalizeSubotizFieldsShape(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const r = raw as { templateFields?: { B?: Record<string, unknown> } };
  const b = r.templateFields?.B;
  if (!b) return raw;
  const hasNewShape =
    Object.prototype.hasOwnProperty.call(b, "addressPreset") &&
    Object.prototype.hasOwnProperty.call(b, "addressCustomText");
  if (hasNewShape) {
    // 仍可能含残留 addressExtra 字段，但下游不读取，不强制清理
    return raw;
  }
  const legacyCompany = String(b.company ?? "").trim();
  const shenzhenText = CITY_ADDRESS["深圳"];
  const isShenzhenLike =
    !legacyCompany ||
    legacyCompany === shenzhenText ||
    legacyCompany === SUBOTIZ_DEFAULT_COMPANY;
  const next = {
    ...(raw as object),
    templateFields: {
      ...(r.templateFields as object),
      B: {
        company: SUBOTIZ_DEFAULT_COMPANY,
        website: String(b.website ?? SUBOTIZ_DEFAULT_WEBSITE),
        addressPreset: isShenzhenLike ? DEFAULT_ADDRESS_PRESET : "none",
        addressCustomText: isShenzhenLike ? "" : legacyCompany,
        locks: { website: true },
      },
    },
  };
  return next;
}

/**
 * 将旧版单层 `fields` 草稿转为 schemaVersion 2。
 */
export function migrateLegacyCardState(raw: unknown): CardState {
  if (!isLegacyFlatFields(raw)) {
    return normalizeSubotizFieldsShape(raw) as CardState;
  }

  const base = defaultCardState();
  const f = raw.fields;
  const tid = raw.templateId ?? "A";

  const shared: SharedPersonalFields = {
    ...base.shared,
    name: f.name ?? "",
    englishName: f.englishName ?? "",
    title: f.title ?? "",
    phoneRegion: f.phoneRegion ?? base.shared.phoneRegion,
    phone: f.phone ? normalizePhoneDigits(f.phone) : "",
    emailLocal: parseEmailLocal(f.email ?? ""),
    contactNote: f.contactNote ?? "",
    tagline: f.tagline ?? base.shared.tagline,
    department: f.department ?? base.shared.department,
    wechat: f.wechat ?? base.shared.wechat,
  };

  const locks = {
    company: raw.locks?.company !== false,
    website: raw.locks?.website !== false,
  };

  if (tid === "A") {
    const addressPreset = normalizeAddressPresetId(
      f.addressPreset || inferAddressPresetId(f.address ?? ""),
    );
    const rawA = {
      company: f.company?.trim() || SHOPLAZZA_DEFAULT_COMPANY,
      website: f.website?.trim() || SHOPLAZZA_DEFAULT_WEBSITE,
      addressPreset,
      address: (f.address ?? "").trim() || buildAddressText(addressPreset),
      addressExtra: f.addressExtra ?? "",
      addressSlots: [],
      locks: { company: locks.company },
    };
    return {
      schemaVersion: SCHEMA_VERSION,
      templateId: "A",
      shared,
      templateFields: {
        A: finalizeShoplazzaATemplateFields(rawA),
        B: base.templateFields.B,
      },
      visibility: raw.visibility ?? base.visibility,
      assets: raw.assets ?? {},
      qr: raw.qr ?? null,
    };
  }

  const legacyCompanyB = (f.company ?? "").trim();
  const shenzhenText = CITY_ADDRESS["深圳"];
  const isShenzhenLike =
    !legacyCompanyB ||
    legacyCompanyB === shenzhenText ||
    legacyCompanyB === SUBOTIZ_DEFAULT_COMPANY;
  return {
    schemaVersion: SCHEMA_VERSION,
    templateId: "B",
    shared,
    templateFields: {
      A: base.templateFields.A,
      B: {
        company: SUBOTIZ_DEFAULT_COMPANY,
        website: f.website?.trim() || SUBOTIZ_DEFAULT_WEBSITE,
        addressPreset: isShenzhenLike ? DEFAULT_ADDRESS_PRESET : "none",
        addressCustomText: isShenzhenLike ? "" : legacyCompanyB,
        locks: { website: locks.website },
      },
    },
    visibility: raw.visibility ?? base.visibility,
    assets: raw.assets ?? {},
    qr: raw.qr ?? null,
  };
}
