"use client";

import { Fragment, type Dispatch, type SetStateAction } from "react";
import { EyeIcon, EyeOffIcon, LockIcon, LockOpenIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "@/app/page.module.css";
import {
  ADDRESS_PRESETS,
  normalizeAddressPresetId,
  type AddressPresetId,
} from "@/lib/config/addressPresets";
import { finalizeShoplazzaATemplateFields } from "@/lib/card/shoplazzaAddressSlots";
import {
  DEFAULT_PHONE_REGION,
  formatLocalPhoneForDisplay,
  getPhoneRegionOption,
  matchPhoneRegionFromDialInput,
  normalizeDialCodeInput,
  normalizePhoneDigits,
  PHONE_REGION_OPTIONS,
} from "@/lib/config/phoneRegions";
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { parseEmailLocal } from "@/lib/card/effectiveFields";
import type { CardState, ShoplazzaAddressSlot } from "@/lib/types/card";
import {
  DEFAULT_FIELD_VALUES,
  emailSuffixForTemplate,
  SUBOTIZ_DEFAULT_WEBSITE,
} from "@/lib/types/card";
import { labelForField } from "@/lib/i18n/fieldLabels";

const WEBSITE_OPTIONS = ["www.shoplazza.cn", "www.shoplazza.com"] as const;
const WEBSITE_ITEMS = WEBSITE_OPTIONS.map((option) => ({
  label: option,
  value: option,
}));

const PHONE_COMBO_ITEM_IDS = PHONE_REGION_OPTIONS.map((option) => option.id);

/** 不在下拉中展示；用于手输区号时避免 Base UI 在弹层关闭把 `value=null` 同步成空串并冲掉输入 */
const PHONE_COMBO_CUSTOM_VALUE = "__phone_dial_custom__";

const PHONE_COMBO_ROOT_ITEMS = [PHONE_COMBO_CUSTOM_VALUE, ...PHONE_COMBO_ITEM_IDS];

type Props = {
  fieldKey: string;
  state: CardState;
  setState: Dispatch<SetStateAction<CardState>>;
  phoneError: string | null;
  isNameFieldVisible: (key: string) => boolean;
};

export function SidebarFieldRow({
  fieldKey: key,
  state,
  setState,
  phoneError,
  isNameFieldVisible,
}: Props) {
  if (key === "phone") {
    const regionId = state.shared.phoneRegion ?? DEFAULT_PHONE_REGION;
    const customDialRaw = state.shared.phoneDialCodeCustom ?? "";
    const trimCustom = customDialRaw.trim();
    const presetDial = getPhoneRegionOption(regionId).dialCode;
    const comboboxValue = trimCustom ? PHONE_COMBO_CUSTOM_VALUE : regionId;
    const dialInputValue = trimCustom ? customDialRaw : presetDial;

    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
        <div className={styles.phoneRow}>
          <div className={styles.phoneCodeTrigger}>
            <Combobox<string>
              autoComplete="off"
              filter={null}
              filteredItems={PHONE_COMBO_ITEM_IDS}
              items={PHONE_COMBO_ROOT_ITEMS}
              itemToStringLabel={(id) =>
                id === PHONE_COMBO_CUSTOM_VALUE
                  ? customDialRaw
                  : getPhoneRegionOption(id).dialCode
              }
              inputValue={dialInputValue}
              onInputValueChange={(newInput) =>
                setState((s) => {
                  const byDial = PHONE_REGION_OPTIONS.find((o) => o.dialCode === newInput);
                  if (byDial) {
                    return {
                      ...s,
                      shared: {
                        ...s.shared,
                        phoneRegion: byDial.id,
                        phoneDialCodeCustom: "",
                      },
                    };
                  }
                  const rid = s.shared.phoneRegion ?? DEFAULT_PHONE_REGION;
                  const preset = getPhoneRegionOption(rid).dialCode;
                  if (newInput === preset) {
                    return { ...s, shared: { ...s.shared, phoneDialCodeCustom: "" } };
                  }
                  return {
                    ...s,
                    shared: { ...s.shared, phoneDialCodeCustom: newInput },
                  };
                })
              }
              value={comboboxValue}
              onValueChange={(nextRegion) => {
                if (typeof nextRegion !== "string") return;
                if (nextRegion === PHONE_COMBO_CUSTOM_VALUE) return;
                setState((s) => ({
                  ...s,
                  shared: {
                    ...s.shared,
                    phoneRegion: nextRegion,
                    phoneDialCodeCustom: "",
                  },
                }));
              }}
            >
              <ComboboxInput
                aria-label="电话国际区号"
                placeholder="选择或输入区号"
                showClear={false}
                onBlur={() => {
                  setState((s) => {
                    const raw = (s.shared.phoneDialCodeCustom ?? "").trim();
                    if (!raw) {
                      return { ...s, shared: { ...s.shared, phoneDialCodeCustom: "" } };
                    }
                    const match = matchPhoneRegionFromDialInput(raw);
                    if (match) {
                      return {
                        ...s,
                        shared: {
                          ...s.shared,
                          phoneRegion: match.id,
                          phoneDialCodeCustom: "",
                        },
                      };
                    }
                    const norm = normalizeDialCodeInput(raw);
                    return {
                      ...s,
                      shared: {
                        ...s.shared,
                        phoneDialCodeCustom: norm || "",
                      },
                    };
                  });
                }}
              />
              <ComboboxPopup align="start" sideOffset={4}>
                <ComboboxList className={styles.selectPopupList}>
                  {(rid: string) => {
                    if (rid === PHONE_COMBO_CUSTOM_VALUE) {
                      return (
                        <ComboboxItem
                          key={rid}
                          aria-hidden
                          className="sr-only h-0 min-h-0 overflow-hidden p-0 opacity-0"
                          value={rid}
                        >
                          {'\u00a0'}
                        </ComboboxItem>
                      );
                    }
                    const option = getPhoneRegionOption(rid);
                    return (
                      <ComboboxItem
                        key={rid}
                        className={styles.selectPopupItem}
                        value={rid}
                      >
                        {option.dialCode} {option.label}
                      </ComboboxItem>
                    );
                  }}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
          </div>
          <div className={styles.controlShell}>
            <input
              className={styles.control}
              placeholder={formatLocalPhoneForDisplay(
                state.shared.phoneRegion,
                DEFAULT_FIELD_VALUES.phone
              )}
              value={formatLocalPhoneForDisplay(
                state.shared.phoneRegion,
                state.shared.phone
              )}
              onChange={(ev) =>
                setState((s) => ({
                  ...s,
                  shared: {
                    ...s.shared,
                    phone: normalizePhoneDigits(ev.target.value),
                  },
                }))
              }
            />
          </div>
        </div>
        {phoneError && (
          <p className={cn(styles.helperText, styles.errorText)}>{phoneError}</p>
        )}
      </>
    );
  }

  if (key === "website") {
    if (state.templateId === "B") {
      const locks = state.templateFields.B.locks;
      return (
        <>
          <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
          <InputGroup className={styles.inputGroupField}>
            <InputGroupInput
              className={styles.inputGroupInput}
              placeholder={SUBOTIZ_DEFAULT_WEBSITE}
              value={state.templateFields.B.website ?? ""}
              disabled={locks.website !== false}
              onChange={(ev) =>
                setState((s) => ({
                  ...s,
                  templateFields: {
                    ...s.templateFields,
                    B: { ...s.templateFields.B, website: ev.target.value },
                  },
                }))
              }
            />
            <InputGroupAddon align="inline-end" className={styles.inputGroupActionAddon}>
              <button
                type="button"
                className={styles.inputGroupActionButton}
                aria-label={`${locks.website !== false ? "解锁" : "锁定"}网站编辑`}
                aria-pressed={locks.website === false}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    templateFields: {
                      ...s.templateFields,
                      B: {
                        ...s.templateFields.B,
                        locks: {
                          ...s.templateFields.B.locks,
                          website: s.templateFields.B.locks.website === false,
                        },
                      },
                    },
                  }))
                }
              >
                {locks.website !== false ? <LockIcon /> : <LockOpenIcon />}
              </button>
            </InputGroupAddon>
          </InputGroup>
        </>
      );
    }
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
        <Select
          aria-label="选择网站"
          items={WEBSITE_ITEMS}
          value={state.templateFields.A.website || DEFAULT_FIELD_VALUES.website}
          onValueChange={(website) =>
            setState((s) => ({
              ...s,
              templateFields: {
                ...s.templateFields,
                A: {
                  ...s.templateFields.A,
                  website: website ?? s.templateFields.A.website ?? DEFAULT_FIELD_VALUES.website,
                },
              },
            }))
          }
        >
          <SelectTrigger className={styles.selectTrigger}>
            <SelectValue className={styles.selectValue} />
          </SelectTrigger>
          <SelectPopup className={styles.selectPopupList}>
            {WEBSITE_OPTIONS.map((option) => (
              <SelectItem
                key={option}
                value={option}
                className={styles.selectPopupItem}
              >
                {option}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </>
    );
  }

  if (key === "email") {
    const suffix = emailSuffixForTemplate(state.templateId);
    const local = state.shared.emailLocal;
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
        <InputGroup className={styles.inputGroupField}>
          <InputGroupInput
            className={styles.inputGroupInput}
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="name"
            value={local}
            onChange={(ev) => {
              const v = parseEmailLocal(ev.target.value);
              setState((s) => ({
                ...s,
                shared: { ...s.shared, emailLocal: v },
              }));
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{suffix}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </>
    );
  }

  if (key === "company") {
    if (state.templateId === "B") {
      return <SubotizAddressPresetBlock state={state} setState={setState} />;
    }

    const locks = state.templateFields.A.locks;
    const companyValue = state.templateFields.A.company;

    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
        <InputGroup className={styles.inputGroupField}>
          <InputGroupInput
            className={styles.inputGroupInput}
            placeholder={
              DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] ?? ""
            }
            value={companyValue ?? ""}
            disabled={locks.company !== false}
            onChange={(ev) => {
              const v = ev.target.value;
              setState((s) => ({
                ...s,
                templateFields: {
                  ...s.templateFields,
                  A: { ...s.templateFields.A, company: v },
                },
              }));
            }}
          />
          <InputGroupAddon align="inline-end" className={styles.inputGroupActionAddon}>
            <button
              type="button"
              className={styles.inputGroupActionButton}
              aria-label={`${locks.company !== false ? "解锁" : "锁定"}公司编辑`}
              aria-pressed={locks.company === false}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  templateFields: {
                    ...s.templateFields,
                    A: {
                      ...s.templateFields.A,
                      locks: {
                        ...s.templateFields.A.locks,
                        company: s.templateFields.A.locks.company === false,
                      },
                    },
                  },
                }))
              }
            >
              {locks.company !== false ? <LockIcon /> : <LockOpenIcon />}
            </button>
          </InputGroupAddon>
        </InputGroup>
      </>
    );
  }

  if (key === "addressExtra") {
    return null;
  }

  if (key === "name" || key === "englishName") {
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
        <InputGroup className={styles.inputGroupField}>
          <InputGroupInput
            className={styles.inputGroupInput}
            placeholder={
              DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] ?? ""
            }
            value={state.shared[key] ?? ""}
            onChange={(ev) =>
              setState((s) => ({
                ...s,
                shared: { ...s.shared, [key]: ev.target.value },
              }))
            }
          />
          <InputGroupAddon align="inline-end" className={styles.inputGroupActionAddon}>
            <button
              type="button"
              className={styles.inputGroupActionButton}
              aria-label={`${isNameFieldVisible(key) ? "隐藏" : "显示"}${labelForField(key, state.templateId)}`}
              aria-pressed={isNameFieldVisible(key)}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  visibility: {
                    ...s.visibility,
                    [key]: s.visibility[key] === false,
                  },
                }))
              }
            >
              {isNameFieldVisible(key) ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </InputGroupAddon>
        </InputGroup>
      </>
    );
  }

  return (
    <>
      <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
      <div className={styles.controlShell}>
        <input
          className={styles.control}
          placeholder={
            DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] ?? ""
          }
          value={state.shared[key as keyof typeof state.shared] ?? ""}
          onChange={(ev) =>
            setState((s) => ({
              ...s,
              shared: { ...s.shared, [key]: ev.target.value },
            }))
          }
        />
      </div>
    </>
  );
}

function nextAvailableSlotPreset(usedNonNone: Set<AddressPresetId>): AddressPresetId {
  for (const p of ADDRESS_PRESETS) {
    if (p.id === "none") continue;
    if (!usedNonNone.has(p.id)) return p.id;
  }
  return "none";
}

export function ShoplazzaAddressPresetBlock({
  state,
  setState,
}: {
  state: CardState;
  setState: Dispatch<SetStateAction<CardState>>;
}) {
  const slots = state.templateFields.A.addressSlots ?? [];

  const applySlots = (next: ShoplazzaAddressSlot[]) => {
    setState((s) => ({
      ...s,
      templateFields: {
        ...s.templateFields,
        A: finalizeShoplazzaATemplateFields({
          ...s.templateFields.A,
          addressSlots: next,
        }),
      },
    }));
  };

  return (
    <div className={styles.addressModule}>
      <div className={styles.addressSlotsHeaderBar}>
        <span className={styles.fieldLabel}>{labelForField("addressPreset")}</span>
        {slots.length < 3 && (
          <button
            type="button"
            className={cn(styles.buttonBase, styles.addressAddPillButton)}
            onClick={() => {
              const used = new Set<AddressPresetId>();
              for (const s of slots) {
                const pid = normalizeAddressPresetId(s.preset);
                if (pid !== "none") used.add(pid);
              }
              const preset = nextAvailableSlotPreset(used);
              applySlots([...slots, { preset, customText: "" }]);
            }}
          >
            增加地址+
          </button>
        )}
      </div>
      <div
        className={cn(
          styles.addressSlotsGrid,
          slots.length <= 1 && styles.addressSlotsGridSingle,
        )}
      >
        {slots.map((slot, index) => {
        const current = normalizeAddressPresetId(slot.preset);
        const usedElsewhere = new Set<AddressPresetId>();
        slots.forEach((s, j) => {
          if (j === index) return;
          const p = normalizeAddressPresetId(s.preset);
          if (p !== "none") usedElsewhere.add(p);
        });
        const items = ADDRESS_PRESETS.filter((p) => {
          if (p.id === "none") return true;
          if (p.id === current) return true;
          return !usedElsewhere.has(p.id);
        }).map((p) => ({ label: p.label, value: p.id }));

        return (
          <Fragment key={index}>
            <div className={styles.addressSlotMainCell}>
              <Select
                aria-label={`地址地区 ${index + 1}`}
                items={items}
                value={current}
                onValueChange={(next) => {
                  const preset = normalizeAddressPresetId(
                    next ?? slot.preset ?? "",
                  );
                  const nextSlots = slots.map((s, j) =>
                    j === index
                      ? {
                          ...s,
                          preset,
                          customText: preset === "none" ? s.customText : "",
                        }
                      : s,
                  );
                  applySlots(nextSlots);
                }}
              >
                <SelectTrigger className={styles.selectTrigger}>
                  <SelectValue className={styles.selectValue} />
                </SelectTrigger>
                <SelectPopup className={styles.selectPopupList}>
                  {ADDRESS_PRESETS.filter((p) => items.some((i) => i.value === p.id)).map(
                    (preset) => (
                      <SelectItem
                        key={preset.id}
                        value={preset.id}
                        className={styles.selectPopupItem}
                      >
                        {preset.label}
                      </SelectItem>
                    ),
                  )}
                </SelectPopup>
              </Select>
              {current === "none" && (
                <textarea
                  className={styles.textareaControl}
                  rows={2}
                  placeholder="请输入地址，长地址可以手动换行（Shift + 回车）"
                  value={slot.customText ?? ""}
                  onChange={(ev) => {
                    const v = ev.target.value;
                    applySlots(
                      slots.map((s, j) => (j === index ? { ...s, customText: v } : s)),
                    );
                  }}
                />
              )}
            </div>
            {slots.length > 1 ? (
              <div className={styles.addressSlotTrashCell}>
                <button
                  type="button"
                  className={cn(styles.buttonBase, styles.addressSlotRemove)}
                  aria-label={`删除地址 ${index + 1}`}
                  onClick={() => {
                    applySlots(slots.filter((_, j) => j !== index));
                  }}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
            ) : null}
          </Fragment>
        );
      })}
      </div>
    </div>
  );
}

/** Subotiz（B）模板地址：单槽，仅「深圳 / 自定义」两个选项；不支持增减地址 */
export function SubotizAddressPresetBlock({
  state,
  setState,
}: {
  state: CardState;
  setState: Dispatch<SetStateAction<CardState>>;
}) {
  const presetRaw = state.templateFields.B.addressPreset ?? "city-shenzhen";
  const current: AddressPresetId =
    presetRaw === "none" ? "none" : "city-shenzhen";
  const customText = state.templateFields.B.addressCustomText ?? "";

  const items: { label: string; value: AddressPresetId }[] = [
    { label: "深圳", value: "city-shenzhen" },
    { label: "自定义", value: "none" },
  ];

  const setPreset = (next: AddressPresetId) => {
    setState((s) => ({
      ...s,
      templateFields: {
        ...s.templateFields,
        B: {
          ...s.templateFields.B,
          addressPreset: next,
          addressCustomText:
            next === "none" ? (s.templateFields.B.addressCustomText ?? "") : "",
        },
      },
    }));
  };

  const setCustomText = (v: string) => {
    setState((s) => ({
      ...s,
      templateFields: {
        ...s.templateFields,
        B: { ...s.templateFields.B, addressCustomText: v },
      },
    }));
  };

  return (
    <div className={styles.addressModule}>
      <div className={styles.addressSlotsHeaderBar}>
        <span className={styles.fieldLabel}>{labelForField("company", "B")}</span>
      </div>
      <div className={cn(styles.addressSlotsGrid, styles.addressSlotsGridSingle)}>
        <div className={styles.addressSlotMainCell}>
          <Select
            aria-label="Subotiz 地址"
            items={items}
            value={current}
            onValueChange={(next) => {
              const v = next === "none" ? "none" : "city-shenzhen";
              setPreset(v as AddressPresetId);
            }}
          >
            <SelectTrigger className={styles.selectTrigger}>
              <SelectValue className={styles.selectValue} />
            </SelectTrigger>
            <SelectPopup className={styles.selectPopupList}>
              {items.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className={styles.selectPopupItem}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {current === "none" && (
            <textarea
              className={styles.textareaControl}
              rows={2}
              placeholder="请输入地址，长地址可以手动换行（Shift + 回车）"
              value={customText}
              onChange={(ev) => setCustomText(ev.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
