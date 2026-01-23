import { getUserClient } from '@/lib/supabase/factory'
import { Result } from '@/lib/result'
import { Database } from '@/lib/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

export interface CreateTaskDTO {
    title: string
    description?: string | null
    quest_id?: string | null
    size_id?: string | null
    urgency_id?: string | null
    assigned_to?: string | null
    project_id?: string | null
    department_id?: string | null
    client_id?: string | null
    // Recurrence
    is_recurring?: boolean
    recurrence_rule?: Database['public']['Tables']['tasks']['Row']['recurrence_rule']
    recurrence_next_date?: string | Date
    recurrence_end_date?: string | Date
    deadline_at?: string | null
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {
    status_id?: string
    was_dropped?: boolean
    needs_info?: boolean
}

export class TaskService {
    /**
     * Creates a new task in the pipeline.
     * Enforces: Title required, Backlog status assignment.
     */
    static async create(
        teamId: string,
        userId: string,
        data: CreateTaskDTO
    ): Promise<Result<{ task: Database['public']['Tables']['tasks']['Row']; questName: string | null }>> {
        if (!data.title?.trim()) {
            return {
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: "Task title is required."
                }
            }
        }

        const supabase = await getUserClient() as SupabaseClient<Database, 'public'>

        // 1. Get Backlog Status (Auto-assignment)

        const { data: backlogStatus, error: statusError } = await supabase
            .from('statuses')
            .select('id')
            .eq('team_id', teamId)
            .eq('category', 'backlog')
            .order('created_at', { ascending: true })
            .limit(1)
            .single()

        if (statusError || !backlogStatus) {
            return {
                success: false,
                error: {
                    code: 'CONFLICT',
                    message: "No 'Backlog' status found. Please configure the Forge first.",
                    details: statusError
                }
            }
        }

        // 2. Auto-assignment Logic
        let finalAssigneeId = data.assigned_to || null

        if (!finalAssigneeId) {
            // Check Project Mapping
            if (data.project_id) {
                const { data: project } = await supabase.from('projects')
                    .select('default_analyst_id')
                    .eq('id', data.project_id)
                    .single()
                    .throwOnError()
                    .returns<any>()
                if ((project as any)?.default_analyst_id) {
                    finalAssigneeId = (project as any).default_analyst_id
                }
            }



            // Check Department Mapping
            if (!finalAssigneeId && data.department_id) {
                const { data: dept } = await supabase.from('departments')
                    .select('default_analyst_id')
                    .eq('id', data.department_id)
                    .single()
                    .returns<any>()
                if ((dept as any)?.default_analyst_id) {
                    finalAssigneeId = (dept as any).default_analyst_id
                }
            }
        }

        // 3. Get Quest Name (if applicable)
        let questName: string | null = null
        if (data.quest_id) {

            const { data: quest } = await supabase
                .from('quests')
                .select('name')
                .eq('id', data.quest_id)
                .single()
            questName = (quest as any)?.name || null
        }

        // 3. Insert Task

        const { data: newTask, error: insertError } = await (supabase.from('tasks') as any)
            .insert({
                team_id: teamId,
                created_by: userId,
                title: data.title.trim(),
                description: data.description?.trim() || null,
                quest_id: data.quest_id || null,
                status_id: (backlogStatus as any).id,
                size_id: data.size_id || null,
                urgency_id: data.urgency_id || null,
                assigned_to: finalAssigneeId,
                project_id: data.project_id || null,
                department_id: data.department_id || null,
                client_id: data.client_id || null,
                is_recurring: data.is_recurring || false,
                recurrence_rule: data.recurrence_rule || null,
                recurrence_next_date: data.recurrence_next_date ? new Date(data.recurrence_next_date).toISOString() : null,
                recurrence_end_date: data.recurrence_end_date ? new Date(data.recurrence_end_date).toISOString() : null,
                deadline_at: data.deadline_at || null
            })
            .select() // Return the created object
            .single()

        if (insertError) {
            return {
                success: false,
                error: {
                    code: 'DB_ERROR',
                    message: "Failed to create task.",
                    details: insertError
                }
            }
        }

        return {
            success: true,
            data: { task: newTask, questName }
        }
    }

    /**
     * Updates an existing task.
     */
    static async update(
        teamId: string,
        taskId: string,
        data: UpdateTaskDTO
    ): Promise<Result<null>> {
        const supabase = await getUserClient() as SupabaseClient<Database, 'public'>

        // Clean payload (remove undefined)
        const updatePayload: Database['public']['Tables']['tasks']['Update'] = {
            ...data,
            recurrence_next_date: data.recurrence_next_date ? new Date(data.recurrence_next_date).toISOString() : undefined,
            recurrence_end_date: data.recurrence_end_date ? new Date(data.recurrence_end_date).toISOString() : undefined,
            updated_at: new Date().toISOString()
        }


        const { error } = await (supabase.from('tasks') as any)
            .update(updatePayload)
            .eq('id', taskId)
            .eq('team_id', teamId)

        if (error) {
            return {
                success: false,
                error: {
                    code: 'DB_ERROR',
                    message: "Failed to update task.",
                    details: error
                }
            }
        }

        return { success: true, data: null }
    }

    /**
     * Delete a task.
     */
    static async delete(teamId: string, taskId: string): Promise<Result<null>> {
        const supabase = await getUserClient() as SupabaseClient<Database, 'public'>


        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('team_id', teamId)

        if (error) {
            return {
                success: false,
                error: {
                    code: 'DB_ERROR',
                    message: "Failed to delete task.",
                    details: error
                }
            }
        }

        return { success: true, data: null }
    }
}
