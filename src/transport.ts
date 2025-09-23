/**
 * Pino File Logger Transport
 *
 * A transport for Pino that writes logs to files with rotation and archiving capabilities.
 */

import build from 'pino-abstract-transport';
import { createWriteStream, WriteStream } from 'fs';
import { mkdirSync, existsSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';

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
          const newLogFilePath = join(
            logDirectory,
            `${filename}-${currentDate}.log`,
          );
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

        // Archive old log files (files with different dates)
        const currentDate = getCurrentDate();
        const files = readdirSync(logDirectory);

        for (const file of files) {
          // Check if it's a log file with our filename pattern but not today's file
          if (file.startsWith(`${filename}-`) && file.endsWith('.log')) {
            const fileDate = file.substring(
              filename.length + 1,
              file.length - 4,
            ); // Extract date part
            if (fileDate !== currentDate) {
              const filePath = join(logDirectory, file);
              const archivePath = filePath.replace(/\.log$/, '.zip');

              try {
                // Create archive
                const output = createWriteStream(archivePath);
                const archive = archiver('zip', {
                  zlib: { level: 9 }, // Sets the compression level
                });

                // Pipe archive data to the file
                archive.pipe(output);

                // Append file to archive
                const fileName = file;
                archive.file(filePath, { name: fileName });

                // Finalize the archive
                await archive.finalize();

                // Remove original file after archiving
                unlinkSync(filePath);
              } catch (error) {
                console.error('Error archiving file:', error);
              }
            }
          }
        }
      },
    },
  );
}
