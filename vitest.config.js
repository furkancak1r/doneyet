const { resolve } = require('node:path');

module.exports = {
  resolve: {
    alias: {
      '@': resolve(__dirname, '.')
    }
  },
  test: {
    environment: 'node',
    globals: true
  }
};
