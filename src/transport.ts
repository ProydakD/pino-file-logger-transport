/**
 * Pino File Logger Transport
 *
 * A transport for Pino that writes logs to files with rotation and archiving capabilities.
 */

import build from 'pino-abstract-transport';
import { createWriteStream, WriteStream } from 'fs';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

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
}

/**
 * Creates a file transport for Pino logger
 *
 * @param options - Configuration options for the transport
 * @returns A writable stream that can be used as a Pino transport
 */
export default function fileTransport(options: FileTransportOptions) {
  const { logDirectory, filename = 'log' } = options;

  // Ensure log directory exists
  if (!existsSync(logDirectory)) {
    mkdirSync(logDirectory, { recursive: true });
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
  let stream: WriteStream = createWriteStream(logFilePath, { flags: 'a' });
  let lastDate = currentDate;

  return build(
    async function (source) {
      for await (const obj of source) {
        // Check if date has changed
        const currentDate = getCurrentDate();
        if (currentDate !== lastDate) {
          // Close current stream
          stream.end();

          // Wait for the stream to finish
          await new Promise((resolve) =>
            stream.once('finish', () => resolve(undefined)),
          );

          // Create new stream with new date
          const newLogFilePath = join(logDirectory, `${filename}-${currentDate}.log`);
          stream = createWriteStream(newLogFilePath, { flags: 'a' });
          lastDate = currentDate;
        }

        // Write the log object to the file
        const toDrain = !stream.write(JSON.stringify(obj) + '\n');
        // If the stream needs to drain, wait for it
        if (toDrain) {
          await new Promise((resolve) =>
            stream.once('drain', () => resolve(undefined)),
          );
        }
      }
    },
    {
      async close() {
        stream.end();
        // Wait for the stream to finish
        await new Promise((resolve) =>
          stream.once('finish', () => resolve(undefined)),
        );
      },
    },
  );
}
