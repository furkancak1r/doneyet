import 'react-native-gesture-handler/jestSetup';

jest.mock('expo-router', () => require('expo-router/jest/mock'));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
