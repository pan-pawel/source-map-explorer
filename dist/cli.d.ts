#!/usr/bin/env node
import { ErrorContext } from './app-error';
export declare function logError(message: string | ErrorContext, error?: Error): void;
export declare function logWarn(message: string): void;
export declare function logInfo(message: string): void;
/**
 * Write HTML content to a temporary file and open the file in a browser
 */
export declare function writeHtmlToTempFile(html?: string): Promise<void>;
