import { mkdirSync, existsSync } from 'fs';
import { Writable } from 'stream';
import SonicBoom from 'sonic-boom';

/**
 * Ensures that the log directory exists, creating it if necessary
 *
 * @param logDirectory - Path to the log directory
 */
export function ensureLogDirectoryExists(logDirectory: string): void {
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
export function getCurrentDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Creates a write stream for the log file
 *
 * @param logFilePath - Path to the log file
 * @returns Write stream or fallback console stream
 */
export function createLogFileStream(logFilePath: string): Writable {
  try {
    const stream = new SonicBoom({ dest: logFilePath, append: true });
    
    // Handle stream errors
    stream.on('error', (error) => {
      console.error('Error in write stream:', error);
    });
    
    return stream as unknown as Writable;
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
