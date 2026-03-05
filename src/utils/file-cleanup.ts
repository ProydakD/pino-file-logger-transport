import { existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Calculates the cutoff date based on retention days
 *
 * @param retentionDays - Number of days to retain files
 * @returns Cutoff date
 */
function calculateCutoffDate(retentionDays: number): Date {
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  return cutoffDate;
}

interface ManagedFile {
  name: string;
  date: Date;
  index: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toDateWithoutTime(dateValue: string): Date | null {
  const [year, month, day] = dateValue.split('-').map((part) => Number(part));
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

/**
 * Extracts managed file metadata from filename.
 *
 * Supported formats:
 * - filename-YYYY-MM-DD.log
 * - filename-YYYY-MM-DD-<index>.log
 * - filename-YYYY-MM-DD.(zip|tar|tar.gz)
 */
function extractManagedFile(
  file: string,
  filename: string,
): ManagedFile | null {
  const pattern = new RegExp(
    `^${escapeRegex(filename)}-(\\d{4}-\\d{2}-\\d{2})(?:-(\\d+))?\\.(log|zip|tar\\.gz|tar)$`,
  );
  const dateMatch = file.match(pattern);
  if (!dateMatch) {
    return null;
  }

  const fileDate = toDateWithoutTime(dateMatch[1]);
  if (!fileDate) {
    return null;
  }

  const index = dateMatch[2] ? Number(dateMatch[2]) : 0;
  return {
    name: file,
    date: fileDate,
    index: Number.isFinite(index) ? index : 0,
  };
}

/**
 * Deletes a file if it exists
 *
 * @param filePath - Path to the file
 */
function deleteFileIfExists(filePath: string, fileName: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    console.warn('Removed old file:', fileName);
  }
}

/**
 * Processes files in a directory for cleanup
 *
 * @param directory - Directory to process
 * @param filename - Base filename for log files
 * @param cutoffDate - Cutoff date for file retention
 */
function processDirectoryFiles(
  directory: string,
  filename: string,
  cutoffDate: Date | null,
  maxFiles: number | undefined,
  protectedFiles: Set<string>,
): void {
  try {
    // Get all files in directory
    const files = readdirSync(directory);

    // Build managed file list (logs + archives with supported naming scheme)
    const managedFiles = files
      .map((file) => extractManagedFile(file, filename))
      .filter((file): file is ManagedFile => file !== null);

    const remainingFiles = new Map<string, ManagedFile>();
    managedFiles.forEach((file) => {
      remainingFiles.set(file.name, file);
    });

    if (cutoffDate) {
      // Check each file against retention policy first
      for (const file of managedFiles) {
        if (protectedFiles.has(file.name)) {
          continue;
        }

        if (file.date < cutoffDate) {
          const filePath = join(directory, file.name);
          deleteFileIfExists(filePath, file.name);
          remainingFiles.delete(file.name);
        }
      }
    }

    if (typeof maxFiles === 'number') {
      const remaining = Array.from(remainingFiles.values());
      const protectedInDirectoryCount = remaining.filter((file) =>
        protectedFiles.has(file.name),
      ).length;
      const missingProtectedCount = Math.max(
        0,
        protectedFiles.size - protectedInDirectoryCount,
      );
      const maxDeletableCount = Math.max(
        0,
        maxFiles - protectedInDirectoryCount - missingProtectedCount,
      );

      const deletableFiles = remaining
        .filter((file) => !protectedFiles.has(file.name))
        .sort((left, right) => {
          const byDate = left.date.getTime() - right.date.getTime();
          if (byDate !== 0) {
            return byDate;
          }

          const byIndex = left.index - right.index;
          if (byIndex !== 0) {
            return byIndex;
          }

          return left.name.localeCompare(right.name);
        });

      const deleteCount = deletableFiles.length - maxDeletableCount;
      if (deleteCount > 0) {
        for (const file of deletableFiles.slice(0, deleteCount)) {
          const filePath = join(directory, file.name);
          deleteFileIfExists(filePath, file.name);
          remainingFiles.delete(file.name);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error);
  }
}

function normalizeMaxFiles(maxFiles: number | undefined): number | undefined {
  if (maxFiles === undefined) {
    return undefined;
  }

  if (!Number.isFinite(maxFiles) || maxFiles < 1) {
    console.warn('Invalid maxFiles value, skipping max files cleanup:', maxFiles);
    return undefined;
  }

  return Math.floor(maxFiles);
}

function normalizeRetentionDays(retentionDays: number): Date | null {
  if (!Number.isFinite(retentionDays) || retentionDays < 0) {
    console.warn(
      'Invalid retentionDays value, skipping retention cleanup:',
      retentionDays,
    );
    return null;
  }

  return calculateCutoffDate(retentionDays);
}

/**
 * Clean up old log files and archives based on retention days/max files.
 *
 * @param logDirectory - Directory containing log files
 * @param filename - Base filename for log files
 * @param retentionDays - Number of days to retain files
 * @param archiveDirectory - Directory containing archives (if different from logDirectory)
 * @param maxFiles - Maximum amount of files to keep per directory
 * @param protectedFilenames - File names that should never be removed
 */
export function cleanupOldFiles(
  logDirectory: string,
  filename: string,
  retentionDays: number,
  archiveDirectory?: string,
  maxFiles?: number,
  protectedFilenames: string[] = [],
): void {
  try {
    const cutoffDate = normalizeRetentionDays(retentionDays);
    const normalizedMaxFiles = normalizeMaxFiles(maxFiles);

    if (cutoffDate === null && normalizedMaxFiles === undefined) {
      return;
    }

    const protectedFiles = new Set(protectedFilenames);

    // Process files in log directory
    processDirectoryFiles(
      logDirectory,
      filename,
      cutoffDate,
      normalizedMaxFiles,
      protectedFiles,
    );

    // If archive directory is specified and different from log directory, process it too
    if (archiveDirectory && archiveDirectory !== logDirectory) {
      try {
        if (existsSync(archiveDirectory)) {
          processDirectoryFiles(
            archiveDirectory,
            filename,
            cutoffDate,
            normalizedMaxFiles,
            new Set<string>(),
          );
        }
      } catch (archiveDirError) {
        console.error('Error accessing archive directory:', archiveDirError);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}
