let homeActiveTaskSwipeHintShown = false;

export function canShowHomeActiveTaskSwipeHint(): boolean {
  return !homeActiveTaskSwipeHintShown;
}

export function consumeHomeActiveTaskSwipeHint(): boolean {
  if (homeActiveTaskSwipeHintShown) {
    return false;
  }

  homeActiveTaskSwipeHintShown = true;
  return true;
}

export function __resetHomeActiveTaskSwipeHintForTests(): void {
  homeActiveTaskSwipeHintShown = false;
}
