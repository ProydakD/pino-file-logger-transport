import { describe, it, expect } from 'vitest';
import fileTransport from '../src/transport';

describe('File Transport', () => {
  it('should create a writable stream', () => {
    const transport = fileTransport({
      logDirectory: './logs',
    });

    expect(transport).toBeDefined();
    expect(typeof transport.write).toBe('function');
  });
});
