'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.exploreBundle = exploreBundle;
exports.loadSourceMap = loadSourceMap;
exports.computeFileSizes = computeFileSizes;
exports.adjustSourcePaths = adjustSourcePaths;
exports.SPECIAL_FILENAMES = exports.EOL_KEY = exports.NO_SOURCE_KEY = exports.SOURCE_MAP_COMMENT_KEY = exports.UNMAPPED_KEY = void 0;

var _convertSourceMap = _interopRequireDefault(require('convert-source-map'));

var _path = _interopRequireDefault(require('path'));

var _sourceMap = require('source-map');

var _lodash = require('lodash');

var _api = require('./api');

var _helpers = require('./helpers');

var _appError = require('./app-error');

var _coverage = require('./coverage');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

const UNMAPPED_KEY = '[unmapped]';
exports.UNMAPPED_KEY = UNMAPPED_KEY;
const SOURCE_MAP_COMMENT_KEY = '[sourceMappingURL]';
exports.SOURCE_MAP_COMMENT_KEY = SOURCE_MAP_COMMENT_KEY;
const NO_SOURCE_KEY = '[no source]';
exports.NO_SOURCE_KEY = NO_SOURCE_KEY;
const EOL_KEY = '[EOLs]';
exports.EOL_KEY = EOL_KEY;
const SPECIAL_FILENAMES = [UNMAPPED_KEY, SOURCE_MAP_COMMENT_KEY, NO_SOURCE_KEY, EOL_KEY];
/**
 * Analyze a bundle
 */

exports.SPECIAL_FILENAMES = SPECIAL_FILENAMES;

async function exploreBundle(bundle, options) {
  const { code, map, coverageRanges } = bundle;
  const sourceMapData = await loadSourceMap(code, map);
  const sizes = computeFileSizes(sourceMapData, options, coverageRanges);
  const files = adjustSourcePaths(sizes.files, options); // Free Wasm data

  sourceMapData.consumer.destroy();
  return {
    bundleName: (0, _api.getBundleName)(bundle),
    ...sizes,
    files,
  };
}

/**
 * Get source map
 */
async function loadSourceMap(codeFile, sourceMapFile) {
  const codeFileContent = (0, _helpers.getFileContent)(codeFile);
  let consumer;

  if (sourceMapFile) {
    const sourceMapFileContent = (0, _helpers.getFileContent)(sourceMapFile);
    consumer = await new _sourceMap.SourceMapConsumer(sourceMapFileContent);
  } else {
    // Try to read a source map from a 'sourceMappingURL' comment.
    let converter = _convertSourceMap.default.fromSource(codeFileContent);

    if (!converter && !Buffer.isBuffer(codeFile)) {
      converter = _convertSourceMap.default.fromMapFileSource(
        codeFileContent,
        _path.default.dirname(codeFile)
      );
    }

    if (!converter) {
      throw new _appError.AppError({
        code: 'NoSourceMap',
      });
    }

    consumer = await new _sourceMap.SourceMapConsumer(converter.toJSON());
  }

  if (!consumer) {
    throw new _appError.AppError({
      code: 'NoSourceMap',
    });
  }

  return {
    consumer,
    codeFileContent,
  };
}

const COMMENT_REGEX = _convertSourceMap.default.commentRegex;
const MAP_FILE_COMMENT_REGEX = _convertSourceMap.default.mapFileCommentRegex;
/**
 * Extract either source map comment/file
 */

function getSourceMapComment(fileContent) {
  const sourceMapComment =
    (0, _helpers.getFirstRegexMatch)(COMMENT_REGEX, fileContent) ||
    (0, _helpers.getFirstRegexMatch)(MAP_FILE_COMMENT_REGEX, fileContent) ||
    ''; // Remove trailing EOLs

  return sourceMapComment.trim();
}

function checkInvalidMappingColumn({ generatedLine, generatedColumn, line }) {
  const maxColumnIndex = line.length - 1;

  if (generatedColumn > maxColumnIndex) {
    throw new _appError.AppError({
      code: 'InvalidMappingColumn',
      generatedLine,
      generatedColumn,
      maxColumn: line.length,
    });
  }
}
/**
 * Calculate the number of bytes contributed by each source file
 */

function computeFileSizes(sourceMapData, options, coverageRanges) {
  const { consumer, codeFileContent: fileContent } = sourceMapData;
  const sourceMapComment = getSourceMapComment(fileContent); // Remove inline source map comment, source map file comment and trailing EOLs

  const source = fileContent.replace(sourceMapComment, '').trim();
  const eol = (0, _helpers.detectEOL)(fileContent); // Assume only one type of EOL is used

  const lines = source.split(eol);
  const mappingRanges = [];
  consumer.computeColumnSpans();
  consumer.eachMapping(({ source, generatedLine, generatedColumn, lastGeneratedColumn }) => {
    // Columns are 0-based, Lines are 1-based
    const lineIndex = generatedLine - 1;
    const line = lines[lineIndex];

    if (line === undefined) {
      throw new _appError.AppError({
        code: 'InvalidMappingLine',
        generatedLine,
        maxLine: lines.length,
      });
    } // Ignore mapping referencing EOL character (e.g. https://github.com/microsoft/TypeScript/issues/34695)

    if (`${line}${eol}`.lastIndexOf(eol) === generatedColumn) {
      return;
    }

    checkInvalidMappingColumn({
      generatedLine,
      generatedColumn,
      line,
    });

    if (lastGeneratedColumn !== null) {
      checkInvalidMappingColumn({
        generatedLine,
        generatedColumn: lastGeneratedColumn,
        line,
      });
    }

    const start = generatedColumn;
    const end = lastGeneratedColumn === null ? line.length - 1 : lastGeneratedColumn;
    const lineRanges = mappingRanges[lineIndex] || [];
    lineRanges.push({
      start,
      end,
      source: source === null ? NO_SOURCE_KEY : source,
    });
    mappingRanges[lineIndex] = lineRanges;
  });
  let files = {};
  let mappedBytes = 0;
  mappingRanges.forEach((lineRanges, lineIndex) => {
    const line = lines[lineIndex];
    const mergedRanges = (0, _helpers.mergeRanges)(lineRanges);
    mergedRanges.forEach(({ start, end, source }) => {
      // To account unicode measure byte length rather than symbols count
      const rangeByteLength = Buffer.byteLength(line.substring(start, end + 1));

      if (!files[source]) {
        files[source] = {
          size: 0,
        };
      }

      files[source].size += rangeByteLength;
      mappedBytes += rangeByteLength;
    });

    if (coverageRanges) {
      files = (0, _coverage.setCoveredSizes)(line, files, mergedRanges, coverageRanges[lineIndex]);
    }
  });
  const sourceMapCommentBytes = Buffer.byteLength(sourceMapComment);
  const eolBytes = (0, _helpers.getOccurrencesCount)(eol, fileContent) * Buffer.byteLength(eol);
  const totalBytes = Buffer.byteLength(fileContent);
  const unmappedBytes = totalBytes - mappedBytes - sourceMapCommentBytes - eolBytes;

  if (!options.excludeSourceMapComment) {
    files[SOURCE_MAP_COMMENT_KEY] = {
      size: sourceMapCommentBytes,
    };
  }

  if (!options.onlyMapped) {
    files[UNMAPPED_KEY] = {
      size: unmappedBytes,
    };
  }

  if (eolBytes > 0) {
    files[EOL_KEY] = {
      size: eolBytes,
    };
  }

  return {
    ...(options.excludeSourceMapComment
      ? {
          totalBytes: totalBytes - sourceMapCommentBytes,
        }
      : {
          totalBytes,
        }),
    mappedBytes,
    unmappedBytes,
    eolBytes,
    sourceMapCommentBytes,
    files,
  };
}

function adjustSourcePaths(fileSizeMap, options) {
  if (!options.noRoot) {
    const prefix = (0, _helpers.getCommonPathPrefix)(Object.keys(fileSizeMap));
    const length = prefix.length;

    if (length) {
      fileSizeMap = (0, _lodash.mapKeys)(fileSizeMap, (size, source) => source.slice(length));
    }
  }

  if (options.replaceMap) {
    fileSizeMap = Object.entries(options.replaceMap).reduce((result, [before, after]) => {
      const regexp = new RegExp(before, 'g');
      return (0, _lodash.mapKeys)(result, (size, source) => source.replace(regexp, after));
    }, fileSizeMap);
  }

  return fileSizeMap;
}
