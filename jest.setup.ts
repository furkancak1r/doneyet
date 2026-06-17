import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native/src/private/animated/NativeAnimatedHelper');
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

const testWindow = (globalThis as { window?: { dispatchEvent?: unknown } }).window;
if (testWindow && typeof testWindow.dispatchEvent !== 'function') {
  Object.defineProperty(testWindow, 'dispatchEvent', { value: () => true });
}
