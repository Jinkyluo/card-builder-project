import {
  buildAddressText,
  DEFAULT_ADDRESS_PRESET,
} from "@/lib/config/addressPresets";
import { DEFAULT_PHONE_REGION } from "@/lib/config/phoneRegions";

export type TemplateId = "A" | "B";

export type CardState = {
  templateId: TemplateId;
  fields: Record<string, string>;
  visibility: Record<string, boolean>;
  locks: Record<string, boolean>;
  assets: {
    logoDataUrl?: string;
  };
  qr: { payload: string } | null;
};

export const DEFAULT_FIELD_VALUES = {
  name: "中文名",
  englishName: "Name",
  title: "在职岗位",
  company: "深圳店匠科技有限公司",
  phone: "13823667988",
  email: "name@shoplazza.com",
  website: "www.shoplazza.cn",
} as const;

export const defaultCardState = (): CardState => ({
  templateId: "A",
  fields: {
    name: "",
    englishName: "",
    title: "",
    company: "",
    phoneRegion: DEFAULT_PHONE_REGION,
    phone: "",
    email: "",
    addressPreset: DEFAULT_ADDRESS_PRESET,
    address: buildAddressText(DEFAULT_ADDRESS_PRESET),
    website: "",
    contactNote: "",
    addressExtra: "",
    tagline: "让协作更简单",
    department: "研发中心",
    wechat: "wechat_id",
  },
  visibility: {
    name: true,
    englishName: true,
  },
  locks: {
    company: true,
  },
  assets: {},
  qr: null,
});
