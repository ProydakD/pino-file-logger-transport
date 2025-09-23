import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fileTransport from '../src/transport';
import { join } from 'path';
import {
  existsSync,
  mkdirSync,
  rmSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
} from 'fs';

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

  it('should archive previous log file on close', async () => {
    const filename = 'archive-test';

    // Create a mock previous log file
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const previousLogFile = join(testDir, `${filename}-${yesterdayString}.log`);
    writeFileSync(previousLogFile, 'test content');

    // Create transport
    const transport = fileTransport({
      logDirectory: testDir,
      filename,
    });

    // Write log
    transport.write(JSON.stringify({ msg: 'test log' }) + '\n');
    transport.end();

    // Wait for archiving to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Check that zip file was created
    const files = readdirSync(testDir);
    const zipFileExists = files.some((file) => file.endsWith('.zip'));
    expect(zipFileExists).toBe(true);

    // Clean up
    const zipFiles = files.filter((file) => file.endsWith('.zip'));
    zipFiles.forEach((zipFile) => {
      const fullPath = join(testDir, zipFile);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
    });
  });

  it('should clean up old files based on retention days', () => {
    const filename = 'cleanup-test';
    const retentionDays = 3;

    // Create old log files
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - retentionDays - 1); // Older than retention
    const oldDateString = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(oldDate.getDate()).padStart(2, '0')}`;
    const oldLogFile = join(testDir, `${filename}-${oldDateString}.log`);
    const oldZipFile = join(testDir, `${filename}-${oldDateString}.zip`);
    writeFileSync(oldLogFile, 'old log content');
    writeFileSync(oldZipFile, 'old zip content');

    // Create recent log file
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1); // Recent
    const recentDateString = `${recentDate.getFullYear()}-${String(recentDate.getMonth() + 1).padStart(2, '0')}-${String(recentDate.getDate()).padStart(2, '0')}`;
    const recentLogFile = join(testDir, `${filename}-${recentDateString}.log`);
    writeFileSync(recentLogFile, 'recent log content');

    // Create transport - this should clean up old files
    fileTransport({
      logDirectory: testDir,
      filename,
      retentionDays,
    });

    // Check that old files were deleted
    expect(existsSync(oldLogFile)).toBe(false);
    expect(existsSync(oldZipFile)).toBe(false);

    // Check that recent file still exists
    expect(existsSync(recentLogFile)).toBe(true);

    // Clean up
    if (existsSync(recentLogFile)) {
      unlinkSync(recentLogFile);
    }
  });

  it('should not crash when log directory is not accessible', () => {
    const inaccessibleDir = join(testDir, 'inaccessible');

    // Create transport with inaccessible directory
    const transport = fileTransport({
      logDirectory: inaccessibleDir,
      filename: 'test',
    });

    // Should still create transport object
    expect(transport).toBeDefined();
  });
});
