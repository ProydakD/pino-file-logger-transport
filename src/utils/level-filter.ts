import type { LogLevel } from '../types';

/**
 * Pino log entry interface
 */
export interface PinoLogEntry {
  level?: number | string | { value?: number | string; label?: string };
  time?: number;
  pid?: number;
  hostname?: string;
  msg?: string;
  log?: {
    level?: number | string | { value?: number | string; label?: string };
    [key: string]: unknown;
  };
  record?: {
    level?: number | string | { value?: number | string; label?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const LEVEL_TO_NUMBER: Record<Exclude<LogLevel, 'silent'>, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/**
 * Gets the numeric value of a configured level.
 *
 * @param level - Configured log level
 * @returns Pino numeric level value
 */
function getConfiguredLevelValue(level: LogLevel): number {
  if (level === 'silent') {
    return Number.POSITIVE_INFINITY;
  }

  return LEVEL_TO_NUMBER[level];
}

/**
 * Tries to normalize level candidate to pino numeric level value.
 *
 * @param candidate - Level candidate from log entry
 * @returns Numeric level or null
 */
function normalizeLevelCandidate(candidate: unknown): number | null {
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate;
  }

  if (typeof candidate === 'string') {
    const normalized = candidate.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (normalized in LEVEL_TO_NUMBER) {
      return LEVEL_TO_NUMBER[normalized as Exclude<LogLevel, 'silent'>];
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

/**
 * Extracts level value from known entry fields.
 *
 * @param obj - Log entry object
 * @returns Numeric level value
 */
function extractLogLevelValue(obj: PinoLogEntry): number {
  const candidates: unknown[] = [
    obj.level,
    typeof obj.level === 'object' && obj.level !== null
      ? (obj.level as { value?: unknown; label?: unknown }).value
      : null,
    typeof obj.level === 'object' && obj.level !== null
      ? (obj.level as { value?: unknown; label?: unknown }).label
      : null,
    obj.log?.level,
    typeof obj.log?.level === 'object' && obj.log?.level !== null
      ? (obj.log.level as { value?: unknown; label?: unknown }).value
      : null,
    typeof obj.log?.level === 'object' && obj.log?.level !== null
      ? (obj.log.level as { value?: unknown; label?: unknown }).label
      : null,
    obj.record?.level,
    typeof obj.record?.level === 'object' && obj.record?.level !== null
      ? (obj.record.level as { value?: unknown; label?: unknown }).value
      : null,
    typeof obj.record?.level === 'object' && obj.record?.level !== null
      ? (obj.record.level as { value?: unknown; label?: unknown }).label
      : null,
  ];

  for (const candidate of candidates) {
    const levelValue = normalizeLevelCandidate(candidate);
    if (levelValue !== null) {
      return levelValue;
    }
  }

  // Default to info level if level is missing/invalid.
  return LEVEL_TO_NUMBER.info;
}

/**
 * Checks if a log entry should be written based on configured level
 *
 * @param obj - Log entry object
 * @param configuredLevel - Configured minimum log level
 * @returns True if log entry should be written, false otherwise
 */
export function shouldWriteLog(
  obj: PinoLogEntry,
  configuredLevel: LogLevel,
): boolean {
  // If configured level is silent, don't write anything.
  if (configuredLevel === 'silent') {
    return false;
  }

  const configuredLevelValue = getConfiguredLevelValue(configuredLevel);
  const entryLevelValue = extractLogLevelValue(obj);

  // In pino, higher level number means higher severity.
  return entryLevelValue >= configuredLevelValue;
}
