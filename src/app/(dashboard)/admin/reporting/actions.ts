'use server'

import { unstable_noStore as noStore } from 'next/cache'
import { getRoleContext } from '@/lib/role-service'

export async function exportAnalyticsToCSV(teamId: string, startDate: string, endDate: string) {
    console.log('📊 Export Start', { teamId, startDate, endDate })

    const ctx = await getRoleContext(teamId)
    if (!ctx) {
        console.error('❌ Export Error: Unauthorized access attempt')
        return { error: 'Unauthorized' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    noStore()

    // Query 1: Fetch Tasks (Done status only)
    let query = supabase
        .from('tasks')
        .select(`
            id,
            title,
            updated_at,
            status:statuses!status_id(category),
            size:sizes!size_id(xp_points),
            urgency:urgencies!urgency_id(name),
            quest:quests!quest_id(name),
            assigned_to
        `)
        .eq('team_id', teamId)
        .gte('updated_at', startDate)
        .lte('updated_at', endDate + 'T23:59:59.999Z') // Include end of day

    const { data: tasks, error } = await query

    if (error) {
        console.error('❌ CSV Error: Task fetch failed', error)
        return { error: `Database Error: ${error.message}` }
    }

    // Use all tasks, no status filter
    const tasksToExport = tasks || []

    console.log(`✅ Tasks Fetched: ${tasksToExport.length} total`)

    // Query 2: Fetch Profiles for Assignees
    const assigneeIds = [...new Set(tasksToExport.map((t: any) => t.assigned_to).filter(Boolean))]

    let profileMap = new Map()
    if (assigneeIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', assigneeIds)

        if (profError) {
            console.error('⚠️ CSV Warning: Profile fetch failed', profError)
        } else {
            profiles?.forEach((p: any) => {
                // Hybrid Normalization
                profileMap.set(String(p.id).toLowerCase().trim(), p)
            })
        }
    }

    // Format Data for CSV
    const csvRows = tasksToExport.map((t: any) => {
        // Resolve Assignee
        const assigneeId = String(t.assigned_to).toLowerCase().trim()
        const assignee = profileMap.get(assigneeId)
        const assigneeName = assignee
            ? `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || assignee.email
            : 'Unknown Operative'

        const date = new Date(t.updated_at).toLocaleDateString()
        const taskName = t.title.replace(/"/g, '""') // Escape quotes
        const statusName = t.status?.category === 'done' ? 'Done' : (t.status?.category === 'active' ? 'Doing' : 'Todo')
        const questName = t.quest?.name || 'No Quest'
        const xp = t.size?.xp_points || 0
        const urgency = t.urgency?.name || 'Standard'

        return `"${date}","${taskName}","${statusName}","${assigneeName}","${questName}",${xp},"${urgency}"`
    })

    const header = '"Date","Task Name","Status","Operative Name","Quest","XP Points","Urgency"'
    const csvContent = [header, ...csvRows].join('\n')

    console.log('✅ Export Success', { count: csvRows.length })

    return { success: true, csv: csvContent, filename: `mission-report-${startDate}-${endDate}.csv` }
}
