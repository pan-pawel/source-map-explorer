/// <reference types="node" />
import { MappingRange } from './index';
export declare function getFileContent(file: Buffer | string): string;
/**
 * Format number of bytes as string
 * Source @see https://stackoverflow.com/a/18650828/388951
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
export declare function formatPercent(value: number, total: number, fractionDigits?: number): string;
/**
 * Find common path prefix
 * Source @see http://stackoverflow.com/a/1917041/388951
 * @param paths List of filenames
 */
export declare function getCommonPathPrefix(paths: string[]): string;
export declare function getFirstRegexMatch(regex: RegExp, string: string): string | null;
export declare function detectEOL(content: string): string;
/**
 * Get `subString` occurrences count in `string`
 */
export declare function getOccurrencesCount(subString: string, string: string): number;
/**
 * Merge consecutive ranges with the same source
 */
export declare function mergeRanges(ranges: MappingRange[]): MappingRange[];
