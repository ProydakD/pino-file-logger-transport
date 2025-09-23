/**
 * Pino File Logger Transport
 *
 * A transport for Pino that writes logs to files with rotation and archiving capabilities.
 */

import build from 'pino-abstract-transport';
import {
  createWriteStream,
  WriteStream,
  createReadStream,
  unlinkSync,
  readdirSync,
  promises as fsPromises,
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
  } = options;

  try {
    // Ensure log directory exists
    if (!existsSync(logDirectory)) {
      mkdirSync(logDirectory, { recursive: true });
    }

    // Clean up old files based on retentionDays
    cleanupOldFiles(logDirectory, filename, retentionDays);
  } catch (error) {
    console.error('Error initializing file transport:', error);
    // Continue execution even if initialization fails
  }

  // Get current date for filename
  const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Create the log file path with date
  const currentDate = getCurrentDate();
  const logFilePath = join(logDirectory, `${filename}-${currentDate}.log`);

  // Create write stream
  let stream: Writable;
  try {
    stream = createWriteStream(logFilePath, { flags: 'a' });
  } catch (error) {
    console.error('Error creating write stream:', error);
    // Create a dummy stream that writes to console as fallback
    stream = new Writable({
      write(chunk: any, encoding: any, callback: any) {
        console.log('FALLBACK:', chunk.toString());
        callback();
      },
    });
  }

  let lastDate = currentDate;

  // Buffer for batching writes
  let buffer: string[] = [];
  let flushTimer: NodeJS.Timeout | null = null;

  // Function to flush buffer to stream
  const flushBuffer = () => {
    if (buffer.length > 0) {
      try {
        const data = buffer.join('');
        buffer = [];

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

    // Clear timer
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  };

  // Function to schedule buffer flush
  const scheduleFlush = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
    }

    flushTimer = setTimeout(() => {
      flushBuffer();
    }, flushInterval);
  };

  // Function to archive all log files in the directory except the current one
  const archiveLogFiles = async () => {
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
        const logFilePath = join(logDirectory, logFile);
        const archivePath = logFilePath.replace(/\.log$/, '.zip');

        try {
          // Create archive
          const output = createWriteStream(archivePath);
          const archive = archiver('zip', {
            zlib: { level: 9 }, // Sets the compression level
          });

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
    } catch (error) {
      console.error('Error archiving log files:', error);
    }
  };

  return build(
    async function (source) {
      for await (const obj of source) {
        try {
          // Check if date has changed
          const currentDate = getCurrentDate();
          if (currentDate !== lastDate) {
            // Flush buffer before rotating
            flushBuffer();

            try {
              // Close current stream
              stream.end();

              // Wait for the stream to finish
              await new Promise((resolve) =>
                stream.once('finish', () => resolve(undefined)),
              );
            } catch (error) {
              console.error('Error closing stream:', error);
            }

            // Archive all log files in the directory
            await archiveLogFiles();

            // Create new stream with new date
            const newLogFilePath = join(
              logDirectory,
              `${filename}-${currentDate}.log`,
            );
            try {
              stream = createWriteStream(newLogFilePath, { flags: 'a' });
            } catch (error) {
              console.error('Error creating new write stream:', error);
              // Create a dummy stream that writes to console as fallback
              stream = new Writable({
                write(chunk: any, encoding: any, callback: any) {
                  console.log('FALLBACK:', chunk.toString());
                  callback();
                },
              });
            }
            lastDate = currentDate;
          }

          // Add log entry to buffer
          buffer.push(JSON.stringify(obj) + '\n');

          // Flush buffer if it reaches bufferSize
          if (buffer.length >= bufferSize) {
            flushBuffer();
          } else {
            // Schedule flush if not already scheduled
            scheduleFlush();
          }
        } catch (error) {
          console.error('Error processing log entry:', error);
          // Continue processing other log entries
        }
      }

      // Flush remaining buffer when source ends
      flushBuffer();
    },
    {
      async close() {
        try {
          // Flush any remaining buffer
          flushBuffer();

          stream.end();
          // Wait for the stream to finish
          await new Promise((resolve) =>
            stream.once('finish', () => resolve(undefined)),
          );

          // Archive all log files in the directory
          await archiveLogFiles();
        } catch (error) {
          console.error('Error closing transport:', error);
        }
      },
    },
  );
}

/**
 * Clean up old log files and archives based on retention days
 *
 * @param logDirectory - Directory containing log files
 * @param filename - Base filename for log files
 * @param retentionDays - Number of days to retain files
 */
function cleanupOldFiles(
  logDirectory: string,
  filename: string,
  retentionDays: number,
) {
  try {
    // Get current date
    const now = new Date();

    // Calculate cutoff date
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Get all files in log directory
    const files = readdirSync(logDirectory);

    // Filter files that match our pattern
    const relevantFiles = files.filter(
      (file) =>
        file.startsWith(filename) &&
        (file.endsWith('.log') || file.endsWith('.zip')),
    );

    // Check each file
    for (const file of relevantFiles) {
      try {
        // Extract date from filename (format: filename-YYYY-MM-DD.log or filename-YYYY-MM-DD.zip)
        const dateMatch = file.match(/-(\d{4}-\d{2}-\d{2})\.(log|zip)$/);
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1]);
          // If file is older than cutoff date, delete it
          if (fileDate < cutoffDate) {
            const filePath = join(logDirectory, file);
            if (existsSync(filePath)) {
              unlinkSync(filePath);
            }
          }
        }
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}
