import { createWriteStream, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';
import { ensureLogDirectoryExists } from './file-system';

/**
 * Archives all log files in the directory except the current one
 *
 * @param logDirectory - Directory containing log files
 * @param filename - Base filename for log files
 * @param currentDate - Current date in YYYY-MM-DD format
 * @param archiveFormat - Archive format (zip, gzip, tar, none)
 * @param compressionLevel - Compression level (0-9)
 * @param archiveDirectory - Directory for storing archives
 */
export async function archiveLogFiles(
  logDirectory: string,
  filename: string,
  currentDate: string,
  archiveFormat: 'zip' | 'gzip' | 'tar' | 'none' = 'zip',
  compressionLevel: number = 6,
  archiveDirectory?: string,
): Promise<void> {
  try {
    // Check if log directory exists
    if (!existsSync(logDirectory)) {
      console.warn(`Log directory does not exist: ${logDirectory}`);
      return;
    }

    // Get all files in log directory
    const files = readdirSync(logDirectory);

    // Filter files that match our pattern and are log files
    const logFiles = files.filter(
      (file) =>
        file.startsWith(filename) &&
        file.endsWith('.log') &&
        file !== `${filename}-${currentDate}.log`, // Don't archive current file
    );

    // Archive each log file
    for (const logFile of logFiles) {
      await archiveSingleLogFile(logDirectory, logFile, archiveFormat, compressionLevel, archiveDirectory);
    }
  } catch (error) {
    console.error('Error archiving log files:', error);
  }
}

/**
 * Archives a single log file
 *
 * @param logDirectory - Directory containing log files
 * @param logFile - Name of the log file to archive
 * @param archiveFormat - Archive format (zip, gzip, tar, none)
 * @param compressionLevel - Compression level (0-9)
 * @param archiveDirectory - Directory for storing archives
 */
async function archiveSingleLogFile(
  logDirectory: string,
  logFile: string,
  archiveFormat: 'zip' | 'gzip' | 'tar' | 'none' = 'zip',
  compressionLevel: number = 6,
  archiveDirectory?: string,
): Promise<void> {
  // If archive format is 'none', just remove the file
  if (archiveFormat === 'none') {
    try {
      const logFilePath = join(logDirectory, logFile);
      unlinkSync(logFilePath);
      return;
    } catch (error) {
      console.error(`Error removing file ${logFile}:`, error);
      return;
    }
  }

  const logFilePath = join(logDirectory, logFile);
  
  // Determine archive directory and path
  const targetArchiveDirectory = archiveDirectory || logDirectory;
  const archiveExtension = getArchiveExtension(archiveFormat);
  const archivePath = join(targetArchiveDirectory, logFile.replace(/\.log$/, archiveExtension));

  try {
    // Ensure archive directory exists
    ensureLogDirectoryExists(targetArchiveDirectory);
    
    // Create archive based on format
    const output = createWriteStream(archivePath);
    let archive: archiver.Archiver;

    switch (archiveFormat) {
      case 'zip':
        archive = archiver('zip', {
          zlib: { level: compressionLevel },
        });
        break;
      case 'gzip':
        archive = archiver('tar', {
          gzip: true,
          gzipOptions: { level: compressionLevel },
        });
        break;
      case 'tar':
        archive = archiver('tar', {
          zlib: { level: compressionLevel > 0 ? compressionLevel : 0 },
        });
        break;
      default:
        throw new Error(`Unsupported archive format: ${archiveFormat}`);
    }

    // Pipe archive data to the file
    archive.pipe(output);

    // Append file to archive
    archive.file(logFilePath, { name: logFile });

    // Finalize the archive
    await archive.finalize();

    // Remove original file after archiving
    try {
      unlinkSync(logFilePath);
    } catch (unlinkError) {
      console.error(
        'Error removing original file after archiving:',
        unlinkError,
      );
    }
  } catch (error) {
    console.error(`Error archiving file ${logFile}:`, error);
  }
}

/**
 * Gets the archive file extension based on format
 *
 * @param archiveFormat - Archive format
 * @returns Archive file extension
 */
function getArchiveExtension(archiveFormat: 'zip' | 'gzip' | 'tar' | 'none'): string {
  switch (archiveFormat) {
    case 'zip': return '.zip';
    case 'gzip': return '.tar.gz';
    case 'tar': return '.tar';
    case 'none': return '';
    default: return '.zip';
  }
}
