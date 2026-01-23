import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    // Optional: Add a shared secret check here (e.g. Bearer token)
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 })
    // }

    const supabase = createAdminClient()

    // 1. Fetch Due Tasks
    const { data: dueTasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_recurring', true)
        .lte('recurrence_next_date', new Date().toISOString())

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!dueTasks || dueTasks.length === 0) {
        return NextResponse.json({ message: 'No recurring tasks due' })
    }

    const results = []

    for (const task of dueTasks) {
        try {
            // 2. Parse Rule & Calculate Next Date
            const rule = task.recurrence_rule as any // { frequency, interval, days, start_date }
            if (!rule) continue

            // Current target date for the NEW task is the recurrence_next_date (which is today or past)
            // But wait, if we are late running cron, recurrence_next_date might be 2 days ago. 
            // The task should be created for THAT date? Or Today? 
            // User says "la récurrence se base sur la date de debut".
            // Let's assume we create it for the intended date.

            const intendedDate = new Date(task.recurrence_next_date)

            // Calculate the NEXT trigger date (to update the parent)
            const nextTriggerDate = new Date(intendedDate)
            const interval = rule.interval || 1

            if (rule.frequency === 'daily') {
                nextTriggerDate.setDate(nextTriggerDate.getDate() + interval)
            } else if (rule.frequency === 'weekly') {
                nextTriggerDate.setDate(nextTriggerDate.getDate() + (interval * 7))
            } else if (rule.frequency === 'monthly') {
                nextTriggerDate.setMonth(nextTriggerDate.getMonth() + interval)
            }

            // Check End Date
            if (task.recurrence_end_date && new Date(task.recurrence_end_date) < nextTriggerDate) {
                // Stop recurrence
                await supabase.from('tasks').update({ is_recurring: false }).eq('id', task.id)
                results.push({ id: task.id, status: 'ended' })
                continue
            }

            // 3. Find Target Quest (Sprint)
            // Logic: Find active quest where intendedDate falls within start/end
            // Fallback: Currently active quest
            const { data: textDateQuest } = await supabase
                .from('quests')
                .select('id')
                .eq('team_id', task.team_id)
                .lte('start_date', intendedDate.toISOString())
                .gte('end_date', intendedDate.toISOString())
                .limit(1)
                .maybeSingle()

            let targetQuestId = textDateQuest?.id

            if (!targetQuestId) {
                // Fallback: Get any active quest
                const { data: activeQuest } = await supabase
                    .from('quests')
                    .select('id')
                    .eq('team_id', task.team_id)
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle()

                targetQuestId = activeQuest?.id
            }

            // Extreme Fallback: Existing Quest ID (even if closed, better than error)
            if (!targetQuestId) targetQuestId = task.quest_id

            // 4. Find Backlog Status
            const { data: backlogStatus } = await supabase
                .from('statuses')
                .select('id')
                .eq('team_id', task.team_id)
                .eq('category', 'backlog')
                .limit(1)
                .maybeSingle()

            const targetStatusId = backlogStatus?.id || task.status_id

            // 5. Create Child Task
            const { error: insertError } = await supabase.from('tasks').insert({
                team_id: task.team_id,
                quest_id: targetQuestId,
                title: task.title, // Duplicate title
                description: task.description,
                size_id: task.size_id,
                urgency_id: task.urgency_id,
                xp_points: task.xp_points,
                status_id: targetStatusId,
                parent_recurrence_id: task.id,
                is_recurring: false, // Child is NOT recurring
                // assignee? "elle garde les memes caratéritiques" -> yes copy assignee
                assignee_id: task.assignee_id,
                client_id: task.client_id
            })

            if (insertError) {
                console.error(`Failed to clone task ${task.id}`, insertError)
                results.push({ id: task.id, status: 'failed_insert', error: insertError.message })
                continue
            }

            // 6. Update Parent Logic
            await supabase.from('tasks').update({
                recurrence_next_date: nextTriggerDate.toISOString()
            }).eq('id', task.id)

            results.push({ id: task.id, status: 'processed', next_date: nextTriggerDate })

        } catch (e: any) {
            console.error(`Error processing task ${task.id}`, e)
            results.push({ id: task.id, status: 'error', error: e.message })
        }
    }

    return NextResponse.json({ processed: results.length, details: results })
}
