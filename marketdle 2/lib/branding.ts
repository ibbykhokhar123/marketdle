// Present previously saved results under the current brand without changing saved progress.
export function rebrandShareText(text: string): string {
  return text.replace(/\bBellwether\b/gi, 'Marketdle')
}
