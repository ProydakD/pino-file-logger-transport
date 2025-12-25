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
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  return cutoffDate;
}

/**
 * Filters files that match our naming pattern
 *
 * @param files - Array of file names
 * @param filename - Base filename for log files
 * @returns Filtered array of relevant files
 */
function filterRelevantFiles(files: string[], filename: string): string[] {
  return files.filter(
    (file) =>
      file.startsWith(filename) &&
      (file.endsWith('.log') || 
       file.endsWith('.zip') || 
       file.endsWith('.tar.gz') || 
       file.endsWith('.tar')),
  );
}

/**
 * Extracts date from filename
 *
 * @param filename - Name of the file
 * @returns Date extracted from filename or null if not found
 */
function extractDateFromFilename(filename: string): Date | null {
  // Match date pattern for various file extensions
  const dateMatch = filename.match(/-(\d{4}-\d{2}-\d{2})\.(log|zip|tar\.gz|tar)$/);
  if (dateMatch) {
    return new Date(dateMatch[1]);
  }
  return null;
}

/**
 * Deletes a file if it exists
 *
 * @param filePath - Path to the file
 */
function deleteFileIfExists(filePath: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
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
  cutoffDate: Date,
): void {
  try {
    // Get all files in directory
    const files = readdirSync(directory);

    // Filter files that match our pattern
    const relevantFiles = filterRelevantFiles(files, filename);

    // Check each file
    for (const file of relevantFiles) {
      try {
        // Extract date from filename
        const fileDate = extractDateFromFilename(file);
        if (fileDate) {
          // If file is older than cutoff date, delete it
          if (fileDate < cutoffDate) {
            const filePath = join(directory, file);
            deleteFileIfExists(filePath);
          }
        }
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}:`, error);
  }
}

/**
 * Clean up old log files and archives based on retention days
 *
 * @param logDirectory - Directory containing log files
 * @param filename - Base filename for log files
 * @param retentionDays - Number of days to retain files
 * @param archiveDirectory - Directory containing archives (if different from logDirectory)
 */
export function cleanupOldFiles(
  logDirectory: string,
  filename: string,
  retentionDays: number,
  archiveDirectory?: string,
): void {
  try {
    if (!Number.isFinite(retentionDays) || retentionDays < 0) {
      console.warn(
        'Invalid retentionDays value, skipping cleanup:',
        retentionDays,
      );
      return;
    }

    // Calculate cutoff date
    const cutoffDate = calculateCutoffDate(retentionDays);

    // Process files in log directory
    processDirectoryFiles(logDirectory, filename, cutoffDate);
    
    // If archive directory is specified and different from log directory, process it too
    if (archiveDirectory && archiveDirectory !== logDirectory) {
      try {
        // Check if archive directory exists before trying to read it
        if (existsSync(archiveDirectory)) {
          processDirectoryFiles(archiveDirectory, filename, cutoffDate);
        }
      } catch (archiveDirError) {
        console.error('Error accessing archive directory:', archiveDirError);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}
