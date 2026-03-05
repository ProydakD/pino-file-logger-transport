/**
 * Pino File Logger Transport
 *
 * A transport for Pino that writes logs to files with rotation and archiving capabilities.
 */

import { statSync } from 'fs';
import { once } from 'events';
import { basename, join } from 'path';
import { Writable } from 'stream';
import build from 'pino-abstract-transport';

import type { ArchiveFormat, LogLevel } from './types';
import { archiveLogFiles } from './utils/archiver';
import { flushBuffer, scheduleFlush } from './utils/buffer';
import { cleanupOldFiles } from './utils/file-cleanup';
import {
  createLogFileStream,
  ensureLogDirectoryExists,
  getCurrentDate,
} from './utils/file-system';
import { PinoLogEntry, shouldWriteLog } from './utils/level-filter';
import { rotateLogFile } from './utils/file-rotation';

export interface FileTransportOptions {
  /**
   * Path to the log directory
   */
  logDirectory: string;

  /**
   * Base filename for log files (without extension)
   * @default 'log'
   */
  filename?: string;

  /**
   * Number of days to retain log files
   * @default 7
   */
  retentionDays?: number;

  /**
   * Buffer size for batching log writes
   * @default 100
   */
  bufferSize?: number;

  /**
   * Flush interval in milliseconds
   * @default 1000
   */
  flushInterval?: number;

  /**
   * Minimum log level to write to file
   * @default 'info'
   */
  level?: LogLevel;

  /**
   * Archive format for old log files
   * @default 'zip'
   */
  archiveFormat?: ArchiveFormat;

  /**
   * Compression level for archives (0-9, where 9 is maximum compression)
   * @default 6
   */
  compressionLevel?: number;

  /**
   * Directory for storing archives (if different from log directory)
   * @default same as logDirectory
   */
  archiveDirectory?: string;

  /**
   * Whether to perform cleanup and archiving on date rotation
   * @default true
   */
  cleanupOnRotation?: boolean;

  /**
   * Whether to archive files on date rotation
   * @default false
   */
  archiveOnRotation?: boolean;

  /**
   * Maximum file size in MB before rotating to indexed file in current day
   * @default undefined (disabled)
   */
  maxFileSizeMB?: number;

  /**
   * Maximum amount of managed files to keep per directory
   * @default undefined (disabled)
   */
  maxFiles?: number;
}

/**
 * Creates a file transport for Pino logger
 *
 * @param options - Configuration options for the transport
 * @returns A writable stream that can be used as a Pino transport
 */
export default function fileTransport(options: FileTransportOptions) {
  const {
    logDirectory,
    filename = 'log',
    retentionDays = 7,
    bufferSize = 100,
    flushInterval = 1000,
    level = 'info',
    archiveFormat = 'zip',
    compressionLevel = 6,
    archiveDirectory,
    cleanupOnRotation = true,
    archiveOnRotation = false,
    maxFileSizeMB,
    maxFiles,
  } = options;

  const safeFilename = normalizeFilename(filename, 'log');
  const normalizedMaxFileSizeMB = normalizeMaxFileSizeMB(maxFileSizeMB);
  const maxFileSizeBytes =
    normalizedMaxFileSizeMB !== undefined
      ? Math.max(1, Math.floor(normalizedMaxFileSizeMB * 1024 * 1024))
      : undefined;
  const normalizedMaxFiles = normalizeMaxFiles(maxFiles);
  let currentDate = getCurrentDate();
  let currentFileIndex = 0;
  let activeLogFilename = formatLogFilename(
    safeFilename,
    currentDate,
    currentFileIndex,
  );
  const getActiveLogPath = () => join(logDirectory, activeLogFilename);

  try {
    // Ensure log directory exists
    ensureLogDirectoryExists(logDirectory);
  } catch (error) {
    console.error('Error initializing file transport:', error);
    // Continue execution even if initialization fails
  }
  
  // Create write stream
  let stream: Writable = createLogFileStream(getActiveLogPath());
  let currentFileSize = getFileSizeSafe(getActiveLogPath());

  try {
    // Clean up old files based on retentionDays/maxFiles.
    cleanupOldFiles(
      logDirectory,
      safeFilename,
      retentionDays,
      archiveDirectory,
      normalizedMaxFiles,
      [activeLogFilename],
    );
  } catch (error) {
    console.error('Error running initial cleanup:', error);
  }

  // Buffer for batching writes
  let buffer: string[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let flushInFlight: Promise<void> | null = null;

  const rotateBySizeIfNeeded = async (entry: string): Promise<void> => {
    if (maxFileSizeBytes === undefined) {
      return;
    }

    const entrySize = Buffer.byteLength(entry);
    const exceedsCurrentFileSize =
      currentFileSize > 0 && currentFileSize + entrySize > maxFileSizeBytes;

    if (exceedsCurrentFileSize) {
      try {
        await closeStream(stream);
      } catch (error) {
        console.error('Error rotating log file by size:', error);
      }

      currentFileIndex += 1;
      activeLogFilename = formatLogFilename(
        safeFilename,
        currentDate,
        currentFileIndex,
      );

      stream = createLogFileStream(getActiveLogPath());
      currentFileSize = getFileSizeSafe(getActiveLogPath());

      if (cleanupOnRotation) {
        cleanupOldFiles(
          logDirectory,
          safeFilename,
          retentionDays,
          archiveDirectory,
          normalizedMaxFiles,
          [activeLogFilename],
        );
      }
    } else if (currentFileSize === 0 && entrySize > maxFileSizeBytes) {
      console.warn(
        'Log entry exceeds maxFileSizeMB and will be written as a single chunk.',
      );
    }
  };

  const flushCurrentBuffer = async (currentBuffer: string[]) => {
    if (currentBuffer.length === 0) {
      return;
    }

    if (maxFileSizeBytes === undefined) {
      await flushBuffer(currentBuffer, stream);
      return;
    }

    for (const entry of currentBuffer) {
      await rotateBySizeIfNeeded(entry);
      await writeToStream(stream, entry);
      currentFileSize += Buffer.byteLength(entry);
    }
  };

  // Function to flush buffer to stream
  const handleFlushBuffer = async () => {
    // Clear timer
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    if (!flushInFlight) {
      flushInFlight = (async () => {
        while (buffer.length > 0) {
          const currentBuffer = buffer;
          buffer = [];
          await flushCurrentBuffer(currentBuffer);
        }
      })().finally(() => {
        flushInFlight = null;
      });
    }

    await flushInFlight;
  };

  // Function to schedule buffer flush
  const handleScheduleFlush = () => {
    flushTimer = scheduleFlush(flushTimer, () => {
      void handleFlushBuffer();
    }, flushInterval);
  };

  return build(
    async function (source) {
      for await (const obj of source as AsyncIterable<PinoLogEntry>) {
        try {
          // Check if log should be written based on level
          if (!shouldWriteLog(obj, level)) {
            continue; // Skip this log entry
          }

          // Check if date has changed
          const nextDate = getCurrentDate();
          if (nextDate !== currentDate) {
            // Flush buffer before rotating
            await handleFlushBuffer();

            currentFileIndex = 0;
            const nextActiveFilename = formatLogFilename(
              safeFilename,
              nextDate,
              currentFileIndex,
            );

            // Rotate log file
            stream = await rotateLogFile(
              stream,
              logDirectory,
              safeFilename,
              nextDate,
              retentionDays,
              archiveFormat,
              compressionLevel,
              archiveDirectory,
              cleanupOnRotation,
              archiveOnRotation,
              normalizedMaxFiles,
            );
            currentDate = nextDate;
            activeLogFilename = nextActiveFilename;
            currentFileSize = getFileSizeSafe(getActiveLogPath());
          }

          // Add log entry to buffer
          buffer.push(JSON.stringify(obj) + '\n');

          // Flush buffer if it reaches bufferSize
          if (buffer.length >= bufferSize) {
            await handleFlushBuffer();
          } else {
            // Schedule flush if not already scheduled
            handleScheduleFlush();
          }
        } catch (error) {
          console.error('Error processing log entry:', error);
          // Continue processing other log entries
        }
      }

      // Flush remaining buffer when source ends
      await handleFlushBuffer();
    },
    {
      async close() {
        try {
          // Flush any remaining buffer
          await handleFlushBuffer();

          await closeStream(stream);

          // Archive all log files in the directory
          await archiveLogFiles(
            logDirectory,
            safeFilename,
            currentDate,
            archiveFormat,
            compressionLevel,
            archiveDirectory,
            activeLogFilename,
          );
        } catch (error) {
          console.error('Error closing transport:', error);
        }
      },
    },
  );
}

function normalizeFilename(filename: string, fallback: string): string {
  const base = basename(filename);
  if (!base || base === '.' || base === '..') {
    console.warn('Invalid filename, using fallback:', filename);
    return fallback;
  }

  if (base !== filename) {
    console.warn('Filename contains path separators, using basename:', filename);
  }

  return base;
}

function formatLogFilename(
  filename: string,
  currentDate: string,
  index: number,
): string {
  if (index <= 0) {
    return `${filename}-${currentDate}.log`;
  }

  return `${filename}-${currentDate}-${index}.log`;
}

function getFileSizeSafe(filePath: string): number {
  try {
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

function normalizeMaxFileSizeMB(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value <= 0) {
    console.warn('Invalid maxFileSizeMB value, size rotation disabled:', value);
    return undefined;
  }

  return value;
}

function normalizeMaxFiles(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value < 1) {
    console.warn('Invalid maxFiles value, max files cleanup disabled:', value);
    return undefined;
  }

  return Math.floor(value);
}

async function writeToStream(stream: Writable, value: string): Promise<void> {
  const shouldDrain = !stream.write(value);
  if (shouldDrain) {
    await once(stream, 'drain');
  }
}

async function closeStream(stream: Writable): Promise<void> {
  stream.end();
  await new Promise((resolve) => {
    stream.once('finish', () => resolve(undefined));
  });
}
