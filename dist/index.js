'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
Object.defineProperty(exports, 'explore', {
  enumerable: true,
  get: function() {
    return _api.explore;
  },
});
Object.defineProperty(exports, 'getExploreResult', {
  enumerable: true,
  get: function() {
    return _api.getExploreResult;
  },
});
Object.defineProperty(exports, 'saveOutputToFile', {
  enumerable: true,
  get: function() {
    return _output.saveOutputToFile;
  },
});
Object.defineProperty(exports, 'writeHtmlToTempFile', {
  enumerable: true,
  get: function() {
    return _cli.writeHtmlToTempFile;
  },
});
Object.defineProperty(exports, 'loadSourceMap', {
  enumerable: true,
  get: function() {
    return _explore.loadSourceMap;
  },
});
Object.defineProperty(exports, 'adjustSourcePaths', {
  enumerable: true,
  get: function() {
    return _explore.adjustSourcePaths;
  },
});
Object.defineProperty(exports, 'UNMAPPED_KEY', {
  enumerable: true,
  get: function() {
    return _explore.UNMAPPED_KEY;
  },
});
Object.defineProperty(exports, 'SOURCE_MAP_COMMENT_KEY', {
  enumerable: true,
  get: function() {
    return _explore.SOURCE_MAP_COMMENT_KEY;
  },
});
Object.defineProperty(exports, 'NO_SOURCE_KEY', {
  enumerable: true,
  get: function() {
    return _explore.NO_SOURCE_KEY;
  },
});
exports.default = void 0;

var _api = require('./api');

var _output = require('./output');

var _cli = require('./cli');

var _explore = require('./explore');

var _default = _api.explore; // Export all interfaces from index.ts to avoid type exports in compiled js code. See https://github.com/babel/babel/issues/8361

exports.default = _default;
