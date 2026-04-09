import { ForwardedRef, forwardRef, useCallback, useRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useKeyboardAwareScrollContext } from '@/components/keyboardAwareScroll';

export const KeyboardAwareTextInput = forwardRef(function KeyboardAwareTextInput(
  { onFocus, ...props }: TextInputProps,
  forwardedRef: ForwardedRef<TextInput>
) {
  const { handleInputFocus } = useKeyboardAwareScrollContext();
  const internalRef = useRef<TextInput | null>(null);

  const setRef = useCallback(
    (node: TextInput | null) => {
      internalRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
        return;
      }

      if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  return (
    <TextInput
      {...props}
      ref={setRef}
      onFocus={(event) => {
        handleInputFocus(internalRef.current);
        onFocus?.(event);
      }}
    />
  );
});

KeyboardAwareTextInput.displayName = 'KeyboardAwareTextInput';
