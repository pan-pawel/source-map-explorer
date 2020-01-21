import { ExploreBundleResult, ExploreOptions, ExploreResult } from './index';
export declare function formatOutput(results: ExploreBundleResult[], options: ExploreOptions): string | undefined;
export declare function saveOutputToFile(result: ExploreResult, options: ExploreOptions): void;