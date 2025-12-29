'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { revalidatePath } from 'next/cache'

// Get all projects for a team
export async function getProjects(teamId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('team_id', teamId)
        .order('name', { ascending: true })

    if (error) {
        console.error('getProjects: Failed', error)
        return []
    }
    return data || []
}

// Create a new project
export async function createProject(teamId: string, name: string, description?: string) {
    const ctx = await getRoleContext(teamId)
    // Manager+ only
    if (!ctx || !['owner', 'admin', 'manager'].includes(ctx.role || '')) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can launch projects.' }
    }

    if (!name || !name.trim()) return { success: false, error: 'Project name is required.' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('projects')
        .insert({
            team_id: teamId,
            name: name.trim(),
            description: description?.trim() || null
        })

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/projects')
    revalidatePath('/admin/pipeline')
    return { success: true }
}

// Delete a project
export async function deleteProject(projectId: string, teamId: string) {
    const ctx = await getRoleContext(teamId)
    // Manager+ only
    if (!ctx || !['owner', 'admin', 'manager'].includes(ctx.role || '')) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can terminate projects.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('team_id', teamId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/projects')
    revalidatePath('/admin/pipeline')
    return { success: true }
}

// Get single project (RLS Protected, ID only)
export async function getProject(projectId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

    if (error) {
        console.error('getProject failed:', error)
        return null
    }
    return data
}

// Get tasks for a project with details
export async function getProjectTasks(projectId: string, teamId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('tasks')
        .select(`
            id, title, description,
            status_id, size_id, urgency_id, quest_id, assigned_to,
            status:statuses!status_id(id, name, category),
            size:sizes!size_id(id, name, xp_points),
            urgency:urgencies!urgency_id(id, name, color),
            quest:quests!quest_id(id, name),
            assignee:profiles!assigned_to(first_name, last_name, email)
        `)
        .eq('project_id', projectId)
        .eq('team_id', teamId)
        .is('was_dropped', false) // Exclude dropped tasks

    if (error) {
        console.error('getProjectTasks Error:', error)
        return []
    }
    return data || []
}

export async function updateTaskStatus(teamId: string, taskId: string, statusId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('tasks')
        .update({ status_id: statusId, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('team_id', teamId)

    if (error) throw error
    revalidatePath('/admin/projects/[id]', 'page')
}
