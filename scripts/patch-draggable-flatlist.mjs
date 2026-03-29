import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const packageRoot = join(process.cwd(), 'node_modules', 'react-native-draggable-flatlist');

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

const sourceFile = join(packageRoot, 'src', 'components', 'NestableDraggableFlatList.tsx');
const moduleFile = join(packageRoot, 'lib', 'module', 'components', 'NestableDraggableFlatList.js');
const commonjsFile = join(packageRoot, 'lib', 'commonjs', 'components', 'NestableDraggableFlatList.js');

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

if (sourcePatched || modulePatched || commonjsPatched) {
  console.log('Patched react-native-draggable-flatlist nested measurement warning.');
}
