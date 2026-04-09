import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetHomeActiveTaskSwipeHintForTests,
  canShowHomeActiveTaskSwipeHint,
  consumeHomeActiveTaskSwipeHint
} from '../utils/swipeHintSession';

describe('swipe hint session gate', () => {
  beforeEach(() => {
    __resetHomeActiveTaskSwipeHintForTests();
  });

  it('allows the home active swipe hint once per JS session', () => {
    expect(canShowHomeActiveTaskSwipeHint()).toBe(true);
    expect(consumeHomeActiveTaskSwipeHint()).toBe(true);
    expect(canShowHomeActiveTaskSwipeHint()).toBe(false);
  });

  it('blocks repeated consumption attempts after the first playback starts', () => {
    expect(consumeHomeActiveTaskSwipeHint()).toBe(true);
    expect(consumeHomeActiveTaskSwipeHint()).toBe(false);
    expect(canShowHomeActiveTaskSwipeHint()).toBe(false);
  });
});
