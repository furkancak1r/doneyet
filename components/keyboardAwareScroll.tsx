import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Dimensions, Keyboard, NativeSyntheticEvent, NativeScrollEvent, Platform, ScrollViewProps } from 'react-native';
import { getKeyboardAwareScrollTarget } from '@/utils/keyboardAwareScroll';

const DEFAULT_KEYBOARD_GAP = 24;

type MeasureCallback = (x: number, y: number, width: number, height: number) => void;

export type KeyboardAwareScrollHandle = {
  measureInWindow: (callback: MeasureCallback) => void;
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
};

export type KeyboardAwareInputHandle = {
  measureInWindow: (callback: MeasureCallback) => void;
};

export type KeyboardAwareScrollController = {
  registerScrollHandle: (handle: KeyboardAwareScrollHandle | null) => void;
  handleInputFocus: (input: KeyboardAwareInputHandle | null) => void;
  scrollViewProps: Pick<
    ScrollViewProps,
    'automaticallyAdjustKeyboardInsets' | 'keyboardDismissMode' | 'keyboardShouldPersistTaps' | 'onLayout' | 'onScroll' | 'scrollEventThrottle'
  >;
};

const noop = () => {};

const defaultController: KeyboardAwareScrollController = {
  registerScrollHandle: noop,
  handleInputFocus: noop,
  scrollViewProps: {
    keyboardShouldPersistTaps: 'handled',
    keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'on-drag',
    automaticallyAdjustKeyboardInsets: Platform.OS === 'ios',
    scrollEventThrottle: 16,
    onLayout: noop,
    onScroll: noop
  }
};

const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollController>(defaultController);

export function useKeyboardAwareScrollController(): KeyboardAwareScrollController {
  const scrollHandleRef = useRef<KeyboardAwareScrollHandle | null>(null);
  const focusedInputRef = useRef<KeyboardAwareInputHandle | null>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);

  const measureScrollFrame = useCallback((onMeasured?: (top: number, height: number) => void) => {
    scrollHandleRef.current?.measureInWindow((_x, y, _width, height) => {
      onMeasured?.(y, height);
    });
  }, []);

  const scrollFocusedInputIntoView = useCallback(() => {
    if (!scrollHandleRef.current || !focusedInputRef.current || keyboardTopRef.current === null) {
      return;
    }

    const scrollHandle = scrollHandleRef.current;
    const focusedInput = focusedInputRef.current;
    const keyboardTop = keyboardTopRef.current;

    measureScrollFrame((containerTop, containerHeight) => {
      focusedInput.measureInWindow((_x, fieldTop, _width, fieldHeight) => {
        const targetScrollY = getKeyboardAwareScrollTarget({
          currentScrollY: scrollOffsetRef.current,
          fieldTop,
          fieldHeight,
          containerTop,
          containerHeight,
          keyboardTop,
          extraOffset: DEFAULT_KEYBOARD_GAP
        });

        if (targetScrollY === null || targetScrollY <= scrollOffsetRef.current) {
          return;
        }

        scrollHandle.scrollTo({ y: targetScrollY, animated: true });
      });
    });
  }, [measureScrollFrame]);

  useEffect(() => {
    const handleKeyboardFrame = (event: { endCoordinates?: { height?: number; screenY?: number } }) => {
      const windowHeight = Dimensions.get('window').height;
      const nextKeyboardTop = event.endCoordinates?.height
        ? event.endCoordinates?.screenY ?? windowHeight - event.endCoordinates.height
        : null;

      keyboardTopRef.current = nextKeyboardTop;

      requestAnimationFrame(() => {
        scrollFocusedInputIntoView();
      });
    };

    const resetKeyboard = () => {
      keyboardTopRef.current = null;
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardFrame);
    const hideSubscription = Keyboard.addListener(hideEvent, resetKeyboard);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollFocusedInputIntoView]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const handleLayout = useCallback(() => {
    requestAnimationFrame(() => {
      scrollFocusedInputIntoView();
    });
  }, [scrollFocusedInputIntoView]);

  const registerScrollHandle = useCallback((handle: KeyboardAwareScrollHandle | null) => {
    scrollHandleRef.current = handle;

    if (!handle) {
      return;
    }

    requestAnimationFrame(() => {
      scrollFocusedInputIntoView();
    });
  }, [scrollFocusedInputIntoView]);

  const handleInputFocus = useCallback((input: KeyboardAwareInputHandle | null) => {
    focusedInputRef.current = input;

    requestAnimationFrame(() => {
      scrollFocusedInputIntoView();
    });
  }, [scrollFocusedInputIntoView]);

  return useMemo(
    () => ({
      registerScrollHandle,
      handleInputFocus,
      scrollViewProps: {
        keyboardShouldPersistTaps: 'handled',
        keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'on-drag',
        automaticallyAdjustKeyboardInsets: Platform.OS === 'ios',
        scrollEventThrottle: 16,
        onLayout: handleLayout,
        onScroll: handleScroll
      }
    }),
    [handleInputFocus, handleLayout, handleScroll, registerScrollHandle]
  );
}

export function KeyboardAwareScrollProvider({
  controller,
  children
}: {
  controller: KeyboardAwareScrollController;
  children: ReactNode;
}) {
  return <KeyboardAwareScrollContext.Provider value={controller}>{children}</KeyboardAwareScrollContext.Provider>;
}

export function useKeyboardAwareScrollContext() {
  return useContext(KeyboardAwareScrollContext);
}
