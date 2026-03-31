import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native/src/private/animated/NativeAnimatedHelper');
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
