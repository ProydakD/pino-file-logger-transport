import type { LogLevel } from '../types';

/**
 * Pino log entry interface
 */

export interface PinoLogEntry {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  msg: string;
  [key: string]: unknown;
}

/**
 * Gets the numeric value of a log level
 *
 * @param level - Log level string
 * @returns Numeric value of the log level (higher means more verbose)
 */
function getLevelValue(level: LogLevel): number {
  switch (level) {
    case 'silent': return 0;
    case 'fatal': return 1;
    case 'error': return 2;
    case 'warn': return 3;
    case 'info': return 4;
    case 'debug': return 5;
    case 'trace': return 6;
    default: return 4; // Default to info level
  }
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
  // If configured level is silent, don't write anything
  if (configuredLevel === 'silent') {
    return false;
  }

  // Extract level from log entry (default to 'info' if not specified)
  const logLevel = obj.level ? obj.level : 30; // 30 is info level in Pino
  
  // Convert Pino numeric levels to string levels for comparison
  let logLevelStr: LogLevel;
  switch (logLevel) {
    case 10: logLevelStr = 'trace'; break;
    case 20: logLevelStr = 'debug'; break;
    case 30: logLevelStr = 'info'; break;
    case 40: logLevelStr = 'warn'; break;
    case 50: logLevelStr = 'error'; break;
    case 60: logLevelStr = 'fatal'; break;
    default: logLevelStr = 'info';
  }

  // Compare levels
  return getLevelValue(logLevelStr) <= getLevelValue(configuredLevel);
}
