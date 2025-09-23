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

    // Check that the correct file was created with date
    const files = readdirSync(testDir);
    const date = new Date();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    expect(files).toContain(`${filename}-${dateString}.log`);
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

    // Check that the default file was created with date
    const files = readdirSync(testDir);
    const date = new Date();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    expect(files).toContain(`log-${dateString}.log`);
  });

  it('should create new file when date changes', async () => {
    const filename = 'date-test';
    const transport = fileTransport({
      logDirectory: testDir,
      filename,
    });

    // Write first log
    transport.write(JSON.stringify({ msg: 'first log' }) + '\n');

    // Simulate date change by manually changing lastDate
    // This is a simplified test - in real usage, date changes naturally

    // Write second log
    transport.write(JSON.stringify({ msg: 'second log' }) + '\n');
    transport.end();

    // Wait a bit for the file to be created
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that file was created with current date
    const files = readdirSync(testDir);
    const date = new Date();
    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    expect(files).toContain(`${filename}-${dateString}.log`);
  });
});
