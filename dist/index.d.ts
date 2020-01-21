/// <reference types="node" />
import { explore, getExploreResult } from './api';
import { saveOutputToFile } from './output';
import { writeHtmlToTempFile } from './cli';
import { loadSourceMap, adjustSourcePaths, UNMAPPED_KEY, SOURCE_MAP_COMMENT_KEY, NO_SOURCE_KEY } from './explore';
export { explore, getExploreResult, loadSourceMap, adjustSourcePaths, saveOutputToFile, writeHtmlToTempFile, UNMAPPED_KEY, SOURCE_MAP_COMMENT_KEY, NO_SOURCE_KEY, };
export default explore;
export interface FileData {
    size: number;
    coveredSize?: number;
}
export declare type FileDataMap = Record<string, FileData>;
export interface FileSizes {
    files: FileDataMap;
    mappedBytes: number;
    unmappedBytes: number;
    eolBytes: number;
    sourceMapCommentBytes: number;
    totalBytes: number;
}
export declare type ErrorCode = 'Unknown' | 'NoBundles' | 'NoSourceMap' | 'OneSourceSourceMap' | 'UnmappedBytes' | 'InvalidMappingLine' | 'InvalidMappingColumn' | 'CannotSaveFile' | 'CannotCreateTempFile' | 'CannotOpenTempFile' | 'CannotOpenCoverageFile' | 'NoCoverageMatches';
export declare type File = string | Buffer;
export declare type ReplaceMap = Record<string, string>;
export declare type OutputFormat = 'json' | 'tsv' | 'html';
/** Represents single bundle */
export interface Bundle {
    code: File;
    map?: File;
    coverageRanges?: ColumnsRange[][];
}
export interface ExploreOptions {
    /** Exclude "unmapped" bytes from the output */
    onlyMapped?: boolean;
    /** Exclude source map comment size from output */
    excludeSourceMapComment?: boolean;
    /** Output result as a string */
    output?: {
        format: OutputFormat;
        /** Filename to save output to */
        filename?: string;
    };
    /** Disable removing prefix shared by all sources */
    noRoot?: boolean;
    /** Replace "this" by "that" map */
    replaceMap?: ReplaceMap;
    coverage?: string;
}
export interface ExploreResult {
    bundles: ExploreBundleResult[];
    /** Result as a string - either JSON, TSV or HTML */
    output?: string;
    errors: ExploreErrorResult[];
}
export interface ExploreBundleResult extends FileSizes {
    bundleName: string;
}
export interface ExploreErrorResult {
    bundleName: string;
    code: string;
    message: string;
    error?: NodeJS.ErrnoException;
    isWarning?: boolean;
}
export declare type BundlesAndFileTokens = (Bundle | string)[] | Bundle | string;
/** Represents inclusive range (e.g. [0,5] six columns) */
export interface ColumnsRange {
    /** Fist column index */
    start: number;
    /** Last column index */
    end: number;
}
export interface MappingRange extends ColumnsRange {
    source: string;
}
/** Represents exclusive range (e.g. [0,5) - four columns) */
export interface Coverage {
    url: string;
    ranges: CoverageRange[];
    /** File content as one line */
    text: string;
}
export interface CoverageRange {
    /** First column index */
    start: number;
    /** Column index next after last column index */
    end: number;
}
declare module 'source-map' {
    interface MappingItem {
        lastGeneratedColumn: number | null;
    }
}
