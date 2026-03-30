/** 表单展示用中文标签，与 fields key 对应 */
export const FIELD_LABELS: Record<string, string> = {
  name: "姓名",
  englishName: "英文名",
  title: "职位",
  company: "公司",
  phone: "电话",
  phoneRegion: "国家地区",
  email: "邮箱",
  address: "地址",
  addressPreset: "地址地区",
  website: "网站",
  tagline: "标语",
  department: "部门",
  wechat: "微信",
};

export function labelForField(key: string): string {
  return FIELD_LABELS[key] ?? key;
}
