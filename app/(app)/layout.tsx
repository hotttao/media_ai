import { AppShell } from '@/components/layout/AppShell'
import { DailyPublishPlanProvider } from '@/components/daily-publish-plan/DailyPublishPlanProvider'
import { DailyPublishPlanFloating } from '@/components/daily-publish-plan/DailyPublishPlanFloating'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DailyPublishPlanProvider>
      <AppShell>{children}</AppShell>
      <DailyPublishPlanFloating />
    </DailyPublishPlanProvider>
  )
}
