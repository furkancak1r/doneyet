const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper || {}),
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.[jt]sx?$': '<rootDir>/jest.transform.cjs',
    '^.+\\.(bmp|gif|jpg|jpeg|png|psd|svg|webp|xml|m4v|mov|mp4|mpeg|mpg|webm|aac|aiff|caf|m4a|mp3|wav|html|pdf|yaml|yml|otf|ttf|zip|heic|avif|db)$': require.resolve(
      'jest-expo/src/preset/assetFileTransformer.js'
    )
  },
  transformIgnorePatterns: expoPreset.transformIgnorePatterns
};
