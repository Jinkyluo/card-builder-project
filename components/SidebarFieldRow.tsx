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
} from "@/components/ui/input-group";
import type { CardState } from "@/lib/types/card";
import { DEFAULT_FIELD_VALUES } from "@/lib/types/card";
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
        <span className={styles.fieldLabel}>{labelForField(key)}</span>
        <div className={styles.phoneRow}>
          <Select
            items={PHONE_REGION_ITEMS}
            value={state.fields.phoneRegion ?? ""}
            onValueChange={(phoneRegion) =>
              setState((s) => ({
                ...s,
                fields: {
                  ...s.fields,
                  phoneRegion:
                    phoneRegion ?? s.fields.phoneRegion ?? selectedPhoneRegion.id,
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
                  getPhoneRegionOption(String(value ?? state.fields.phoneRegion))
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
                state.fields.phoneRegion,
                DEFAULT_FIELD_VALUES.phone
              )}
              value={formatLocalPhoneForDisplay(
                state.fields.phoneRegion,
                state.fields.phone
              )}
              onChange={(ev) =>
                setState((s) => ({
                  ...s,
                  fields: {
                    ...s.fields,
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
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key)}</span>
        <Select
          aria-label="选择网站"
          items={WEBSITE_ITEMS}
          value={state.fields.website || DEFAULT_FIELD_VALUES.website}
          onValueChange={(website) =>
            setState((s) => ({
              ...s,
              fields: {
                ...s.fields,
                website: website ?? s.fields.website ?? DEFAULT_FIELD_VALUES.website,
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
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key)}</span>
        <div className={styles.controlShell}>
          <input
            className={styles.control}
            type="email"
            autoComplete="email"
            placeholder={DEFAULT_FIELD_VALUES.email}
            value={state.fields.email ?? ""}
            onChange={(ev) =>
              setState((s) => ({
                ...s,
                fields: { ...s.fields, email: ev.target.value },
              }))
            }
          />
        </div>
      </>
    );
  }

  if (key === "company") {
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key)}</span>
        <InputGroup className={styles.inputGroupField}>
          <InputGroupInput
            className={styles.inputGroupInput}
            placeholder={
              DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] ?? ""
            }
            value={state.fields[key] ?? ""}
            disabled={state.locks.company !== false}
            onChange={(ev) =>
              setState((s) => ({
                ...s,
                fields: { ...s.fields, [key]: ev.target.value },
              }))
            }
          />
          <InputGroupAddon align="inline-end" className={styles.inputGroupActionAddon}>
            <button
              type="button"
              className={styles.inputGroupActionButton}
              aria-label={`${state.locks.company !== false ? "解锁" : "锁定"}公司名称编辑`}
              aria-pressed={state.locks.company === false}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  locks: {
                    ...s.locks,
                    company: s.locks.company === false,
                  },
                }))
              }
            >
              {state.locks.company !== false ? <LockIcon /> : <LockOpenIcon />}
            </button>
          </InputGroupAddon>
        </InputGroup>
      </>
    );
  }

  if (key === "addressExtra") {
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key)}</span>
        <textarea
          className={styles.textareaControl}
          rows={2}
          placeholder="选填"
          value={state.fields.addressExtra ?? ""}
          onChange={(ev) =>
            setState((s) => ({
              ...s,
              fields: { ...s.fields, addressExtra: ev.target.value },
            }))
          }
        />
      </>
    );
  }

  if (key === "address" && state.templateId === "B") {
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key)}</span>
        <textarea
          className={styles.textareaControl}
          rows={3}
          placeholder="详细地址"
          value={state.fields.address ?? ""}
          onChange={(ev) =>
            setState((s) => ({
              ...s,
              fields: { ...s.fields, address: ev.target.value },
            }))
          }
        />
      </>
    );
  }

  if (key === "name" || key === "englishName") {
    return (
      <>
        <span className={styles.fieldLabel}>{labelForField(key)}</span>
        <InputGroup className={styles.inputGroupField}>
          <InputGroupInput
            className={styles.inputGroupInput}
            placeholder={
              DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] ?? ""
            }
            value={state.fields[key] ?? ""}
            onChange={(ev) =>
              setState((s) => ({
                ...s,
                fields: { ...s.fields, [key]: ev.target.value },
              }))
            }
          />
          <InputGroupAddon align="inline-end" className={styles.inputGroupActionAddon}>
            <button
              type="button"
              className={styles.inputGroupActionButton}
              aria-label={`${isNameFieldVisible(key) ? "隐藏" : "显示"}${labelForField(key)}`}
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
      <span className={styles.fieldLabel}>{labelForField(key)}</span>
      <div className={styles.controlShell}>
        <input
          className={styles.control}
          placeholder={
            DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] ?? ""
          }
          value={state.fields[key] ?? ""}
          onChange={(ev) =>
            setState((s) => ({
              ...s,
              fields: { ...s.fields, [key]: ev.target.value },
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
        value={state.fields.addressPreset ?? ""}
        onValueChange={(nextAddressPreset) => {
          const addressPreset =
            nextAddressPreset ?? state.fields.addressPreset ?? "";
          setState((s) => ({
            ...s,
            fields: {
              ...s.fields,
              addressPreset,
              address: buildAddressText(addressPreset),
              ...(addressPreset !== "none" ? { addressExtra: "" } : {}),
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
