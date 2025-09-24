/**
 * Pino File Logger Transport
 *
 * A transport for Pino that writes logs to files with rotation and archiving capabilities.
 */

import build from 'pino-abstract-transport';
import {
  createWriteStream,
  unlinkSync,
  readdirSync,
} from 'fs';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';
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

/**
 * Pino log entry interface
 */
interface PinoLogEntry {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  msg: string;
  [key: string]: unknown;
}

// Level filtering functions
// These functions handle log level filtering

/**
 * Gets the numeric value of a log level
 *
 * @param level - Log level string
 * @returns Numeric value of the log level (higher means more verbose)
 */
function getLevelValue(level: string): number {
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
function shouldWriteLog(obj: PinoLogEntry, configuredLevel: string): boolean {
  // If configured level is silent, don't write anything
  if (configuredLevel === 'silent') {
    return false;
  }

  // Extract level from log entry (default to 'info' if not specified)
  const logLevel = obj.level ? obj.level : 30; // 30 is info level in Pino
  
  // Convert Pino numeric levels to string levels for comparison
  let logLevelStr: string;
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

// Utility functions for file operations
// These functions handle specific file operations and could be moved to a separate module

/**
 * Ensures that the log directory exists, creating it if necessary
 *
 * @param logDirectory - Path to the log directory
 */
function ensureLogDirectoryExists(logDirectory: string): void {
  try {
    if (!existsSync(logDirectory)) {
      mkdirSync(logDirectory, { recursive: true });
    }
  } catch (error: unknown) {
    console.error('Error ensuring log directory exists:', error);
    // Don't throw error, just continue - transport should be resilient
  }
}

/**
 * Gets current date in YYYY-MM-DD format
 *
 * @returns Current date string in YYYY-MM-DD format
 */
function getCurrentDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Creates a write stream for the log file
 *
 * @param logFilePath - Path to the log file
 * @returns Write stream or fallback console stream
 */
function createLogFileStream(logFilePath: string): Writable {
  try {
    const stream = createWriteStream(logFilePath, { flags: 'a' });
    
    // Handle stream errors
    stream.on('error', (error) => {
      console.error('Error in write stream:', error);
    });
    
    return stream;
  } catch (error) {
    console.error('Error creating write stream:', error);
    // Create a dummy stream that writes to console as fallback
    const fallbackStream = new Writable({
      write(chunk: unknown, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        console.log('FALLBACK:', (chunk as { toString: () => string }).toString());
        callback();
      },
    });
    
    // Handle fallback stream errors
    fallbackStream.on('error', (error) => {
      console.error('Error in fallback stream:', error);
    });
    
    return fallbackStream;
  }
}

// Buffer management functions
// These functions handle buffer operations for batching log writes

/**
 * Flushes the buffer to the stream
 *
 * @param buffer - Buffer containing log entries
 * @param stream - Write stream to flush to
 * @returns Updated empty buffer
 */
function flushBuffer(buffer: string[], stream: Writable): string[] {
  if (buffer.length > 0) {
    try {
      const data = buffer.join('');
      
      const toDrain = !stream.write(data);
      // If the stream needs to drain, wait for it
      if (toDrain) {
        stream.once('drain', () => {
          // Continue processing
        });
      }
    } catch (error) {
      console.error('Error writing buffer to stream:', error);
    }
  }
  
  return [];
}

/**
 * Schedules buffer flush with timeout
 *
 * @param flushTimer - Current flush timer
 * @param flushBuffer - Function to flush buffer
 * @param flushInterval - Flush interval in milliseconds
 * @returns New flush timer
 */
function scheduleFlush(
  flushTimer: NodeJS.Timeout | null,
  flushBuffer: () => void,
  flushInterval: number
): NodeJS.Timeout {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  return setTimeout(() => {
    flushBuffer();
  }, flushInterval);
}

// File archiving functions
// These functions handle log file archiving operations

/**
 * Archives all log files in the directory except the current one
 *
 * @param logDirectory - Directory containing log files
 * @param filename - Base filename for log files
 * @param currentDate - Current date in YYYY-MM-DD format
 * @param archiveFormat - Archive format (zip, gzip, tar, none)
 * @param compressionLevel - Compression level (0-9)
 * @param archiveDirectory - Directory for storing archives
 */
async function archiveLogFiles(
  logDirectory: string,
  filename: string,
  currentDate: string,
  archiveFormat: 'zip' | 'gzip' | 'tar' | 'none' = 'zip',
  compressionLevel: number = 6,
  archiveDirectory?: string,
): Promise<void> {
  try {
    // Check if log directory exists
    if (!existsSync(logDirectory)) {
      console.warn(`Log directory does not exist: ${logDirectory}`);
      return;
    }

    // Get all files in log directory
    const files = readdirSync(logDirectory);

    // Filter files that match our pattern and are log files
    const logFiles = files.filter(
      (file) =>
        file.startsWith(filename) &&
        file.endsWith('.log') &&
        file !== `${filename}-${currentDate}.log`, // Don't archive current file
    );

    // Archive each log file
    for (const logFile of logFiles) {
      await archiveSingleLogFile(logDirectory, logFile, archiveFormat, compressionLevel, archiveDirectory);
    }
  } catch (error) {
    console.error('Error archiving log files:', error);
  }
}

/**
 * Archives a single log file
 *
 * @param logDirectory - Directory containing log files
 * @param logFile - Name of the log file to archive
 * @param archiveFormat - Archive format (zip, gzip, tar, none)
 * @param compressionLevel - Compression level (0-9)
 * @param archiveDirectory - Directory for storing archives
 */
async function archiveSingleLogFile(
  logDirectory: string,
  logFile: string,
  archiveFormat: 'zip' | 'gzip' | 'tar' | 'none' = 'zip',
  compressionLevel: number = 6,
  archiveDirectory?: string,
): Promise<void> {
  // If archive format is 'none', just remove the file
  if (archiveFormat === 'none') {
    try {
      const logFilePath = join(logDirectory, logFile);
      unlinkSync(logFilePath);
      return;
    } catch (error) {
      console.error(`Error removing file ${logFile}:`, error);
      return;
    }
  }

  const logFilePath = join(logDirectory, logFile);
  
  // Determine archive directory and path
  const targetArchiveDirectory = archiveDirectory || logDirectory;
  const archiveExtension = getArchiveExtension(archiveFormat);
  const archivePath = join(targetArchiveDirectory, logFile.replace(/\.log$/, archiveExtension));

  try {
    // Ensure archive directory exists
    ensureLogDirectoryExists(targetArchiveDirectory);
    
    // Create archive based on format
    const output = createWriteStream(archivePath);
    let archive: archiver.Archiver;

    switch (archiveFormat) {
      case 'zip':
        archive = archiver('zip', {
          zlib: { level: compressionLevel },
        });
        break;
      case 'gzip':
        archive = archiver('tar', {
          gzip: true,
          gzipOptions: { level: compressionLevel },
        });
        break;
      case 'tar':
        archive = archiver('tar', {
          zlib: { level: compressionLevel > 0 ? compressionLevel : 0 },
        });
        break;
      default:
        throw new Error(`Unsupported archive format: ${archiveFormat}`);
    }

    // Pipe archive data to the file
    archive.pipe(output);

    // Append file to archive
    archive.file(logFilePath, { name: logFile });

    // Finalize the archive
    await archive.finalize();

    // Remove original file after archiving
    try {
      unlinkSync(logFilePath);
    } catch (unlinkError) {
      console.error(
        'Error removing original file after archiving:',
        unlinkError,
      );
    }
  } catch (error) {
    console.error(`Error archiving file ${logFile}:`, error);
  }
}

/**
 * Gets the archive file extension based on format
 *
 * @param archiveFormat - Archive format
 * @returns Archive file extension
 */
function getArchiveExtension(archiveFormat: 'zip' | 'gzip' | 'tar' | 'none'): string {
  switch (archiveFormat) {
    case 'zip': return '.zip';
    case 'gzip': return '.tar.gz';
    case 'tar': return '.tar';
    case 'none': return '';
    default: return '.zip';
  }
}

async function rotateLogFile(
  stream: Writable,
  logDirectory: string,
  filename: string,
  currentDate: string,
  retentionDays: number,
  archiveFormat: 'zip' | 'gzip' | 'tar' | 'none' = 'zip',
  compressionLevel: number = 6,
  archiveDirectory?: string,
  cleanupOnRotation: boolean = true,
  archiveOnRotation: boolean = false,
): Promise<Writable> {
  try {
    // Close current stream
    stream.end();

    // Wait for the stream to finish
    await new Promise((resolve) =>
      stream.once('finish', () => resolve(undefined)),
    );

    // Clean up old files based on retentionDays if enabled
    if (cleanupOnRotation) {
      cleanupOldFiles(logDirectory, filename, retentionDays, archiveDirectory);
    }
    
    // Optionally archive old log files if enabled
    if (archiveOnRotation) {
      await archiveLogFiles(
        logDirectory, 
        filename, 
        currentDate,
        archiveFormat,
        compressionLevel,
        archiveDirectory,
      );
    }
  } catch (error) {
    console.error('Error closing stream:', error);
  }

  // Create new stream with new date
  const newLogFilePath = join(
    logDirectory,
    `${filename}-${currentDate}.log`,
  );
  
  return createLogFileStream(newLogFilePath);
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
      for await (const obj of source) {
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

// File cleanup functions
// These functions handle old file cleanup based on retention days

/**
 * Calculates the cutoff date based on retention days
 *
 * @param retentionDays - Number of days to retain files
 * @returns Cutoff date
 */
function calculateCutoffDate(retentionDays: number): Date {
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  return cutoffDate;
}

/**
 * Filters files that match our naming pattern
 *
 * @param files - Array of file names
 * @param filename - Base filename for log files
 * @returns Filtered array of relevant files
 */
function filterRelevantFiles(files: string[], filename: string): string[] {
  return files.filter(
    (file) =>
      file.startsWith(filename) &&
      (file.endsWith('.log') || 
       file.endsWith('.zip') || 
       file.endsWith('.tar.gz') || 
       file.endsWith('.tar')),
  );
}

/**
 * Extracts date from filename
 *
 * @param filename - Name of the file
 * @returns Date extracted from filename or null if not found
 */
function extractDateFromFilename(filename: string): Date | null {
  // Match date pattern for various file extensions
  const dateMatch = filename.match(/-(\d{4}-\d{2}-\d{2})\.(log|zip|tar\.gz|tar)$/);
  if (dateMatch) {
    return new Date(dateMatch[1]);
  }
  return null;
}

/**
 * Deletes a file if it exists
 *
 * @param filePath - Path to the file
 */
function deleteFileIfExists(filePath: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

/**
 * Processes files in a directory for cleanup
 *
 * @param directory - Directory to process
 * @param filename - Base filename for log files
 * @param cutoffDate - Cutoff date for file retention
 */
function processDirectoryFiles(
  directory: string,
  filename: string,
  cutoffDate: Date,
): void {
  try {
    // Get all files in directory
    const files = readdirSync(directory);

    // Filter files that match our pattern
    const relevantFiles = filterRelevantFiles(files, filename);

    // Check each file
    for (const file of relevantFiles) {
      try {
        // Extract date from filename
        const fileDate = extractDateFromFilename(file);
        if (fileDate) {
          // If file is older than cutoff date, delete it
          if (fileDate < cutoffDate) {
            const filePath = join(directory, file);
            deleteFileIfExists(filePath);
          }
        }
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error);
  }
}

/**
 * Clean up old log files and archives based on retention days
 *
 * @param logDirectory - Directory containing log files
 * @param filename - Base filename for log files
 * @param retentionDays - Number of days to retain files
 * @param archiveDirectory - Directory containing archives (if different from logDirectory)
 */
function cleanupOldFiles(
  logDirectory: string,
  filename: string,
  retentionDays: number,
  archiveDirectory?: string,
): void {
  try {
    // Calculate cutoff date
    const cutoffDate = calculateCutoffDate(retentionDays);

    // Process files in log directory
    processDirectoryFiles(logDirectory, filename, cutoffDate);
    
    // If archive directory is specified and different from log directory, process it too
    if (archiveDirectory && archiveDirectory !== logDirectory) {
      try {
        // Check if archive directory exists before trying to read it
        if (existsSync(archiveDirectory)) {
          processDirectoryFiles(archiveDirectory, filename, cutoffDate);
        }
      } catch (archiveDirError) {
        console.error('Error accessing archive directory:', archiveDirError);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}
