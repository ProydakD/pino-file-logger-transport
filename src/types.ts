/**
 * Shared public types for transport configuration.
 */
export type LogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace'
  | 'silent';

export type ArchiveFormat = 'zip' | 'gzip' | 'tar' | 'none';
