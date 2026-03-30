import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const draggableFlatListRoot = join(process.cwd(), 'node_modules', 'react-native-draggable-flatlist');
const reactNativeScreensRoot = join(process.cwd(), 'node_modules', 'react-native-screens');

function patchFile(filePath, replacements) {
  if (!existsSync(filePath)) {
    return false;
  }

  const original = readFileSync(filePath, 'utf8');
  let next = original;

  for (const [search, replace] of replacements) {
    next = next.replace(search, replace);
  }

  if (next === original) {
    return false;
  }

  writeFileSync(filePath, next);
  return true;
}

const sourceFile = join(draggableFlatListRoot, 'src', 'components', 'NestableDraggableFlatList.tsx');
const moduleFile = join(draggableFlatListRoot, 'lib', 'module', 'components', 'NestableDraggableFlatList.js');
const commonjsFile = join(draggableFlatListRoot, 'lib', 'commonjs', 'components', 'NestableDraggableFlatList.js');

const sourcePatched = patchFile(sourceFile, [
  ['import { findNodeHandle, LogBox } from "react-native";', 'import { findNodeHandle, LogBox, UIManager } from "react-native";'],
  [
    '    //@ts-ignore\n    containerRef.current.measureLayout(nodeHandle, onSuccess, onFail);',
    '    const containerNode = findNodeHandle(containerRef.current);\n    if (containerNode != null && nodeHandle != null) {\n      UIManager.measureLayout(containerNode, nodeHandle, onFail, onSuccess);\n    } else {\n      onFail();\n    }'
  ]
]);

const modulePatched = patchFile(moduleFile, [
  ['import { findNodeHandle, LogBox } from "react-native";', 'import { findNodeHandle, LogBox, UIManager } from "react-native";'],
  [
    'containerRef.current.measureLayout(nodeHandle,onSuccess,onFail);',
    'var containerNode=(0,_reactNative.findNodeHandle)(containerRef.current);if(containerNode!=null&&nodeHandle!=null){_reactNative.UIManager.measureLayout(containerNode,nodeHandle,onFail,onSuccess);}else{onFail();}'
  ]
]);

const commonjsPatched = patchFile(commonjsFile, [
  ['var _reactNative=require("react-native");', 'var _reactNative=require("react-native");'],
  [
    'containerRef.current.measureLayout(nodeHandle,onSuccess,onFail);',
    'var containerNode=(0,_reactNative.findNodeHandle)(containerRef.current);if(containerNode!=null&&nodeHandle!=null){_reactNative.UIManager.measureLayout(containerNode,nodeHandle,onFail,onSuccess);}else{onFail();}'
  ]
]);

const screensSourceFile = join(reactNativeScreensRoot, 'src', 'components', 'Screen.tsx');
const screensModuleFile = join(reactNativeScreensRoot, 'lib', 'module', 'components', 'Screen.js');
const screensCommonjsFile = join(reactNativeScreensRoot, 'lib', 'commonjs', 'components', 'Screen.js');

const transitionListenerSource = `    const goingForward = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      if (!__DEV__ || Platform.OS !== 'ios' || !props.isNativeStack) {
        return;
      }

      const values = [progress, closing, goingForward];
      const subscriptionIds = values.map((value) => value.addListener(() => {}));

      return () => {
        subscriptionIds.forEach((subscriptionId, index) => {
          values[index]?.removeListener(subscriptionId);
        });
      };
    }, [closing, goingForward, progress, props.isNativeStack]);`;

const transitionListenerModule = `  const goingForward = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!__DEV__ || Platform.OS !== 'ios' || !props.isNativeStack) {
      return;
    }
    const values = [progress, closing, goingForward];
    const subscriptionIds = values.map(value => value.addListener(() => {}));
    return () => {
      subscriptionIds.forEach((subscriptionId, index) => {
        values[index]?.removeListener(subscriptionId);
      });
    };
  }, [closing, goingForward, progress, props.isNativeStack]);`;

const transitionListenerCommonjs = `  const goingForward = _react.default.useRef(new _reactNative.Animated.Value(0)).current;
  _react.default.useEffect(() => {
    if (!__DEV__ || _reactNative.Platform.OS !== 'ios' || !props.isNativeStack) {
      return;
    }
    const values = [progress, closing, goingForward];
    const subscriptionIds = values.map(value => value.addListener(() => {}));
    return () => {
      subscriptionIds.forEach((subscriptionId, index) => {
        values[index]?.removeListener(subscriptionId);
      });
    };
  }, [closing, goingForward, progress, props.isNativeStack]);`;

const screensSourcePatched = patchFile(screensSourceFile, [
  ['    const goingForward = React.useRef(new Animated.Value(0)).current;', transitionListenerSource]
]);

const screensModulePatched = patchFile(screensModuleFile, [
  ['  const goingForward = React.useRef(new Animated.Value(0)).current;', transitionListenerModule]
]);

const screensCommonjsPatched = patchFile(screensCommonjsFile, [
  ['  const goingForward = _react.default.useRef(new _reactNative.Animated.Value(0)).current;', transitionListenerCommonjs]
]);

if (sourcePatched || modulePatched || commonjsPatched) {
  console.log('Patched react-native-draggable-flatlist nested measurement warning.');
}

if (screensSourcePatched || screensModulePatched || screensCommonjsPatched) {
  console.log('Patched react-native-screens native stack animated value listener warning.');
}
