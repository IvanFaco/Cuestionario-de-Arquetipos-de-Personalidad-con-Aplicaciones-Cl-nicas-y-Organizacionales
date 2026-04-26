import fs from "node:fs";
import path from "node:path";

export type BootswatchTheme =
  | "brite"
  | "cerulean"
  | "cosmo"
  | "cyborg"
  | "darkly"
  | "flatly"
  | "journal"
  | "litera"
  | "lumen"
  | "lux"
  | "materia"
  | "minty"
  | "morph"
  | "pulse"
  | "quartz"
  | "sandstone"
  | "simplex"
  | "sketchy"
  | "slate"
  | "solar"
  | "spacelab"
  | "superhero"
  | "united"
  | "vapor"
  | "yeti"
  | "zephyr";

export type GoogleFontOption =
  | "manrope"
  | "sora"
  | "outfit"
  | "plus-jakarta-sans"
  | "dm-sans"
  | "merriweather"
  | "roboto-slab";

export type AppearanceSettings = {
  bootswatchTheme: BootswatchTheme;
  fontOption: GoogleFontOption;
  customFontCssHref?: string;
  customFontFamily?: string;
  headingScale?: number;
  subheadingScale?: number;
  bodyScale?: number;
};

const appearanceDataDir = path.join(process.cwd(), "data");
const appearanceDataPath = path.join(appearanceDataDir, "appearance.json");

const themeOptions = [
  { value: "brite", label: "Brite" },
  { value: "cerulean", label: "Cerulean" },
  { value: "cosmo", label: "Cosmo" },
  { value: "cyborg", label: "Cyborg" },
  { value: "darkly", label: "Darkly" },
  { value: "flatly", label: "Flatly" },
  { value: "journal", label: "Journal" },
  { value: "litera", label: "Litera" },
  { value: "lumen", label: "Lumen" },
  { value: "lux", label: "Lux" },
  { value: "materia", label: "Materia" },
  { value: "minty", label: "Minty" },
  { value: "morph", label: "Morph" },
  { value: "pulse", label: "Pulse" },
  { value: "quartz", label: "Quartz" },
  { value: "sandstone", label: "Sandstone" },
  { value: "simplex", label: "Simplex" },
  { value: "sketchy", label: "Sketchy" },
  { value: "slate", label: "Slate" },
  { value: "solar", label: "Solar" },
  { value: "spacelab", label: "Spacelab" },
  { value: "superhero", label: "Superhero" },
  { value: "united", label: "United" },
  { value: "vapor", label: "Vapor" },
  { value: "yeti", label: "Yeti" },
  { value: "zephyr", label: "Zephyr" }
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
  },
  {
    value: "roboto-slab",
    label: "Roboto Slab",
    family: "Roboto Slab",
    href: "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&display=swap"
  }
] as const;

const defaultAppearance: AppearanceSettings = {
  bootswatchTheme: "flatly",
  fontOption: "manrope",
  customFontCssHref: "",
  customFontFamily: "",
  headingScale: 1,
  subheadingScale: 1,
  bodyScale: 1
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
    const parsedHeadingScale =
      typeof parsed.headingScale === "number" && Number.isFinite(parsed.headingScale)
        ? parsed.headingScale
        : defaultAppearance.headingScale;
    const parsedSubheadingScale =
      typeof parsed.subheadingScale === "number" && Number.isFinite(parsed.subheadingScale)
        ? parsed.subheadingScale
        : defaultAppearance.subheadingScale;
    const parsedBodyScale =
      typeof parsed.bodyScale === "number" && Number.isFinite(parsed.bodyScale)
        ? parsed.bodyScale
        : defaultAppearance.bodyScale;

    return {
      bootswatchTheme: isValidTheme(String(parsedTheme))
        ? (parsedTheme as BootswatchTheme)
        : defaultAppearance.bootswatchTheme,
      fontOption: isValidFont(String(parsedFont))
        ? (parsedFont as GoogleFontOption)
        : defaultAppearance.fontOption,
      customFontCssHref: parsedCustomFontCssHref,
      customFontFamily: parsedCustomFontFamily,
      headingScale: parsedHeadingScale,
      subheadingScale: parsedSubheadingScale,
      bodyScale: parsedBodyScale
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
  headingScale?: string;
  subheadingScale?: string;
  bodyScale?: string;
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

  const parseScale = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseFloat(String(value ?? ""));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    if (parsed > 2) {
      return parsed / 100;
    }

    return parsed;
  };

  currentAppearance.headingScale = parseScale(input.headingScale, currentAppearance.headingScale ?? 1);
  currentAppearance.subheadingScale = parseScale(
    input.subheadingScale,
    currentAppearance.subheadingScale ?? 1
  );
  currentAppearance.bodyScale = parseScale(input.bodyScale, currentAppearance.bodyScale ?? 1);

  persistAppearanceSettings(currentAppearance);
}
