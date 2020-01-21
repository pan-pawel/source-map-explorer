'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.addCoverageRanges = addCoverageRanges;
exports.setCoveredSizes = setCoveredSizes;
exports.getColorByPercent = getColorByPercent;

var _helpers = require('./helpers');

var _appError = require('./app-error');

/**
 * Convert one-line coverage ranges (exclusive) into per line ranges (inclusive)
 */
function convertRangesToLinesRanges(coverage) {
  const { ranges, text } = coverage;
  const eol = (0, _helpers.detectEOL)(text);
  const eolLength = eol.length;
  const lines = text.split(eol); // Current line offset

  let offset = 0;
  const lineRanges = lines.map(line => {
    const lineLength = line.length;

    if (lineLength === 0) {
      return [];
    } // Exclusive line start/end

    const lineStart = offset;
    const lineEnd = offset + lineLength;
    const lineRanges = ranges.reduce((result, { start, end }) => {
      // Inclusive range start/end within the line
      const startIndex = start - lineStart;
      const endIndex = end - lineStart - 1;
      const lineEndIndex = lineLength - 1;

      if (start <= lineStart && lineEnd <= end) {
        // Range includes line range
        result.push({
          start: 0,
          end: lineEndIndex,
        });
      } else if (lineStart <= start && end <= lineEnd) {
        // Line range includes range
        result.push({
          start: startIndex,
          end: endIndex,
        });
      } else if (lineStart <= start && start <= lineEnd) {
        // Range starts within line range
        result.push({
          start: startIndex,
          end: lineEndIndex,
        });
      } else if (lineStart <= end && end <= lineEnd) {
        // Range ends within line range
        result.push({
          start: 0,
          end: endIndex,
        });
      }

      return result;
    }, []); // Move to next line jumping over EOL character

    offset = lineEnd + eolLength;
    return lineRanges;
  });
  return lineRanges;
}

const PATH_SEPARATOR_REGEX = /[/\\]/;

function getPathParts(path) {
  return path.split(PATH_SEPARATOR_REGEX).filter(Boolean);
}
/**
 * Match coverages' ranges to bundles by comparing coverage URL and bundle filename
 */

function addCoverageRanges(bundles, coverageFilename) {
  if (!coverageFilename) {
    return bundles;
  }

  try {
    const coverages = JSON.parse((0, _helpers.getFileContent)(coverageFilename));
    const coveragePaths = coverages.map(({ url }) =>
      getPathParts(new URL(url).pathname || '').reverse()
    );
    const bundlesPaths = bundles.reduce((result, { code }, index) => {
      if (!Buffer.isBuffer(code)) {
        result.push([getPathParts(code).reverse(), index]);
      }

      return result;
    }, []);
    coveragePaths.forEach((partsA, coverageIndex) => {
      let matchingBundles = [...bundlesPaths]; // Start from filename and go up to path root

      for (let i = 0; i < partsA.length; i++) {
        matchingBundles = matchingBundles.filter(
          ([partsB]) => i < partsB.length && partsB[i] === partsA[i]
        ); // Stop when exact (among bundles) match found or no matches found

        if (matchingBundles.length <= 1) {
          break;
        }
      }

      if (matchingBundles.length === 1) {
        const [[, bundleIndex]] = matchingBundles;
        bundles[bundleIndex].coverageRanges = convertRangesToLinesRanges(coverages[coverageIndex]);
      }
    });
  } catch (error) {
    throw new _appError.AppError(
      {
        code: 'CannotOpenCoverageFile',
      },
      error
    );
  }

  if (bundles.every(({ coverageRanges }) => coverageRanges === undefined)) {
    throw new _appError.AppError({
      code: 'NoCoverageMatches',
    });
  }

  return bundles;
}
/**
 * Find overlaps in arrays of column ranges, using ratcheting pointers instead of nested loops for
 * O(n) runtime instead of O(n^2)
 */

function findCoveredMappingRanges(mappingRanges, coveredRanges) {
  let i = 0;
  let j = 0;
  const result = [];

  while (i < mappingRanges.length && j < coveredRanges.length) {
    const mappingRange = mappingRanges[i];
    const coveredRange = coveredRanges[j];

    if (mappingRange.start <= coveredRange.end && coveredRange.start <= mappingRange.end) {
      // Overlaps, calculate amount, move to next coverage range
      const end = Math.min(coveredRange.end, mappingRange.end);
      const start = Math.max(mappingRange.start, coveredRange.start);
      result.push({
        start,
        end,
        source: mappingRange.source,
      });

      if (
        mappingRanges[i + 1] !== undefined &&
        mappingRanges[i + 1].start <= coveredRange.end &&
        mappingRanges[i + 1].end >= coveredRange.start
      ) {
        // Next module also overlaps current coverage range, advance to next module instead of advancing coverage
        i++;
      } else {
        // Check next coverage range, it may also overlap this module range
        j++;
      }
    } else if (mappingRange.end < coveredRange.start) {
      // Module comes entirely before coverageRange, check next module range
      i++;
    }

    if (coveredRange.end < mappingRange.start) {
      // Module range comes entirely after coverage range, check next coverage range
      j++;
    }
  }

  return result;
}
/**
 * Set covered size for files
 */

function setCoveredSizes(line, files, mappingRanges, coveredRanges) {
  findCoveredMappingRanges(mappingRanges, coveredRanges).forEach(({ start, end, source }) => {
    const rangeByteLength = Buffer.byteLength(line.substring(start, end + 1));
    let coveredSize = files[source].coveredSize || 0;
    coveredSize += rangeByteLength;
    files[source].coveredSize = coveredSize;
  });
  return files;
}

const percentColors = [
  {
    percent: 0.0,
    color: {
      r: 0xff,
      g: 0x00,
      b: 0,
    },
  },
  {
    percent: 0.5,
    color: {
      r: 0xff,
      g: 0xff,
      b: 0,
    },
  },
  {
    percent: 1.0,
    color: {
      r: 0x00,
      g: 0xff,
      b: 0,
    },
  },
];
/**
 * Get heat map color by coverage percent
 */

function getColorByPercent(percent) {
  let i = 1;

  for (; i < percentColors.length - 1; i++) {
    if (percent < percentColors[i].percent) {
      break;
    }
  }

  const lowerColor = percentColors[i - 1];
  const upperColor = percentColors[i];
  const rangeWithinColors = upperColor.percent - lowerColor.percent;
  const rangePercent = (percent - lowerColor.percent) / rangeWithinColors;
  const percentLower = 1 - rangePercent;
  const percentUpper = rangePercent;
  const r = Math.floor(lowerColor.color.r * percentLower + upperColor.color.r * percentUpper);
  const g = Math.floor(lowerColor.color.g * percentLower + upperColor.color.g * percentUpper);
  const b = Math.floor(lowerColor.color.b * percentLower + upperColor.color.b * percentUpper);
  return `rgb(${r}, ${g}, ${b})`;
}
