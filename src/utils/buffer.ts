import { once } from 'events';
import { Writable } from 'stream';

/**
 * Flushes the buffer to the stream, respecting backpressure
 *
 * @param buffer - Buffer containing log entries
 * @param stream - Write stream to flush to
 */
export async function flushBuffer(
  buffer: string[],
  stream: Writable,
): Promise<void> {
  if (buffer.length > 0) {
    try {
      const data = buffer.join('');

      const toDrain = !stream.write(data);
      // If the stream needs to drain, wait for it
      if (toDrain) {
        await once(stream, 'drain');
      }
    } catch (error) {
      console.error('Error writing buffer to stream:', error);
    }
  }
}

/**
 * Schedules buffer flush with timeout
 *
 * @param flushTimer - Current flush timer
 * @param flushBuffer - Function to flush buffer
 * @param flushInterval - Flush interval in milliseconds
 * @returns New flush timer
 */
export function scheduleFlush(
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
