import { formatPhoneForDisplay } from "@/lib/config/phoneRegions";
import { DEFAULT_FIELD_VALUES, type CardState } from "@/lib/types/card";

export function resolveFieldDisplayValue(
  state: CardState,
  key: string
): string {
  if (key === "phone") {
    const phone = state.fields.phone || DEFAULT_FIELD_VALUES.phone;
    return formatPhoneForDisplay(
      state.fields.phoneRegion,
      phone
    );
  }
  const value = state.fields[key]?.trim();
  return value || DEFAULT_FIELD_VALUES[key as keyof typeof DEFAULT_FIELD_VALUES] || "";
}
