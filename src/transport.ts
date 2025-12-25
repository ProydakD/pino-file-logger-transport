/**
 * Pino File Logger Transport
 *
 * A transport for Pino that writes logs to files with rotation and archiving capabilities.
 */

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
  } = options;

  const safeFilename = normalizeFilename(filename, 'log');

  try {
    // Ensure log directory exists
    ensureLogDirectoryExists(logDirectory);

    // Clean up old files based on retentionDays
    cleanupOldFiles(logDirectory, safeFilename, retentionDays, archiveDirectory);
  } catch (error) {
    console.error('Error initializing file transport:', error);
    // Continue execution even if initialization fails
  }

  // Get current date for filename
  const currentDate = getCurrentDate();

  // Create the log file path with date
  const logFilePath = join(
    logDirectory,
    `${safeFilename}-${currentDate}.log`,
  );
  
  // Create write stream
  let stream: Writable = createLogFileStream(logFilePath);

  let lastDate = currentDate;

  // Buffer for batching writes
  let buffer: string[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let flushInFlight: Promise<void> | null = null;

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
          await flushBuffer(currentBuffer, stream);
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
          const currentDate = getCurrentDate();
          if (currentDate !== lastDate) {
            // Flush buffer before rotating
            await handleFlushBuffer();

            // Rotate log file
            stream = await rotateLogFile(
              stream,
              logDirectory,
              safeFilename,
              currentDate,
              retentionDays,
              archiveFormat,
              compressionLevel,
              archiveDirectory,
              cleanupOnRotation,
              archiveOnRotation,
            );
            lastDate = currentDate;
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

          stream.end();
          // Wait for the stream to finish
          await new Promise((resolve) =>
            stream.once('finish', () => resolve(undefined)),
          );

          // Archive all log files in the directory
          await archiveLogFiles(
            logDirectory,
            safeFilename,
            getCurrentDate(),
            archiveFormat,
            compressionLevel,
            archiveDirectory,
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
