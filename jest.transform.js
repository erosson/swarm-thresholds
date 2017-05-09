// Custom Jest transform implementation that wraps babel-jest and injects our
// babel presets, so we don't have to use .babelrc.
// https://github.com/facebook/jest/issues/1468#issuecomment-276753756

module.exports = require('babel-jest').createTransformer({
  presets: ['es2015', 'react'],
});
