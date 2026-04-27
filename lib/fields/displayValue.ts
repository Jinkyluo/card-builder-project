import { getEffectiveFields } from "@/lib/card/effectiveFields";
import { formatPhoneForDisplay } from "@/lib/config/phoneRegions";
import {
  DEFAULT_FIELD_VALUES,
  SHOPLAZZA_DEFAULT_WEBSITE,
  SUBOTIZ_DEFAULT_COMPANY,
  SUBOTIZ_DEFAULT_WEBSITE,
  type CardState,
} from "@/lib/types/card";

export function resolveFieldLayoutValue(state: CardState, key: string): string {
  const eff = getEffectiveFields(state);

  if (key === "contactNote" || key === "addressExtra") {
    return (eff[key] ?? "").trim();
  }
  if (key === "phone") {
    const phone = eff.phone || DEFAULT_FIELD_VALUES.phone;
    const dialCustom = (eff.phoneDialCodeCustom ?? "").trim();
    return formatPhoneForDisplay(
      eff.phoneRegion,
      phone,
      dialCustom.length > 0 ? dialCustom : undefined,
    );
  }

  if (key === "company" && state.templateId === "A") {
    return (eff.company ?? "").trim();
  }
  if (key === "website" && state.templateId === "A") {
    const value = eff.website?.trim();
    return value || SHOPLAZZA_DEFAULT_WEBSITE;
  }
  if (key === "company" && state.templateId === "B") {
    const value = eff.company?.trim();
    return value || SUBOTIZ_DEFAULT_COMPANY;
  }
  if (key === "website" && state.templateId === "B") {
    const value = eff.website?.trim();
    return value || SUBOTIZ_DEFAULT_WEBSITE;
  }

  const value = eff[key]?.trim();
  return value || DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] || "";
}

export function resolveFieldDisplayValue(
  state: CardState,
  key: string
): string {
  if (state.visibility[key] === false) {
    return "";
  }

  return resolveFieldLayoutValue(state, key);
}
