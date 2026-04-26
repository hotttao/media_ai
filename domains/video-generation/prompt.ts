export function normalizeVideoPrompt(prompt?: string | null) {
  return prompt?.trim() ?? ''
}
