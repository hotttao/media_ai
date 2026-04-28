export function getVideoTabSummary(input: { videos: number; pending: number }) {
  return {
    generatedCount: input.videos,
    pendingCount: input.pending,
  }
}
