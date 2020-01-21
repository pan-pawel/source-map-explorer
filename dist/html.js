'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.generateHtml = generateHtml;

var _btoa = _interopRequireDefault(require('btoa'));

var _ejs = _interopRequireDefault(require('ejs'));

var _fs = _interopRequireDefault(require('fs'));

var _path = _interopRequireDefault(require('path'));

var _escapeHtml = _interopRequireDefault(require('escape-html'));

var _helpers = require('./helpers');

var _coverage = require('./coverage');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Generate HTML file content for specified files
 */
function generateHtml(exploreResults) {
  const assets = {
    webtreemapJs: (0, _btoa.default)(
      _fs.default.readFileSync(require.resolve('./vendor/webtreemap.js'))
    ),
    webtreemapCss: (0, _btoa.default)(
      _fs.default.readFileSync(require.resolve('./vendor/webtreemap.css'))
    ),
  }; // Create a combined bundle if applicable

  if (exploreResults.length > 1) {
    exploreResults = [makeMergedBundle(exploreResults)].concat(exploreResults);
  } // Get bundles info to generate select element

  const bundles = exploreResults.map(data => ({
    name: data.bundleName,
    size: (0, _helpers.formatBytes)(data.totalBytes),
  })); // Get webtreemap data to update map on bundle select

  const treeDataMap = exploreResults.reduce((result, data, index) => {
    result[index] = {
      name: data.bundleName,
      data: getWebTreeMapData(data),
    };
    return result;
  }, {});
  const template = (0, _helpers.getFileContent)(_path.default.join(__dirname, 'tree-viz.ejs'));
  return _ejs.default.render(template, {
    bundles,
    treeDataMap,
    webtreemapJs: assets.webtreemapJs,
    webtreemapCss: assets.webtreemapCss,
  });
}
/**
 * Create a combined result where each of the inputs is a separate node under the root
 */

function makeMergedBundle(exploreResults) {
  let totalBytes = 0;
  const files = {}; // Remove any common prefix to keep the visualization as simple as possible.

  const commonPrefix = (0, _helpers.getCommonPathPrefix)(exploreResults.map(r => r.bundleName));

  for (const result of exploreResults) {
    totalBytes += result.totalBytes;
    const prefix = result.bundleName.slice(commonPrefix.length);
    Object.entries(result.files).forEach(([fileName, size]) => {
      files[`${prefix}/${fileName}`] = size;
    });
  }

  return {
    bundleName: '[combined]',
    totalBytes,
    mappedBytes: 0,
    unmappedBytes: 0,
    eolBytes: 0,
    sourceMapCommentBytes: 0,
    files,
  };
}

/**
 * Convert file size map to webtreemap data
 */
function getWebTreeMapData(data) {
  const files = data.files;
  const treeData = newNode('/');

  for (const source in files) {
    addNode(source, files[source], treeData);
  }

  addSizeToTitle(treeData, treeData.data['$area']);
  return treeData;
}

function newNode(name) {
  return {
    name: (0, _escapeHtml.default)(name),
    data: {
      $area: 0,
    },
  };
}

function setNodeData(node, fileData) {
  const size = node.data['$area'] + fileData.size;

  if (fileData.coveredSize !== undefined) {
    const coveredSize = (node.data.coveredSize || 0) + fileData.coveredSize;
    node.data.coveredSize = coveredSize;
    node.data.backgroundColor = (0, _coverage.getColorByPercent)(coveredSize / size);
  }

  node.data['$area'] = size;
}

function addNode(source, fileData, treeData) {
  // No need to create nodes with zero size (e.g. '[unmapped]')
  if (fileData.size === 0) {
    return;
  }

  const parts = source.split('/');
  let node = treeData;
  setNodeData(node, fileData);
  parts.forEach(part => {
    if (!node.children) {
      node.children = [];
    }

    let child = node.children.find(child => child.name === part);

    if (!child) {
      child = newNode(part);
      node.children.push(child);
    }

    node = child;
    setNodeData(child, fileData);
  });
}

function addSizeToTitle(node, total) {
  const { $area: size, coveredSize } = node.data;
  const titleParts = [
    node.name,
    (0, _helpers.formatBytes)(size),
    `${(0, _helpers.formatPercent)(size, total, 1)}%`,
  ]; // Add coverage label to leaf nodes only

  if (coveredSize !== undefined && node.children === undefined) {
    titleParts.push(`Coverage: ${(0, _helpers.formatPercent)(coveredSize, size, 1)}%`);
  }

  node.name = titleParts.join(' • ');

  if (node.children) {
    node.children.forEach(child => {
      addSizeToTitle(child, total);
    });
  }
}
