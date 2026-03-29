export function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}
