import {
  buildAddressText,
  DEFAULT_ADDRESS_PRESET,
} from "@/lib/config/addressPresets";
import { DEFAULT_PHONE_REGION } from "@/lib/config/phoneRegions";

export type TemplateId = "A" | "B";

export const SCHEMA_VERSION = 2 as const;

/** Subotiz 默认地址行、网站 */
/** Shoplazza 模板默认「公司」行全文 */
export const SHOPLAZZA_DEFAULT_COMPANY = "深圳店匠科技有限公司";
export const SHOPLAZZA_DEFAULT_WEBSITE = "www.shoplazza.cn";

export const SUBOTIZ_DEFAULT_COMPANY = "深圳市南山区彩讯科技大厦 27 楼";
export const SUBOTIZ_DEFAULT_WEBSITE = "www.subotiz.com";
export const SUBOTIZ_EMAIL_SUFFIX = "@subotiz.com";
export const SHOPLAZZA_EMAIL_SUFFIX = "@shoplazza.com";

export function emailSuffixForTemplate(id: TemplateId): string {
  return id === "A" ? SHOPLAZZA_EMAIL_SUFFIX : SUBOTIZ_EMAIL_SUFFIX;
}

export type TemplateLocks = {
  company?: boolean;
  website?: boolean;
};

/** Shoplazza 模板业务字段 */
export type ShoplazzaTemplateFields = {
  company: string;
  website: string;
  addressPreset: string;
  address: string;
  addressExtra: string;
  locks: TemplateLocks;
};

/** Subotiz 模板业务字段 */
export type SubotizTemplateFields = {
  company: string;
  website: string;
  addressExtra: string;
  locks: TemplateLocks;
};

/** 两模板共用的个人信息（切换模板时保留） */
export type SharedPersonalFields = {
  name: string;
  englishName: string;
  title: string;
  phoneRegion: string;
  phone: string;
  /** 仅本地部分，不含 @ */
  emailLocal: string;
  contactNote: string;
  tagline: string;
  department: string;
  wechat: string;
};

export type CardState = {
  schemaVersion?: typeof SCHEMA_VERSION;
  templateId: TemplateId;
  shared: SharedPersonalFields;
  templateFields: {
    A: ShoplazzaTemplateFields;
    B: SubotizTemplateFields;
  };
  visibility: Record<string, boolean>;
  assets: {
    logoDataUrl?: string;
  };
  qr: { payload: string } | null;
};

export const DEFAULT_FIELD_VALUES = {
  name: "中文名",
  englishName: "Name",
  title: "在职岗位",
  company: SHOPLAZZA_DEFAULT_COMPANY,
  phone: "13823667988",
  email: "name@shoplazza.com",
  website: SHOPLAZZA_DEFAULT_WEBSITE,
} as const;

export const defaultCardState = (): CardState => ({
  schemaVersion: SCHEMA_VERSION,
  templateId: "A",
  shared: {
    name: "",
    englishName: "",
    title: "",
    phoneRegion: DEFAULT_PHONE_REGION,
    phone: "",
    emailLocal: "",
    contactNote: "",
    tagline: "让协作更简单",
    department: "研发中心",
    wechat: "wechat_id",
  },
  templateFields: {
    A: {
      company: SHOPLAZZA_DEFAULT_COMPANY,
      website: SHOPLAZZA_DEFAULT_WEBSITE,
      addressPreset: DEFAULT_ADDRESS_PRESET,
      address: buildAddressText(DEFAULT_ADDRESS_PRESET),
      addressExtra: "",
      locks: { company: true },
    },
    B: {
      company: SUBOTIZ_DEFAULT_COMPANY,
      website: SUBOTIZ_DEFAULT_WEBSITE,
      addressExtra: "",
      locks: { company: true, website: true },
    },
  },
  visibility: {
    name: true,
    englishName: true,
  },
  assets: {},
  qr: null,
});
