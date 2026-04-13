export type PhoneRegionOption = {
  id: string;
  label: string;
  dialCode: string;
  placeholder: string;
  formatLocal: (digits: string) => string;
  validate: (digits: string) => boolean;
};

function formatByGroups(digits: string, groups: number[]): string {
  if (!digits) return "";

  let cursor = 0;
  const parts: string[] = [];
  for (const groupSize of groups) {
    if (cursor >= digits.length) break;
    parts.push(digits.slice(cursor, cursor + groupSize));
    cursor += groupSize;
  }
  if (cursor < digits.length) {
    parts.push(digits.slice(cursor));
  }
  return parts.filter(Boolean).join(" ");
}

export const PHONE_REGION_OPTIONS: PhoneRegionOption[] = [
  {
    id: "CN",
    label: "中国大陆",
    dialCode: "+86",
    placeholder: "138 0000 0000",
    formatLocal: (digits) => formatByGroups(digits, [3, 4, 4]),
    validate: (digits) => /^1\d{10}$/.test(digits),
  },
  {
    id: "HK",
    label: "中国香港",
    dialCode: "+852",
    placeholder: "5123 4567",
    formatLocal: (digits) => formatByGroups(digits, [4, 4]),
    validate: (digits) => /^[235689]\d{7}$/.test(digits),
  },
  {
    id: "MO",
    label: "中国澳门",
    dialCode: "+853",
    placeholder: "6612 3456",
    formatLocal: (digits) => formatByGroups(digits, [4, 4]),
    validate: (digits) => /^[268]\d{7}$/.test(digits),
  },
  {
    id: "TW",
    label: "中国台湾",
    dialCode: "+886",
    placeholder: "912 345 678",
    formatLocal: (digits) => formatByGroups(digits, [3, 3, 3]),
    validate: (digits) => /^9\d{8}$/.test(digits),
  },
  {
    id: "SG",
    label: "新加坡",
    dialCode: "+65",
    placeholder: "8123 4567",
    formatLocal: (digits) => formatByGroups(digits, [4, 4]),
    validate: (digits) => /^[3689]\d{7}$/.test(digits),
  },
  {
    id: "US",
    label: "美国/加拿大",
    dialCode: "+1",
    placeholder: "(415) 555-0123",
    formatLocal: (digits) => {
      if (!digits) return "";
      const area = digits.slice(0, 3);
      const prefix = digits.slice(3, 6);
      const line = digits.slice(6, 10);
      if (digits.length <= 3) return area;
      if (digits.length <= 6) return `(${area}) ${prefix}`;
      return `(${area}) ${prefix}-${line}`;
    },
    validate: (digits) => /^\d{10}$/.test(digits),
  },
];

export const DEFAULT_PHONE_REGION = "CN";

export function getPhoneRegionOption(regionId?: string): PhoneRegionOption {
  return (
    PHONE_REGION_OPTIONS.find((option) => option.id === regionId) ??
    PHONE_REGION_OPTIONS[0]
  );
}

export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function inferPhoneRegionAndLocalNumber(value: string): {
  phoneRegion: string;
  phone: string;
} {
  const compact = value.trim();
  const digits = normalizePhoneDigits(compact);
  const normalized = compact.replace(/[\s()-]/g, "");

  // 中国大陆 11 位手机（1[3-9]…），须先于 +1 国家码判断，否则 130… 会被当成去掉国码 1 的美国号
  if (/^1[3-9]\d{9}$/.test(digits)) {
    return { phoneRegion: "CN", phone: digits };
  }

  for (const option of PHONE_REGION_OPTIONS) {
    const plainDialCode = option.dialCode.replace("+", "");
    if (normalized.startsWith(option.dialCode)) {
      return {
        phoneRegion: option.id,
        phone: normalizePhoneDigits(normalized.slice(option.dialCode.length)),
      };
    }
    if (digits.startsWith(plainDialCode)) {
      return {
        phoneRegion: option.id,
        phone: digits.slice(plainDialCode.length),
      };
    }
  }

  return {
    phoneRegion: DEFAULT_PHONE_REGION,
    phone: digits,
  };
}

export function formatPhoneForDisplay(
  phoneRegion: string | undefined,
  phone: string | undefined
): string {
  const option = getPhoneRegionOption(phoneRegion);
  const digits = normalizePhoneDigits(phone ?? "");
  const local = option.formatLocal(digits);
  return local ? `${option.dialCode} ${local}` : option.dialCode;
}

export function formatLocalPhoneForDisplay(
  phoneRegion: string | undefined,
  phone: string | undefined
): string {
  const option = getPhoneRegionOption(phoneRegion);
  return option.formatLocal(normalizePhoneDigits(phone ?? ""));
}

export function validatePhoneForRegion(
  phoneRegion: string | undefined,
  phone: string | undefined
): string | null {
  const option = getPhoneRegionOption(phoneRegion);
  const digits = normalizePhoneDigits(phone ?? "");
  if (!digits) {
    return null;
  }
  return option.validate(digits)
    ? null
    : `号码格式不符合${option.label}规则`;
}
