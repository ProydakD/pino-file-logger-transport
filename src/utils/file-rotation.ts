import { Writable } from 'stream';
import { join } from 'path';
import type { ArchiveFormat } from '../types';
import { archiveLogFiles } from './archiver';
import { createLogFileStream } from './file-system';
import { cleanupOldFiles } from './file-cleanup';

export async function rotateLogFile(
  stream: Writable,
  logDirectory: string,
  filename: string,
  currentDate: string,
  retentionDays: number,
  archiveFormat: ArchiveFormat = 'zip',
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
