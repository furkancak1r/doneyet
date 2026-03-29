const { createTransformer } = require('babel-jest');

module.exports = createTransformer({
  configFile: require.resolve('./babel.config.js')
});
