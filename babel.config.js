module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '^@/(.*)$': './\\1'
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};
