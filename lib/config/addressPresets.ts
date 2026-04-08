export type AddressPresetId =
  | "none"
  | "sz-nanshan"
  | "sz-nanshan-longgang"
  | "sz-guangzhou"
  | "sz-kunming"
  | "sz-wuhan"
  | "sz-shanghai";

type AddressPreset = {
  id: AddressPresetId;
  label: string;
  cities: string[];
};

export const CITY_ADDRESS: Record<string, string> = {
  深圳: "深圳市南山区彩讯科技大厦 27 楼",
  龙岗: "深圳市龙岗区星河双子塔-西塔 1805B",
  广州: "广州市越秀区广州宾馆寰图 5F F09",
  上海: "上海市浦东新区快易名商办公中心 C1 栋 105",
  武汉: "武汉市洪山区保利天悦中心 1605",
  昆明: "昆明市五华区中铁云时代广场 A 座 7F G05",
};

export const ADDRESS_PRESETS: AddressPreset[] = [
  { id: "sz-nanshan", label: "深圳南山", cities: ["深圳"] },
  {
    id: "sz-nanshan-longgang",
    label: "深圳南山 + 龙岗",
    cities: ["深圳", "龙岗"],
  },
  { id: "sz-guangzhou", label: "深圳 + 广州", cities: ["深圳", "广州"] },
  { id: "sz-kunming", label: "深圳 + 昆明", cities: ["深圳", "昆明"] },
  { id: "sz-wuhan", label: "深圳 + 武汉", cities: ["深圳", "武汉"] },
  { id: "sz-shanghai", label: "深圳 + 上海", cities: ["深圳", "上海"] },
  { id: "none", label: "自定义输入", cities: [] },
];

export const DEFAULT_ADDRESS_PRESET: AddressPresetId = "sz-nanshan";

export function getAddressPreset(id: string | undefined): AddressPreset {
  if (id) {
    const found = ADDRESS_PRESETS.find((item) => item.id === id);
    if (found) return found;
  }
  return ADDRESS_PRESETS.find((item) => item.id === DEFAULT_ADDRESS_PRESET)!;
}

export function buildAddressText(id: string | undefined): string {
  const preset = getAddressPreset(id);
  return preset.cities
    .map((city) => CITY_ADDRESS[city])
    .filter(Boolean)
    .join("\n");
}

export function inferAddressPresetId(addressText: string | undefined): AddressPresetId {
  const normalized = (addressText ?? "").trim();
  if (normalized === "") return "none";
  const match = ADDRESS_PRESETS.find((preset) => {
    const expected = buildAddressText(preset.id);
    return expected === normalized;
  });
  return match?.id ?? DEFAULT_ADDRESS_PRESET;
}
