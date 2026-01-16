'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { getRoleContext } from '@/lib/role-service'
import { getUserClient } from '@/lib/supabase/factory'
import { runAction } from '@/lib/safe-action'
import { Result } from '@/lib/result'

export async function exportAnalyticsToCSV(
    teamId: string,
    startDate: string,
    endDate: string
): Promise<Result<{ csv: string; filename: string }>> {
    return runAction('exportAnalyticsToCSV', async () => {
        const ctx = await getRoleContext(teamId)
        if (!ctx) {
            return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized access.' } }
        }

        const supabase = await getUserClient()
        noStore()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = (supabase.from('tasks') as any)
            .select(`
                id,
                title,
                description,
                updated_at,
                status:statuses!status_id(name, category),
                size:sizes!size_id(xp_points),
                urgency:urgencies!urgency_id(name),
                quest:quests!quest_id(name),
                department:departments!department_id(name),
                client:clients!client_id(name),
                assigned_to
            `)
            .eq('team_id', teamId)
            .gte('updated_at', startDate)
            .lte('updated_at', endDate + 'T23:59:59.999Z')

        const { data: tasks, error } = await query

        if (error) {
            return { success: false, error: { code: 'DB_ERROR', message: `Database Error: ${error.message}` } }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasksToExport = (tasks || []) as any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assigneeIds = [...new Set(tasksToExport.map((t: any) => t.assigned_to).filter(Boolean))]

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileMap = new Map<string, any>()
        if (assigneeIds.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profiles, error: profError } = await (supabase.from('profiles') as any)
                .select('id, first_name, last_name, email')
                .in('id', assigneeIds)

            if (!profError && profiles) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                profiles.forEach((p: any) => {
                    profileMap.set(String(p.id).toLowerCase().trim(), p)
                })
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const csvRows = tasksToExport.map((t: any) => {
            const assigneeId = String(t.assigned_to).toLowerCase().trim()
            const assignee = profileMap.get(assigneeId)
            const assigneeName = assignee
                ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email
                : 'Unassigned'

            const date = new Date(t.updated_at).toLocaleDateString()
            const taskName = t.title.replace(/"/g, '""')
            const description = (t.description || '').replace(/"/g, '""')
            const statusName = t.status?.name || 'Unknown'
            const questName = t.quest?.name || 'No Quest'
            const departmentName = t.department?.name || ''
            const clientName = t.client?.name || ''
            const xp = t.size?.xp_points || 0
            const urgency = t.urgency?.name || 'Standard'

            return `"${date}","${taskName}","${description}","${statusName}","${departmentName}","${clientName}","${assigneeName}","${questName}",${xp},"${urgency}"`
        })

        const header = '"Date","Task Name","Description","Status","Department","Client","Operative Name","Quest","XP Points","Urgency"'
        const csvContent = [header, ...csvRows].join('\n')

        return {
            success: true,
            data: {
                csv: csvContent,
                filename: `mission-report-${startDate}-${endDate}.csv`
            }
        }
    })
}
