import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fileTransport from '../src/transport';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';

describe('File Transport', () => {
  const testDir = join(__dirname, 'test-logs');

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create a transport function', () => {
    const transport = fileTransport({
      logDirectory: testDir,
    });

    expect(transport).toBeDefined();
    // The transport function returns a stream directly
    expect(typeof transport).toBe('object');
    expect(typeof transport.write).toBe('function');
  });

  it('should accept log directory path parameter', () => {
    const transport = fileTransport({
      logDirectory: testDir,
    });

    expect(transport).toBeDefined();
  });

  it('should create log directory if it does not exist', () => {
    const newDir = join(testDir, 'new-directory-2');
    fileTransport({
      logDirectory: newDir,
    });

    // Check that directory was created
    expect(existsSync(newDir)).toBe(true);
  });

  it('should accept optional filename parameter', async () => {
    const filename = 'test-file';
    const transport = fileTransport({
      logDirectory: testDir,
      filename,
    });

    // Actually write something to trigger file creation
    transport.write(JSON.stringify({ msg: 'test' }) + '\n');
    transport.end();

    // Wait a bit for the file to be created
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that the correct file was created
    const files = readdirSync(testDir);
    expect(files).toContain(`${filename}.log`);
  });

  it('should use default filename if not specified', async () => {
    const transport = fileTransport({
      logDirectory: testDir,
    });

    // Actually write something to trigger file creation
    transport.write(JSON.stringify({ msg: 'test' }) + '\n');
    transport.end();

    // Wait a bit for the file to be created
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that the default file was created
    const files = readdirSync(testDir);
    expect(files).toContain('log.log');
  });
});
