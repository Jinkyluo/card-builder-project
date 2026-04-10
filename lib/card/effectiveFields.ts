import {
  buildAddressText,
  inferAddressPresetId,
} from "@/lib/config/addressPresets";
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
  return {
    ...common,
    company: b.company,
    website: b.website,
    addressPreset: "",
    address: "",
    addressExtra: b.addressExtra,
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

/**
 * 将旧版单层 `fields` 草稿转为 schemaVersion 2。
 */
export function migrateLegacyCardState(raw: unknown): CardState {
  if (!isLegacyFlatFields(raw)) {
    return raw as CardState;
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
    const addressPreset =
      f.addressPreset || inferAddressPresetId(f.address ?? "");
    return {
      schemaVersion: SCHEMA_VERSION,
      templateId: "A",
      shared,
      templateFields: {
        A: {
          company: f.company?.trim() || SHOPLAZZA_DEFAULT_COMPANY,
          website: f.website?.trim() || SHOPLAZZA_DEFAULT_WEBSITE,
          addressPreset,
          address: buildAddressText(addressPreset),
          addressExtra: f.addressExtra ?? "",
          locks: { company: locks.company },
        },
        B: base.templateFields.B,
      },
      visibility: raw.visibility ?? base.visibility,
      assets: raw.assets ?? {},
      qr: raw.qr ?? null,
    };
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    templateId: "B",
    shared,
    templateFields: {
      A: base.templateFields.A,
      B: {
        company: f.company?.trim() || SUBOTIZ_DEFAULT_COMPANY,
        website: f.website?.trim() || SUBOTIZ_DEFAULT_WEBSITE,
        addressExtra: f.addressExtra ?? "",
        locks: { company: locks.company, website: locks.website },
      },
    },
    visibility: raw.visibility ?? base.visibility,
    assets: raw.assets ?? {},
    qr: raw.qr ?? null,
  };
}
