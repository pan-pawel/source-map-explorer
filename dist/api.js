'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.explore = explore;
exports.getBundles = getBundles;
exports.getBundleName = getBundleName;
exports.getExploreResult = getExploreResult;

var _glob = _interopRequireDefault(require('glob'));

var _lodash = require('lodash');

var _explore = require('./explore');

var _appError = require('./app-error');

var _output = require('./output');

var _coverage = require('./coverage');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Analyze bundle(s)
 */
async function explore(bundlesAndFileTokens, options = {}) {
  bundlesAndFileTokens = Array.isArray(bundlesAndFileTokens)
    ? bundlesAndFileTokens
    : [bundlesAndFileTokens];

  if (bundlesAndFileTokens.length === 0) {
    throw new _appError.AppError({
      code: 'NoBundles',
    });
  } // Separate bundles from file tokens

  const [fileTokens, bundles] = (0, _lodash.partition)(bundlesAndFileTokens, _lodash.isString); // Get bundles from file tokens

  bundles.push(...getBundles(fileTokens));
  (0, _coverage.addCoverageRanges)(bundles, options.coverage);
  const results = await Promise.all(
    bundles.map(bundle =>
      (0, _explore.exploreBundle)(bundle, options).catch(error => onExploreError(bundle, error))
    )
  );
  const exploreResult = getExploreResult(results, options); // Reject if none of results is successful

  if (exploreResult.bundles.length === 0) {
    return Promise.reject(exploreResult);
  }

  (0, _output.saveOutputToFile)(exploreResult, options);
  return exploreResult;
}
/**
 * Expand list of file tokens into a list of bundles
 */

function getBundles(fileTokens) {
  const filenames = (0, _lodash.flatMap)(fileTokens, filePath =>
    _glob.default.hasMagic(filePath) ? expandGlob(filePath) : filePath
  );
  const [mapFilenames, codeFilenames] = (0, _lodash.partition)(filenames, filename =>
    filename.endsWith('.map')
  );
  return codeFilenames.map(code => ({
    code,
    map: mapFilenames.find(filename => filename === `${code}.map`),
  }));
}

function expandGlob(pattern) {
  // Make sure pattern match `.map` files as well
  if (pattern.endsWith('.js')) {
    pattern = `${pattern}?(.map)`;
  }

  return _glob.default.sync(pattern);
}

function getBundleName(bundle) {
  return Buffer.isBuffer(bundle.code) ? 'Buffer' : bundle.code;
}
/**
 * Handle error during bundle processing
 */

function onExploreError(bundle, error) {
  return {
    bundleName: getBundleName(bundle),
    code: error.code || 'Unknown',
    message: error.message,
    error,
  };
}

function getExploreResult(results, options) {
  const [bundles, errors] = (0, _lodash.partition)(results, result => 'files' in result);
  errors.push(...getPostExploreErrors(bundles));
  return {
    bundles,
    errors,
    ...(bundles.length > 0 && {
      output: (0, _output.formatOutput)(bundles, options),
    }),
  };
}

function getPostExploreErrors(exploreBundleResults) {
  const errors = [];
  const isSingleBundle = exploreBundleResults.length === 1;

  for (const result of exploreBundleResults) {
    const { bundleName, files, totalBytes } = result; // Check if source map contains only one file - this make result useless when exploring single bundle

    if (isSingleBundle) {
      const filenames = Object.keys(files).filter(
        filename => !_explore.SPECIAL_FILENAMES.includes(filename)
      );

      if (filenames.length === 1) {
        errors.push({
          bundleName,
          isWarning: true,
          code: 'OneSourceSourceMap',
          message: (0, _appError.getErrorMessage)({
            code: 'OneSourceSourceMap',
            filename: filenames[0],
          }),
        });
      }
    }

    if (files[_explore.UNMAPPED_KEY] !== undefined) {
      const { size: unmappedBytes } = files[_explore.UNMAPPED_KEY];

      if (unmappedBytes) {
        errors.push({
          bundleName,
          isWarning: true,
          code: 'UnmappedBytes',
          message: (0, _appError.getErrorMessage)({
            code: 'UnmappedBytes',
            unmappedBytes,
            totalBytes,
          }),
        });
      }
    }
  }

  return errors;
}
