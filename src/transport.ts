/**
 * Pino File Logger Transport
 *
 * A transport for Pino that writes logs to files with rotation and archiving capabilities.
 */

import build from 'pino-abstract-transport';
import { Writable } from 'stream';

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
  level?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

  /**
   * Archive format for old log files
   * @default 'zip'
   */
  archiveFormat?: 'zip' | 'gzip' | 'tar' | 'none';

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

import { PinoLogEntry } from './utils/level-filter';
import { join } from 'path';
import { shouldWriteLog } from './utils/level-filter';
import { ensureLogDirectoryExists, getCurrentDate, createLogFileStream } from './utils/file-system';
import { flushBuffer, scheduleFlush } from './utils/buffer';
import { archiveLogFiles } from './utils/archiver';
import { rotateLogFile } from './utils/file-rotation';
import { cleanupOldFiles } from './utils/file-cleanup';

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

  try {
    // Ensure log directory exists
    ensureLogDirectoryExists(logDirectory);

    // Clean up old files based on retentionDays
    cleanupOldFiles(logDirectory, filename, retentionDays, archiveDirectory);
  } catch (error) {
    console.error('Error initializing file transport:', error);
    // Continue execution even if initialization fails
  }

  // Get current date for filename
  const currentDate = getCurrentDate();
  
  // Create the log file path with date
  const logFilePath = join(logDirectory, `${filename}-${currentDate}.log`);
  
  // Create write stream
  let stream: Writable = createLogFileStream(logFilePath);

  let lastDate = currentDate;

  // Buffer for batching writes
  let buffer: string[] = [];
  let flushTimer: NodeJS.Timeout | null = null;

  // Function to flush buffer to stream
  const handleFlushBuffer = () => {
    buffer = flushBuffer(buffer, stream);

    // Clear timer
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  };

  // Function to schedule buffer flush
  const handleScheduleFlush = () => {
    flushTimer = scheduleFlush(flushTimer, handleFlushBuffer, flushInterval);
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
            handleFlushBuffer();

            // Rotate log file
            stream = await rotateLogFile(
              stream, 
              logDirectory, 
              filename, 
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
            handleFlushBuffer();
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
      handleFlushBuffer();
    },
    {
      async close() {
        try {
          // Flush any remaining buffer
          handleFlushBuffer();

          stream.end();
          // Wait for the stream to finish
          await new Promise((resolve) =>
            stream.once('finish', () => resolve(undefined)),
          );

          // Archive all log files in the directory
          await archiveLogFiles(
            logDirectory, 
            filename, 
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
