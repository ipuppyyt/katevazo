/** Every http(s) link in a piece of text, in order and without repeats. */
export function extractLinks(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)) {
    // Punctuation that clings to a pasted link is not part of it.
    const candidate = match[0].replace(/[.,;:!?)\]}]+$/, "");
    try {
      found.add(new URL(candidate).toString());
    } catch {
      // Not a link after all.
    }
  }
  return [...found];
}
