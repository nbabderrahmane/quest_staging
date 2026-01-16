
import { getUserClient } from '@/lib/supabase/factory'
import { Result } from '@/lib/result'
import { Database } from '@/lib/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

export class QuestService {
    /**
     * Validates that the proposed time range does not overlap with existing scheduled quests in the team.
     * Enforces: "No overlapping scheduled quests in same team".
     * 
     * @param teamId 
     * @param startDate ISO string
     * @param endDate ISO string | null (null means open-ended/forever)
     * @param excludeQuestId (optional) ID to exclude from check (for updates)
     */
    static async validateOverlap(
        teamId: string,
        startDate: string,
        endDate: string | null,
        excludeQuestId?: string
    ): Promise<Result<void>> {
        const supabase = await getUserClient() as SupabaseClient<Database>

        const start = new Date(startDate)
        const end = endDate ? new Date(endDate) : null // null means Infinity

        // Let's implement robust in-memory check for simplicity and correctness with nullable fields.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: quests, error } = await (supabase.from('quests') as any)
            .select('id, name, start_date, end_date')
            .eq('team_id', teamId)
            // Only check active/scheduled quests.
            // If user restores an archived quest, we should re-validate.
            .is('is_archived', false)

        if (error) {
            return {
                success: false,
                error: { code: 'DB_ERROR', message: 'Failed to validate schedule availability.', details: error }
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const overlappingQuest = (quests as any[]).find(q => {
            if (excludeQuestId && q.id === excludeQuestId) return false

            const qStart = new Date(q.start_date)
            // const qEnd = q.end_date ? new Date(q.end_date) : null

            // Overlap Check Logic:
            // (StartA <= EndB) and (EndA >= StartB)

            // New Request = A
            // Existing Quest = B or Q

            // A.Start <= B.End ?
            // If B.End is null (Infinity), A.Start <= Infinity is TRUE.
            // If B.End is set, A.Start must be <= B.End.
            const qEndValue = q.end_date ? new Date(q.end_date).getTime() : Infinity
            const startLoeEnd = start.getTime() <= qEndValue

            // A.End >= B.Start ?
            // If A.End is null (Infinity), Infinity >= B.Start is TRUE.
            // If A.End is set, A.End must be >= B.Start.
            const endAValue = end ? end.getTime() : Infinity
            const endGoeStart = endAValue >= qStart.getTime()

            return startLoeEnd && endGoeStart
        })

        if (overlappingQuest) {
            return {
                success: false,
                error: {
                    code: 'CONFLICT',
                    message: `Schedule overlaps with existing quest: "${overlappingQuest.name}".`
                }
            }
        }

        return { success: true, data: undefined }
    }

    /**
     * Checks all quests in the team and updates `is_active` based on the current date.
     * - If start_date <= NOW <= end_date: Set is_active = TRUE
     * - If NOW > end_date: Set is_active = FALSE (Recall) (AND if currently Active)
     * - If NOW < start_date: Set is_active = FALSE (Wait) (AND if currently Active)
     * - Ignores archived quests.
     */
    static async processScheduledDeployments(teamId: string): Promise<void> {
        const supabase = await getUserClient() as SupabaseClient<Database>

        // Fetch all candidates (non-archived)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: quests } = await (supabase.from('quests') as any)
            .select('id, is_active, start_date, end_date')
            .eq('team_id', teamId)
            .is('is_archived', false)

        if (!quests) return

        const now = new Date().getTime()
        const updates: Promise<any>[] = []

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const q of (quests as any[])) {
            const start = new Date(q.start_date).getTime()
            // If end_date is null, it never ends (Infinity)
            const end = q.end_date ? new Date(q.end_date).getTime() : Infinity

            const shouldBeActive = (now >= start && now <= end)

            // Detect state mismatch
            if (shouldBeActive && !q.is_active) {
                // Deploy
                console.log(`[QuestService] Auto-deploying quest ${q.id}`)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                updates.push((supabase.from('quests') as any).update({ is_active: true }).eq('id', q.id))
            } else if (!shouldBeActive && q.is_active) {
                // Recall or Pre-flight Wait
                console.log(`[QuestService] Auto-recalling/holding quest ${q.id}`)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                updates.push((supabase.from('quests') as any).update({ is_active: false }).eq('id', q.id))
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates)
        }
    }
}
