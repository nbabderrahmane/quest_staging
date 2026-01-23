'use server'

import { getRoleContext } from '@/lib/role-service'
import { getUserClient } from '@/lib/supabase/factory'
import { runAction } from '@/lib/safe-action'
import { revalidatePath } from 'next/cache'
import { Result } from '@/lib/result'

import { QuestService } from '@/services/quest-service'

export async function getQuestObjectives(
    teamId: string,
    showArchived: boolean = false
): Promise<Result<any[]>> {
    return runAction('getQuestObjectives', async () => {
        const supabase = await getUserClient()

        // Lazy-eval: Auto-deploy/recall based on schedule (Only if user has permission to update)
        // We check role context briefly to avoid RLS errors on update
        const ctx = await getRoleContext(teamId)
        if (ctx && ['owner', 'admin', 'manager'].includes(ctx.role || '')) {
            await QuestService.processScheduledDeployments(teamId)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase.from('quests') as any)
            .select(`
                *,
                creator:profiles!created_by(id, email, first_name, last_name),
                sub_team:sub_teams!sub_team_id(id, name),
                tasks (
                    id,
                    title,
                    status:statuses!status_id(category, name),
                    assigned_to,
                    assignee:profiles!assigned_to(first_name, last_name, email)
                )
            `)
            .eq('team_id', teamId)
            .order('start_date', { ascending: false, nullsFirst: false })

        if (showArchived) {
            query = query.eq('is_archived', true)
        } else {
            query = query.is('is_archived', false)
        }

        const { data, error } = await query

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: error.message, details: error } }
        }

        return { success: true, data: data || [] }
    })
}

export async function createQuestObjective(
    teamId: string,
    data: {
        name: string
        description?: string
        boss_skin?: string
        start_date?: string
        end_date?: string
        sub_team_id?: string
    }
): Promise<Result<void>> {
    return runAction('createQuestObjective', async () => {
        const supabase = await getUserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated.' } }
        }

        const ctx = await getRoleContext(teamId)
        if (!ctx || !ctx.canManageForge) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Only commanders (Owner/Admin) can initiate quests.' } }
        }

        if (!data.name || data.name.trim().length === 0) {
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Quest name is required.' } }
        }

        // Validate Schedule Overlap
        if (data.start_date) {
            const overlapCheck = await QuestService.validateOverlap(teamId, data.start_date, data.end_date || null)
            if (!overlapCheck.success) {
                return overlapCheck
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('quests') as any)
            .insert({
                team_id: teamId,
                name: data.name,
                description: data.description,
                boss_skin: data.boss_skin || 'generic_monster',
                start_date: data.start_date || new Date().toISOString(),
                end_date: data.end_date,
                sub_team_id: data.sub_team_id,
                created_by: user.id
            })

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: `QUEST INITIATION FAILED: ${error.message}` } }
        }

        revalidatePath('/admin/quests')
        return { success: true, data: undefined }
    })
}

export async function archiveQuest(questId: string, teamId: string): Promise<Result<void>> {
    return runAction('archiveQuest', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx || !ctx.role || !['owner', 'admin', 'manager'].includes(ctx.role)) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Only commanders can archive quests.' } }
        }

        const supabase = await getUserClient()

        // 1. Deactivate
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('quests') as any)
            .update({ is_active: false })
            .eq('id', questId)
            .eq('team_id', teamId)

        // 2. Archive
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('quests') as any)
            .update({ is_archived: true })
            .eq('id', questId)
            .eq('team_id', teamId)

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: `QUEST ARCHIVAL FAILED: ${error.message}` } }
        }

        revalidatePath('/admin/quests')
        return { success: true, data: undefined }
    })
}

export async function unarchiveQuest(questId: string, teamId: string): Promise<Result<void>> {
    return runAction('unarchiveQuest', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx || !ctx.role || !['owner', 'admin', 'manager'].includes(ctx.role)) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Only commanders can unarchive quests.' } }
        }

        const supabase = await getUserClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('quests') as any)
            .update({ is_archived: false })
            .eq('id', questId)
            .eq('team_id', teamId)

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: `QUEST RESTORATION FAILED: ${error.message}` } }
        }

        revalidatePath('/admin/quests')
        return { success: true, data: undefined }
    })
}

export async function toggleQuestActive(
    questId: string,
    teamId: string,
    setActive: boolean
): Promise<Result<void>> {
    return runAction('toggleQuestActive', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx || !ctx.role || !['owner', 'admin', 'manager'].includes(ctx.role)) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Only commanders can deploy quests.' } }
        }

        const supabase = await getUserClient()

        // If activating, deactivate others
        if (setActive) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('quests') as any)
                .update({ is_active: false })
                .eq('team_id', teamId)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('quests') as any)
            .update({ is_active: setActive })
            .eq('id', questId)
            .eq('team_id', teamId)

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: `QUEST DEPLOYMENT FAILED: ${error.message}` } }
        }

        revalidatePath('/admin/quests')
        revalidatePath('/quest-board')
        return { success: true, data: undefined }
    })
}

export async function updateQuestObjective(
    questId: string,
    teamId: string,
    data: Partial<{
        name: string
        description: string
        boss_skin: string
        start_date: string | null
        end_date: string | null
        sub_team_id: string | null
        is_active: boolean
    }>
): Promise<Result<void>> {
    return runAction('updateQuestObjective', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx || !ctx.canManageForge) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Only commanders can modify quests.' } }
        }

        // Validate Schedule Overlap if dates are changing
        if (data.start_date || data.end_date) {
            // We need the full date range to validate unless we fetch the existing one.
            // But validateOverlap takes (start, end).
            // If data contains only one, we might need to fetch the existing record first to get the other.
            // OR the UI always sends both. Assuming UI sends all fields usually for Edit form.
            // If not, we should fetch. safer to fetch.

            const supabase = await getUserClient()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: currentQuest } = await (supabase.from('quests') as any)
                .select('start_date, end_date')
                .eq('id', questId)
                .single()

            const startToCheck = data.start_date ?? currentQuest?.start_date
            const endToCheck = data.end_date !== undefined ? data.end_date : currentQuest?.end_date

            if (startToCheck) {
                const overlapCheck = await QuestService.validateOverlap(teamId, startToCheck, endToCheck, questId)
                if (!overlapCheck.success) {
                    return overlapCheck
                }
            }
        }

        const supabase = await getUserClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('quests') as any)
            .update({
                ...data,
                boss_skin: data.boss_skin || 'generic_monster',
                updated_at: new Date().toISOString()
            })
            .eq('id', questId)
            .eq('team_id', teamId)

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: `QUEST UPDATE FAILED: ${error.message}` } }
        }

        revalidatePath('/admin/quests')
        return { success: true, data: undefined }
    })
}

export async function deleteQuestObjective(questId: string, teamId: string): Promise<Result<void>> {
    return runAction('deleteQuestObjective', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx || !ctx.isOwner) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Only the Owner can abandon quests.' } }
        }

        const supabase = await getUserClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('quests') as any)
            .delete()
            .eq('id', questId)
            .eq('team_id', teamId)

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: `QUEST DELETION FAILED: ${error.message}` } }
        }

        revalidatePath('/admin/quests')
        return { success: true, data: undefined }
    })
}

export async function getActiveQuestProgress(teamId: string): Promise<Result<any>> {
    return runAction('getActiveQuestProgress', async () => {
        const supabase = await getUserClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: quest, error } = await (supabase.from('quests') as any)
            .select(`
                id, 
                name, 
                tasks (
                    id, 
                    status_id,
                    was_dropped,
                    size:sizes!size_id(xp_points),
                    status:statuses!status_id(category)
                )
            `)
            .eq('team_id', teamId)
            .eq('is_active', true)
            .is('is_archived', false)
            .maybeSingle()

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: 'Failed to fetch active quest', details: error } }
        }

        if (!quest) {
            return { success: true, data: null }
        }

        let totalXP = 0
        let currentXP = 0

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quest.tasks?.forEach((t: any) => {
            if (t.was_dropped) return

            const xp = t.size?.xp_points || 0
            totalXP += xp
            if (t.status?.category === 'done') {
                currentXP += xp
            }
        })

        const percentage = totalXP > 0 ? Math.round((currentXP / totalXP) * 100) : 0

        return {
            success: true,
            data: {
                id: quest.id,
                name: quest.name,
                totalXP,
                currentXP,
                percentage
            }
        }
    })
}
