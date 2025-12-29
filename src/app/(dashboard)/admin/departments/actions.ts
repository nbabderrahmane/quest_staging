'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { revalidatePath } from 'next/cache'

// Get all departments for a team
export async function getDepartments(teamId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('team_id', teamId)
        .order('name', { ascending: true })

    if (error) {
        console.error('getDepartments: Failed', error)
        return []
    }
    return data || []
}

// Create a new department
export async function createDepartment(teamId: string, name: string) {
    const ctx = await getRoleContext(teamId)
    // Manager+ only
    if (!ctx || !['owner', 'admin', 'manager'].includes(ctx.role || '')) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can establish departments.' }
    }

    if (!name || !name.trim()) return { success: false, error: 'Department name is required.' }

    const supabase = await createClient()
    const { error } = await supabase
        .from('departments')
        .insert({
            team_id: teamId,
            name: name.trim()
        })

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin/pipeline')
    return { success: true }
}

// Delete a department
export async function deleteDepartment(departmentId: string, teamId: string) {
    const ctx = await getRoleContext(teamId)
    // Manager+ only
    if (!ctx || !['owner', 'admin', 'manager'].includes(ctx.role || '')) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can dissolve departments.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', departmentId)
        .eq('team_id', teamId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin/pipeline')
    return { success: true }
}

// Get single department (RLS Protected, ID only)
export async function getDepartment(departmentId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single()

    if (error) {
        console.error('getDepartment failed:', error)
        return null
    }
    return data
}

// Get tasks for a department with details
export async function getDepartmentTasks(departmentId: string, teamId: string) {
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
        .eq('department_id', departmentId)
        .eq('team_id', teamId)
        .is('was_dropped', false)

    if (error) {
        console.error('getDepartmentTasks Error:', error)
        return []
    }
    return data || []
}

export async function updateTaskStatus(taskId: string, statusId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('tasks')
        .update({ status_id: statusId, updated_at: new Date().toISOString() })
        .eq('id', taskId)

    if (error) throw error
    revalidatePath('/admin/departments/[id]', 'page')
}
