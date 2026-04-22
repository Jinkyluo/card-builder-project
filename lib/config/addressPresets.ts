/** 模板 A 单城预置 id（旧双城 id 在 getAddressPreset / 迁移中映射） */
export type AddressPresetId =
  | "city-shenzhen"
  | "city-guangzhou"
  | "city-wuhan"
  | "city-kunming"
  | "city-shanghai"
  | "none";

type AddressPreset = {
  id: AddressPresetId;
  label: string;
  /** 与 CITY_ADDRESS 键一致，单元素 */
  cities: string[];
};

/** 城市键 → 名片印刷单行（多槽时各槽取一行或多行由换行逻辑处理） */
export const CITY_ADDRESS: Record<string, string> = {
  深圳: "深圳市南山区彩讯科技大厦 27 楼",
  龙岗: "深圳市龙岗区星河双子塔-西塔 1805B",
  广州: "广州市越秀区广州宾馆寰图 5F F09",
  上海: "上海市浦东新区快易名商办公中心 C1 栋 105",
  武汉: "武汉市洪山区保利天悦中心 1605",
  昆明: "昆明市五华区中铁云时代广场 A 座 7F G05",
};

export const ADDRESS_PRESETS: AddressPreset[] = [
  { id: "city-shenzhen", label: "深圳", cities: ["深圳"] },
  { id: "city-guangzhou", label: "广州", cities: ["广州"] },
  { id: "city-wuhan", label: "武汉", cities: ["武汉"] },
  { id: "city-kunming", label: "昆明", cities: ["昆明"] },
  { id: "city-shanghai", label: "上海", cities: ["上海"] },
  { id: "none", label: "自定义", cities: [] },
];

export const DEFAULT_ADDRESS_PRESET: AddressPresetId = "city-shenzhen";

/** 深圳置顶规则用 */
export const SHENZHEN_PRESET_ID: AddressPresetId = "city-shenzhen";

/** 旧版 id → 新版（双城预置取「首城」对应单城 id，迁移时再由地址正文拆槽） */
const LEGACY_PRESET_ID_MAP: Record<string, AddressPresetId> = {
  "sz-nanshan": "city-shenzhen",
  "sz-nanshan-longgang": "city-shenzhen",
  "sz-guangzhou": "city-shenzhen",
  "sz-kunming": "city-shenzhen",
  "sz-wuhan": "city-shenzhen",
  "sz-shanghai": "city-shenzhen",
  // 已下线的海外预置：normalize 时回退到深圳，槽位会在 finalize 阶段被丢弃
  "city-singapore": "city-shenzhen",
  "city-los-angeles": "city-shenzhen",
};

const KNOWN_NEW_IDS = new Set<string>(
  ADDRESS_PRESETS.map((p) => p.id) as string[],
);

export function normalizeAddressPresetId(
  id: string | undefined
): AddressPresetId {
  if (!id) return DEFAULT_ADDRESS_PRESET;
  if (KNOWN_NEW_IDS.has(id)) return id as AddressPresetId;
  return LEGACY_PRESET_ID_MAP[id] ?? DEFAULT_ADDRESS_PRESET;
}

export function getAddressPreset(id: string | undefined): AddressPreset {
  const nid = normalizeAddressPresetId(id);
  const found = ADDRESS_PRESETS.find((item) => item.id === nid);
  if (found) return found;
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
  for (const p of ADDRESS_PRESETS) {
    if (p.id === "none") continue;
    const expected = buildAddressText(p.id);
    if (expected === normalized) return p.id;
  }
  return "none";
}

/** 中文/英文城市名 → 预置 id；无法识别返回 null */
export function cityKeyToPresetId(city: string): AddressPresetId | null {
  const t = city.trim();
  if (!t) return null;
  if (t === "深圳" || t === "深圳市") return "city-shenzhen";
  if (t === "广州" || t === "广州市") return "city-guangzhou";
  if (t === "武汉" || t === "武汉市") return "city-wuhan";
  if (t === "昆明" || t === "昆明市") return "city-kunming";
  if (t === "上海" || t === "上海市") return "city-shanghai";
  if (t === "龙岗" || t === "深圳市龙岗区") return "city-shenzhen";
  return null;
}
