import {
  buildAddressText,
  cityKeyToPresetId,
  DEFAULT_ADDRESS_PRESET,
  normalizeAddressPresetId,
  type AddressPresetId,
} from "@/lib/config/addressPresets";
import type { ShoplazzaAddressSlot, ShoplazzaTemplateFields } from "@/lib/types/card";

function slotRawText(slot: ShoplazzaAddressSlot): string {
  if (slot.preset === "none") return (slot.customText ?? "").trim();
  return buildAddressText(slot.preset);
}

/** 已下线的预置 id：在 finalize / 旧稿迁移阶段直接丢弃对应槽 */
const DEPRECATED_PRESET_IDS = new Set<string>([
  "city-singapore",
  "city-los-angeles",
]);

function dropDeprecatedSlots(
  slots: ShoplazzaAddressSlot[]
): ShoplazzaAddressSlot[] {
  return slots.filter((s) => !DEPRECATED_PRESET_IDS.has(String(s.preset)));
}

/** 跨槽去重：相同非 none 预置仅保留首次出现顺序 */
export function dedupeNonNonePresetsAcrossSlots(
  slots: ShoplazzaAddressSlot[]
): ShoplazzaAddressSlot[] {
  const seen = new Set<AddressPresetId>();
  const out: ShoplazzaAddressSlot[] = [];
  for (const s of slots) {
    const preset = normalizeAddressPresetId(s.preset);
    if (preset !== "none") {
      if (seen.has(preset)) continue;
      seen.add(preset);
    }
    out.push({
      preset,
      customText: preset === "none" ? (s.customText ?? "") : "",
    });
  }
  return out;
}

/** 若含深圳预置，深圳槽置顶，其余相对顺序不变 */
export function normalizeAddressSlotsOrder(
  slots: ShoplazzaAddressSlot[]
): ShoplazzaAddressSlot[] {
  const shenzhenId: AddressPresetId = "city-shenzhen";
  const idx = slots.findIndex((s) => normalizeAddressPresetId(s.preset) === shenzhenId);
  if (idx <= 0) return slots;
  const copy = [...slots];
  const [sz] = copy.splice(idx, 1);
  return sz ? [sz, ...copy] : slots;
}

function clampSlotCount(slots: ShoplazzaAddressSlot[]): ShoplazzaAddressSlot[] {
  if (slots.length === 0) {
    return [{ preset: DEFAULT_ADDRESS_PRESET, customText: "" }];
  }
  if (slots.length > 3) return slots.slice(0, 3);
  return slots;
}

function buildAddressStringFromNormalizedSlots(
  slots: ShoplazzaAddressSlot[]
): string {
  const pieces = slots
    .map((slot) => slotRawText(slot).replace(/\s+$/u, ""))
    .filter((p) => p.length > 0);
  return pieces.join("\n").replace(/\s+$/u, "");
}

/**
 * 规范化槽位（数量、去重、深圳置顶）并写回派生字段：`address`、`addressPreset`（= 首槽）、`addressExtra` 置空。
 * 保留预置中已有的显式 `\n` 换行，不再按宽度自动断行。
 */
export function finalizeShoplazzaATemplateFields(
  a: ShoplazzaTemplateFields
): ShoplazzaTemplateFields {
  let slots = a.addressSlots?.length
    ? [...a.addressSlots]
    : legacySlotsFromFlatA(a);

  slots = dropDeprecatedSlots(slots);

  slots = clampSlotCount(
    normalizeAddressSlotsOrder(dedupeNonNonePresetsAcrossSlots(slots))
  );
  const address = buildAddressStringFromNormalizedSlots(slots);
  const addressPreset = normalizeAddressPresetId(slots[0]?.preset);

  return {
    ...a,
    addressSlots: slots,
    addressPreset,
    address,
    addressExtra: "",
  };
}

/** 无 `addressSlots` 的旧稿：由正文行 + 预置 + 补充推断槽位 */
export function legacySlotsFromFlatA(a: ShoplazzaTemplateFields): ShoplazzaAddressSlot[] {
  const preset = normalizeAddressPresetId(a.addressPreset);
  const main = (a.address ?? "").trim();
  const extra = (a.addressExtra ?? "").trim();
  const lines = main.split(/\n/).map((l) => l.trim()).filter(Boolean);

  /** 旧稿中可能保存了被字符级换行污染的 address 文本（含半行）；
   *  优先以 addressPreset 字段为准恢复预置槽，避免逐行匹配把整段地址打散为 `none` 槽。 */
  if (preset !== "none") {
    const collapsedMain = main.replace(/\s+/g, " ").trim();
    const expected = buildAddressText(preset).replace(/\s+/g, " ").trim();
    if (!collapsedMain || collapsedMain === expected) {
      const out: ShoplazzaAddressSlot[] = [{ preset, customText: "" }];
      if (extra) out.push({ preset: "none", customText: extra });
      return clampSlotCount(out);
    }
  }

  const slots: ShoplazzaAddressSlot[] = [];

  const PRESET_IDS = [
    "city-shenzhen",
    "city-guangzhou",
    "city-wuhan",
    "city-kunming",
    "city-shanghai",
  ] as const;

  // 多行预置（含显式 `\n`）：与连续若干行整体匹配
  const PRESET_LINE_GROUPS = PRESET_IDS.map((id) => ({
    id,
    lines: buildAddressText(id).split("\n").map((l) => l.trim()),
  }));

  let i = 0;
  while (i < lines.length) {
    let matched = false;
    for (const grp of PRESET_LINE_GROUPS) {
      const n = grp.lines.length;
      if (n === 0 || i + n > lines.length) continue;
      let ok = true;
      for (let k = 0; k < n; k++) {
        if (lines[i + k] !== grp.lines[k]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        slots.push({ preset: grp.id, customText: "" });
        i += n;
        matched = true;
        break;
      }
    }
    if (!matched) {
      slots.push({ preset: "none", customText: lines[i]! });
      i += 1;
    }
  }

  if (slots.length === 0) {
    if (preset === "none" && (main || extra)) {
      slots.push({
        preset: "none",
        customText: [main, extra].filter(Boolean).join("\n"),
      });
    } else {
      slots.push({
        preset,
        customText: preset === "none" ? main : "",
      });
      if (extra && slots.length < 3) {
        slots.push({ preset: "none", customText: extra });
      } else if (extra) {
        const last = slots[slots.length - 1]!;
        last.customText = [last.customText, extra].filter(Boolean).join(" ").trim();
      }
    }
  } else if (extra) {
    const last = slots[slots.length - 1]!;
    last.customText = [last.customText, extra].filter(Boolean).join(" ").trim();
  }

  return clampSlotCount(dropDeprecatedSlots(slots).slice(0, 3));
}

/**
 * 欢迎页：按识别城市顺序建槽；`customNote` 在未满三槽时追加 none 槽，否则并入末槽 `customText`。
 */
export function slotsFromLandingMatchedCities(
  matchedCityKeys: string[],
  customNote: string
): ShoplazzaAddressSlot[] {
  const slots: ShoplazzaAddressSlot[] = [];
  const used = new Set<AddressPresetId>();

  for (const ck of matchedCityKeys) {
    const pid = cityKeyToPresetId(ck);
    if (!pid || pid === "none") continue;
    if (used.has(pid)) continue;
    if (slots.length >= 3) break;
    slots.push({ preset: pid, customText: "" });
    used.add(pid);
  }

  const note = customNote.trim();
  if (note) {
    if (slots.length < 3) {
      slots.push({ preset: "none", customText: note });
    } else {
      const last = slots[slots.length - 1]!;
      last.customText = [last.customText, note].filter(Boolean).join(" ").trim();
    }
  }

  if (slots.length === 0) {
    return [{ preset: DEFAULT_ADDRESS_PRESET, customText: "" }];
  }
  return slots;
}
