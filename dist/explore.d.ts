import { BasicSourceMapConsumer, IndexedSourceMapConsumer } from 'source-map';
import { File, Bundle, ExploreOptions, ExploreBundleResult, FileSizes, CoverageRange, FileDataMap } from './index';
export declare const UNMAPPED_KEY = "[unmapped]";
export declare const SOURCE_MAP_COMMENT_KEY = "[sourceMappingURL]";
export declare const NO_SOURCE_KEY = "[no source]";
export declare const EOL_KEY = "[EOLs]";
export declare const SPECIAL_FILENAMES: string[];
/**
 * Analyze a bundle
 */
export declare function exploreBundle(bundle: Bundle, options: ExploreOptions): Promise<ExploreBundleResult>;
declare type Consumer = BasicSourceMapConsumer | IndexedSourceMapConsumer;
interface SourceMapData {
    consumer: Consumer;
    codeFileContent: string;
}
/**
 * Get source map
 */
export declare function loadSourceMap(codeFile: File, sourceMapFile?: File): Promise<SourceMapData>;
/**
 * Calculate the number of bytes contributed by each source file
 */
export declare function computeFileSizes(sourceMapData: SourceMapData, options: ExploreOptions, coverageRanges?: CoverageRange[][]): FileSizes;
export declare function adjustSourcePaths(fileSizeMap: FileDataMap, options: ExploreOptions): FileDataMap;
export {};
