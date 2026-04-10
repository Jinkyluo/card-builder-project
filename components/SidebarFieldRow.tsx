"use client";

import type { Dispatch, SetStateAction } from "react";
import { EyeIcon, EyeOffIcon, LockIcon, LockOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "@/app/page.module.css";
import {
  ADDRESS_PRESETS,
  buildAddressText,
} from "@/lib/config/addressPresets";
import {
  formatLocalPhoneForDisplay,
  getPhoneRegionOption,
  normalizePhoneDigits,
  PHONE_REGION_OPTIONS,
} from "@/lib/config/phoneRegions";
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
import type { CardState } from "@/lib/types/card";
import {
  DEFAULT_FIELD_VALUES,
  emailSuffixForTemplate,
  SUBOTIZ_DEFAULT_COMPANY,
  SUBOTIZ_DEFAULT_WEBSITE,
} from "@/lib/types/card";
import { labelForField } from "@/lib/i18n/fieldLabels";

const WEBSITE_OPTIONS = ["www.shoplazza.cn", "www.shoplazza.com"] as const;
const WEBSITE_ITEMS = WEBSITE_OPTIONS.map((option) => ({
  label: option,
  value: option,
}));
const PHONE_REGION_ITEMS = PHONE_REGION_OPTIONS.map((option) => ({
  label: `${option.dialCode} ${option.label}`,
  value: option.id,
}));
const ADDRESS_PRESET_ITEMS = ADDRESS_PRESETS.map((preset) => ({
  label: preset.label,
  value: preset.id,
}));

type Props = {
  fieldKey: string;
  state: CardState;
  setState: Dispatch<SetStateAction<CardState>>;
  phoneError: string | null;
  selectedPhoneRegion: ReturnType<typeof getPhoneRegionOption>;
  isNameFieldVisible: (key: string) => boolean;
};

export function SidebarFieldRow({
  fieldKey: key,
  state,
  setState,
  phoneError,
  selectedPhoneRegion,
  isNameFieldVisible,
}: Props) {
  if (key === "phone") {
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
        <div className={styles.phoneRow}>
          <Select
            items={PHONE_REGION_ITEMS}
            value={state.shared.phoneRegion ?? ""}
            onValueChange={(phoneRegion) =>
              setState((s) => ({
                ...s,
                shared: {
                  ...s.shared,
                  phoneRegion:
                    phoneRegion ?? s.shared.phoneRegion ?? selectedPhoneRegion.id,
                },
              }))
            }
          >
            <SelectTrigger
              aria-label="选择电话号码地区"
              className={cn(styles.selectTrigger, styles.phoneCodeTrigger)}
            >
              <SelectValue className={styles.selectValue}>
                {(value) =>
                  getPhoneRegionOption(String(value ?? state.shared.phoneRegion))
                    .dialCode
                }
              </SelectValue>
            </SelectTrigger>
            <SelectPopup className={styles.selectPopupList}>
              {PHONE_REGION_OPTIONS.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className={styles.selectPopupItem}
                >
                  {option.dialCode} {option.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
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
    const addrLabel = state.templateId === "B" ? "地址" : "公司";
    const locks =
      state.templateId === "A"
        ? state.templateFields.A.locks
        : state.templateFields.B.locks;
    const companyValue =
      state.templateId === "A"
        ? state.templateFields.A.company
        : state.templateFields.B.company;

    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
        <InputGroup className={styles.inputGroupField}>
          <InputGroupInput
            className={styles.inputGroupInput}
            placeholder={
              state.templateId === "B"
                ? SUBOTIZ_DEFAULT_COMPANY
                : (DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] ?? "")
            }
            value={companyValue ?? ""}
            disabled={locks.company !== false}
            onChange={(ev) => {
              const v = ev.target.value;
              setState((s) =>
                s.templateId === "A"
                  ? {
                      ...s,
                      templateFields: {
                        ...s.templateFields,
                        A: { ...s.templateFields.A, company: v },
                      },
                    }
                  : {
                      ...s,
                      templateFields: {
                        ...s.templateFields,
                        B: { ...s.templateFields.B, company: v },
                      },
                    }
              );
            }}
          />
          <InputGroupAddon align="inline-end" className={styles.inputGroupActionAddon}>
            <button
              type="button"
              className={styles.inputGroupActionButton}
              aria-label={`${locks.company !== false ? "解锁" : "锁定"}${addrLabel}编辑`}
              aria-pressed={locks.company === false}
              onClick={() =>
                setState((s) =>
                  s.templateId === "A"
                    ? {
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
                      }
                    : {
                        ...s,
                        templateFields: {
                          ...s.templateFields,
                          B: {
                            ...s.templateFields.B,
                            locks: {
                              ...s.templateFields.B.locks,
                              company: s.templateFields.B.locks.company === false,
                            },
                          },
                        },
                      }
                )
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
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key, state.templateId)}</span>
        <textarea
          className={styles.textareaControl}
          rows={2}
          placeholder="选填"
          value={state.templateFields.A.addressExtra ?? ""}
          onChange={(ev) =>
            setState((s) => ({
              ...s,
              templateFields: {
                ...s.templateFields,
                A: { ...s.templateFields.A, addressExtra: ev.target.value },
              },
            }))
          }
        />
      </>
    );
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

export function ShoplazzaAddressPresetBlock({
  state,
  setState,
}: {
  state: CardState;
  setState: Dispatch<SetStateAction<CardState>>;
}) {
  return (
    <>
      <span className={styles.fieldLabel}>{labelForField("addressPreset")}</span>
      <Select
        aria-label="选择地址地区"
        items={ADDRESS_PRESET_ITEMS}
        value={state.templateFields.A.addressPreset ?? ""}
        onValueChange={(nextAddressPreset) => {
          const addressPreset =
            nextAddressPreset ?? state.templateFields.A.addressPreset ?? "";
          setState((s) => ({
            ...s,
            templateFields: {
              ...s.templateFields,
              A: {
                ...s.templateFields.A,
                addressPreset,
                address: buildAddressText(addressPreset),
                ...(addressPreset !== "none" ? { addressExtra: "" } : {}),
              },
            },
          }));
        }}
      >
        <SelectTrigger className={styles.selectTrigger}>
          <SelectValue className={styles.selectValue} />
        </SelectTrigger>
        <SelectPopup className={styles.selectPopupList}>
          {ADDRESS_PRESETS.map((preset) => (
            <SelectItem
              key={preset.id}
              value={preset.id}
              className={styles.selectPopupItem}
            >
              {preset.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </>
  );
}
