import fs from "node:fs";
import path from "node:path";

export type BootswatchTheme =
  | "flatly"
  | "lux"
  | "minty"
  | "morph"
  | "quartz"
  | "sandstone"
  | "yeti";

export type GoogleFontOption =
  | "manrope"
  | "sora"
  | "outfit"
  | "plus-jakarta-sans"
  | "dm-sans"
  | "merriweather";

export type AppearanceSettings = {
  bootswatchTheme: BootswatchTheme;
  fontOption: GoogleFontOption;
  customFontCssHref?: string;
  customFontFamily?: string;
};

const appearanceDataDir = path.join(process.cwd(), "data");
const appearanceDataPath = path.join(appearanceDataDir, "appearance.json");

const themeOptions = [
  { value: "flatly", label: "Flatly" },
  { value: "lux", label: "Lux" },
  { value: "minty", label: "Minty" },
  { value: "morph", label: "Morph" },
  { value: "quartz", label: "Quartz" },
  { value: "sandstone", label: "Sandstone" },
  { value: "yeti", label: "Yeti" }
] as const;

const fontOptions = [
  {
    value: "manrope",
    label: "Manrope",
    family: "Manrope",
    href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap"
  },
  {
    value: "sora",
    label: "Sora",
    family: "Sora",
    href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap"
  },
  {
    value: "outfit",
    label: "Outfit",
    family: "Outfit",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap"
  },
  {
    value: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    family: "Plus Jakarta Sans",
    href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap"
  },
  {
    value: "dm-sans",
    label: "DM Sans",
    family: "DM Sans",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap"
  },
  {
    value: "merriweather",
    label: "Merriweather",
    family: "Merriweather",
    href: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap"
  }
] as const;

const defaultAppearance: AppearanceSettings = {
  bootswatchTheme: "flatly",
  fontOption: "manrope",
  customFontCssHref: "",
  customFontFamily: ""
};

function isValidTheme(value: string): value is BootswatchTheme {
  return themeOptions.some((option) => option.value === value);
}

function isValidFont(value: string): value is GoogleFontOption {
  return fontOptions.some((option) => option.value === value);
}

function readAppearanceSettings(): AppearanceSettings {
  try {
    if (!fs.existsSync(appearanceDataPath)) {
      return defaultAppearance;
    }

    const raw = fs.readFileSync(appearanceDataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
    const parsedTheme = parsed.bootswatchTheme;
    const parsedFont = parsed.fontOption;
    const parsedCustomFontCssHref =
      typeof parsed.customFontCssHref === "string" ? parsed.customFontCssHref : "";
    const parsedCustomFontFamily =
      typeof parsed.customFontFamily === "string" ? parsed.customFontFamily : "";

    return {
      bootswatchTheme: isValidTheme(String(parsedTheme))
        ? (parsedTheme as BootswatchTheme)
        : defaultAppearance.bootswatchTheme,
      fontOption: isValidFont(String(parsedFont))
        ? (parsedFont as GoogleFontOption)
        : defaultAppearance.fontOption,
      customFontCssHref: parsedCustomFontCssHref,
      customFontFamily: parsedCustomFontFamily
    };
  } catch {
    return defaultAppearance;
  }
}

function persistAppearanceSettings(settings: AppearanceSettings) {
  fs.mkdirSync(appearanceDataDir, { recursive: true });
  fs.writeFileSync(appearanceDataPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

const currentAppearance: AppearanceSettings = readAppearanceSettings();

export function getAppearanceSettings() {
  return currentAppearance;
}

export function getAppearanceOptions() {
  return {
    themes: themeOptions,
    fonts: fontOptions
  };
}

export function getCurrentFontDescriptor() {
  if (currentAppearance.customFontCssHref && currentAppearance.customFontFamily) {
    return {
      value: "custom",
      label: "Custom",
      family: currentAppearance.customFontFamily,
      href: currentAppearance.customFontCssHref
    };
  }

  return fontOptions.find((option) => option.value === currentAppearance.fontOption) ?? fontOptions[0];
}

export function updateAppearanceSettings(input: {
  bootswatchTheme: string;
  fontOption: string;
  customFontCssHref?: string;
  customFontFamily?: string;
}) {
  if (isValidTheme(input.bootswatchTheme)) {
    currentAppearance.bootswatchTheme = input.bootswatchTheme;
  }

  if (isValidFont(input.fontOption)) {
    currentAppearance.fontOption = input.fontOption;
  }

  const customFontCssHref = (input.customFontCssHref ?? "").trim();
  const customFontFamily = (input.customFontFamily ?? "").trim();

  if (customFontCssHref && customFontFamily) {
    try {
      const parsedUrl = new URL(customFontCssHref);

      if (
        parsedUrl.protocol === "https:" &&
        parsedUrl.hostname === "fonts.googleapis.com" &&
        parsedUrl.pathname.startsWith("/css")
      ) {
        currentAppearance.customFontCssHref = customFontCssHref;
        currentAppearance.customFontFamily = customFontFamily;
      }
    } catch {
      // Ignore malformed custom URLs and preserve previous settings.
    }
  } else {
    currentAppearance.customFontCssHref = "";
    currentAppearance.customFontFamily = "";
  }

  persistAppearanceSettings(currentAppearance);
}
