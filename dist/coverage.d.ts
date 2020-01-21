import { Bundle, ColumnsRange, MappingRange, FileDataMap } from './index';
/**
 * Match coverages' ranges to bundles by comparing coverage URL and bundle filename
 */
export declare function addCoverageRanges(bundles: Bundle[], coverageFilename?: string): Bundle[];
/**
 * Set covered size for files
 */
export declare function setCoveredSizes(line: string, files: FileDataMap, mappingRanges: MappingRange[], coveredRanges: ColumnsRange[]): FileDataMap;
/**
 * Get heat map color by coverage percent
 */
export declare function getColorByPercent(percent: number): string;
