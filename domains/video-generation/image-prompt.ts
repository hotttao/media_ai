export function buildGeneratedImagePrompt(...parts: Array<string | null | undefined>) {
  const normalized = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  if (normalized.length === 0) {
    return null
  }

  return normalized.join(', ')
}
