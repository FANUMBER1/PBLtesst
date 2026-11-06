import { CATALOG_BRANDS } from "./types";

export type BinColorScheme = "rose" | "blue" | "amber" | "cyan";

export interface BinColorTheme {
  colorScheme: BinColorScheme;
  cardNormalBorder: string;
  dotClass: string;
  titleText: string;
  brandText: string;
  countNormalText: string;
  badgeClass: string;
  clearBtnClass: string;
  ledActive: string;
  sliderAccent: string;
  sliderIcon: string;
  presetHover: string;
  stationBadge: string;
  rulerText: string;
  progressBar: string;
  // Widget và thẻ cấu hình
  widgetCardBorder: string;
  widgetTitleText: string;
  widgetDotClass: string;
  widgetProgressBar: string;
}

export const BIN_THEMES: Record<BinColorScheme, BinColorTheme> = {
  rose: {
    colorScheme: "rose",
    cardNormalBorder:
      "border-rose-500/30 bg-white dark:bg-[#161822] dark:border-rose-500/20 hover:border-rose-500/60 hover:shadow-md",
    dotClass: "bg-rose-500 shadow-[0_0_6px_#f43f5e]",
    titleText: "text-rose-700 dark:text-rose-400",
    brandText: "text-rose-600 dark:text-rose-400",
    countNormalText:
      "text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    badgeClass:
      "border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    clearBtnClass:
      "border border-rose-500/40 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-300",
    ledActive: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]",
    sliderAccent: "accent-rose-500",
    sliderIcon: "text-rose-500",
    presetHover: "hover:text-rose-600 dark:hover:text-rose-400",
    stationBadge:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    rulerText: "text-rose-700 dark:text-rose-300",
    progressBar: "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
    widgetCardBorder:
      "border-rose-500/30 bg-rose-50/50 dark:bg-[#161822] dark:border-rose-500/20",
    widgetTitleText: "text-rose-600 dark:text-rose-400",
    widgetDotClass: "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
    widgetProgressBar: "bg-rose-500 shadow-[0_0_8px_#f43f5e]",
  },
  blue: {
    colorScheme: "blue",
    cardNormalBorder:
      "border-blue-500/30 bg-white dark:bg-[#161822] dark:border-blue-500/20 hover:border-blue-500/60 hover:shadow-md",
    dotClass: "bg-blue-500 shadow-[0_0_6px_#3b82f6]",
    titleText: "text-blue-700 dark:text-blue-400",
    brandText: "text-blue-600 dark:text-blue-400",
    countNormalText:
      "text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]",
    badgeClass:
      "border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    clearBtnClass:
      "border border-blue-500/40 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-300",
    ledActive: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)]",
    sliderAccent: "accent-blue-500",
    sliderIcon: "text-blue-500",
    presetHover: "hover:text-blue-600 dark:hover:text-blue-400",
    stationBadge:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    rulerText: "text-blue-700 dark:text-blue-300",
    progressBar: "bg-blue-500 shadow-[0_0_8px_#3b82f6]",
    widgetCardBorder:
      "border-blue-500/30 bg-blue-50/50 dark:bg-[#161822] dark:border-blue-500/20",
    widgetTitleText: "text-blue-600 dark:text-blue-400",
    widgetDotClass: "bg-blue-500 shadow-[0_0_8px_#3b82f6]",
    widgetProgressBar: "bg-blue-500 shadow-[0_0_8px_#3b82f6]",
  },
  amber: {
    colorScheme: "amber",
    cardNormalBorder:
      "border-amber-500/30 bg-white dark:bg-[#161822] dark:border-amber-500/20 hover:border-amber-500/60 hover:shadow-md",
    dotClass: "bg-amber-500 shadow-[0_0_6px_#f59e0b]",
    titleText: "text-amber-800 dark:text-amber-400",
    brandText: "text-amber-700 dark:text-amber-400",
    countNormalText:
      "text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    badgeClass:
      "border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
    clearBtnClass:
      "border border-amber-500/40 bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-700 dark:text-amber-300",
    ledActive: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)]",
    sliderAccent: "accent-amber-500",
    sliderIcon: "text-amber-500",
    presetHover: "hover:text-amber-600 dark:hover:text-amber-400",
    stationBadge:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rulerText: "text-amber-700 dark:text-amber-300",
    progressBar: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
    widgetCardBorder:
      "border-amber-500/30 bg-amber-50/50 dark:bg-[#161822] dark:border-amber-500/20",
    widgetTitleText: "text-amber-700 dark:text-amber-400",
    widgetDotClass: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
    widgetProgressBar: "bg-amber-500 shadow-[0_0_8px_#f59e0b]",
  },
  cyan: {
    colorScheme: "cyan",
    cardNormalBorder:
      "border-cyan-500/30 bg-white dark:bg-[#161822] dark:border-cyan-500/20 hover:border-cyan-500/60 hover:shadow-md",
    dotClass: "bg-cyan-500 shadow-[0_0_6px_#06b6d4]",
    titleText: "text-cyan-800 dark:text-cyan-400",
    brandText: "text-cyan-700 dark:text-cyan-400",
    countNormalText:
      "text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]",
    badgeClass:
      "border border-cyan-500/30 bg-cyan-50/10 text-cyan-800 dark:text-cyan-400",
    clearBtnClass:
      "border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-600 hover:text-white text-cyan-700 dark:text-cyan-300",
    ledActive: "bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.9)]",
    sliderAccent: "accent-cyan-500",
    sliderIcon: "text-cyan-500",
    presetHover: "hover:text-cyan-600 dark:hover:text-cyan-400",
    stationBadge:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    rulerText: "text-cyan-700 dark:text-cyan-300",
    progressBar: "bg-cyan-500 shadow-[0_0_8px_#06b6d4]",
    widgetCardBorder:
      "border-cyan-500/30 bg-cyan-50/50 dark:bg-[#161822] dark:border-cyan-500/20",
    widgetTitleText: "text-cyan-600 dark:text-cyan-400",
    widgetDotClass: "bg-cyan-500 shadow-[0_0_8px_#06b6d4]",
    widgetProgressBar: "bg-cyan-500 shadow-[0_0_8px_#06b6d4]",
  },
};

/**
 * Ánh xạ mã brand sang color scheme
 */
export function getBrandColorScheme(brandId?: string): BinColorScheme | null {
  if (!brandId) return null;
  const normalized = brandId.toLowerCase();
  if (normalized === "med_syringe" || normalized.includes("syringe") || normalized.includes("kim") || normalized.includes("dao")) return "amber";
  if (normalized === "med_forceps" || normalized.includes("forceps") || normalized.includes("panh") || normalized.includes("pean") || normalized.includes("kep")) return "blue";
  if (normalized === "med_scissors" || normalized.includes("scissors") || normalized.includes("keo")) return "blue";
  if (normalized === "med_vial" || normalized.includes("vial") || normalized.includes("tube") || normalized.includes("nghiem") || normalized.includes("thuoc")) return "cyan";

  // Legacy fallback mappings
  if (normalized === "brand_c" || normalized.includes("coca")) return "amber";
  if (normalized === "brand_a" || normalized.includes("pepsi")) return "blue";
  if (normalized === "brand_b" || normalized.includes("redbull") || normalized.includes("red bull")) return "amber";
  if (normalized === "brand_d" || normalized.includes("aqua")) return "cyan";

  // Kiểm tra CATALOG_BRANDS nếu có
  const brand = CATALOG_BRANDS[brandId];
  if (brand?.color) {
    if (brand.color.includes("EAB308") || brand.color.includes("f59e0b") || brand.color.includes("amber")) return "amber";
    if (brand.color.includes("0284C7") || brand.color.includes("3b82f6") || brand.color.includes("blue")) return "blue";
    if (brand.color.includes("6366F1") || brand.color.includes("indigo")) return "blue";
    if (brand.color.includes("10B981") || brand.color.includes("06b6d4") || brand.color.includes("cyan")) return "cyan";
    if (brand.color.includes("ef4444") || brand.color.includes("red")) return "rose";
  }

  return null;
}

/**
 * Lấy bộ theme màu sắc động cho khay dựa trên brandId gán cho khay đó.
 * Nếu chưa gán hoặc không nhận diện được, sử dụng fallbackScheme tương ứng.
 */
export function getBinColorTheme(
  brandId?: string,
  fallbackScheme: BinColorScheme = "amber"
): BinColorTheme {
  const scheme = getBrandColorScheme(brandId) || fallbackScheme;
  return BIN_THEMES[scheme];
}
