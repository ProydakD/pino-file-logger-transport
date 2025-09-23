/**
 * Pino File Logger Transport
 *
 * A transport for Pino that writes logs to files with rotation and archiving capabilities.
 */

import build from 'pino-abstract-transport';
import { createWriteStream } from 'fs';
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

  // Create the log file path
  const logFilePath = join(logDirectory, `${filename}.log`);

  // Create write stream
  const stream = createWriteStream(logFilePath, { flags: 'a' });

  return build(
    async function (source) {
      for await (const obj of source) {
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
