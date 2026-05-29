import crypto from "node:crypto";

import type { DemoProfile, HookOutcome, PremiumOutcome } from "./assessment.types.js";

type ReportInput = {
  demo: DemoProfile;
  hook: HookOutcome;
  premium: PremiumOutcome;
};

export type ReportSource = "webhook" | "fallback";

export type CachedReportKey = {
  userId: string;
  inputHash: string;
  appVersion: string;
};

export type CachedReportEntry = CachedReportKey & {
  reportSource: ReportSource;
  reportText: string;
  pdfBuffer: Buffer;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedReport = {
  reportSource: ReportSource;
  reportText: string;
  pdfBuffer: Buffer;
};

export type ReportCacheStatus = "hit" | "miss" | "bypass" | "save_failed";

export type CachedReportResult = GeneratedReport & {
  cacheStatus: ReportCacheStatus;
  inputHash: string;
  cacheError?: string;
};

export interface AssessmentReportCacheRepository {
  findByKey(key: CachedReportKey): CachedReportEntry | null;
  save(entry: CachedReportEntry): void;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido al consultar el cache del informe.";
}

export function createReportInputHash(input: ReportInput): string {
  return crypto.createHash("sha256").update(stableStringify(input)).digest("hex");
}

export class AssessmentReportCacheService {
  constructor(private readonly repository: AssessmentReportCacheRepository) {}

  async getOrCreate(params: {
    userId?: string;
    input: ReportInput;
    appVersion: string;
    create: () => Promise<GeneratedReport>;
  }): Promise<CachedReportResult> {
    const inputHash = createReportInputHash(params.input);

    if (!params.userId) {
      return {
        ...(await params.create()),
        cacheStatus: "bypass",
        inputHash
      };
    }

    const key = {
      userId: params.userId,
      inputHash,
      appVersion: params.appVersion
    };

    try {
      const cached = this.repository.findByKey(key);

      if (cached) {
        return {
          reportSource: cached.reportSource,
          reportText: cached.reportText,
          pdfBuffer: cached.pdfBuffer,
          cacheStatus: "hit",
          inputHash
        };
      }
    } catch (error) {
      const generated = await params.create();

      return {
        ...generated,
        cacheStatus: "bypass",
        inputHash,
        cacheError: getErrorMessage(error)
      };
    }

    const generated = await params.create();

    try {
      const now = new Date().toISOString();
      this.repository.save({
        ...key,
        ...generated,
        createdAt: now,
        updatedAt: now
      });

      return {
        ...generated,
        cacheStatus: "miss",
        inputHash
      };
    } catch (error) {
      return {
        ...generated,
        cacheStatus: "save_failed",
        inputHash,
        cacheError: getErrorMessage(error)
      };
    }
  }
}
