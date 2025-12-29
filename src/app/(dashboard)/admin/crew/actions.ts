'use server'

import { createClient } from '@/lib/supabase/server'
import { getRoleContext } from '@/lib/role-service'
import { revalidatePath } from 'next/cache'

// RPG-themed error formatter for crew operations
function formatCrewError(code: string, message: string): string {
    if (code === '23505') return 'DUPLICATE DETECTED: This operative already exists in the alliance.'
    if (code === '42501' || message.includes('policy')) return 'SECURITY BREACH: Your clearance level is insufficient.'
    if (code === '23503') return 'INTEGRITY FAILURE: Referenced alliance does not exist.'
    return `SYSTEM ERROR [${code}]: ${message}`
}

// Get all crew members for a team with profile data (ADMIN BYPASS - no RLS)
export async function getCrewMembers(teamId: string): Promise<any[] | { error: string }> {
    // Use Admin API to bypass RLS completely
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Step 1: Fetch team members (no join - 100% reliable)
    const { data: members, error: memberError } = await supabaseAdmin
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })

    console.log('DEBUG getCrewMembers members:', {
        teamId,
        membersCount: members?.length || 0,
        error: memberError?.message
    })

    if (memberError) {
        console.error('getCrewMembers: Failed to fetch members', memberError)
        return { error: `[${memberError.code}] ${memberError.message}` }
    }

    if (!members || members.length === 0) {
        return []
    }

    // Step 2: Fetch profiles for all user_ids (separate query)
    const userIds = members.map(m => m.user_id)
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds)

    console.log('DEBUG getCrewMembers profiles:', {
        userIds,
        profilesCount: profiles?.length || 0,
        error: profileError?.message
    })

    // Create a map for quick lookup
    const profileMap = new Map<string, any>()
    if (profiles) {
        profiles.forEach(p => profileMap.set(p.id, p))
    }

    // Step 3: Merge members with their profiles
    const enrichedMembers = members.map(member => ({
        ...member,
        profiles: profileMap.get(member.user_id) || null
    }))

    return enrichedMembers
}

// Invite new crew member - Owner/Admin only
export async function inviteCrewMember(
    teamId: string,
    email: string,
    role: string,
    password: string,
    profileData?: { firstName?: string; lastName?: string; telephone?: string }
) {
    // Direct DB role check (bypassing getRoleContext for stability)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'SECURITY BREACH: User not authenticated.' }
    }

    // Validate password
    if (!password || password.length < 6) {
        return { success: false, error: 'PROTOCOL VIOLATION: Password must be at least 6 characters.' }
    }

    const { data: membership, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

    console.log('DEBUG inviteCrewMember:', { teamId, userId: user.id, membership, memberError })

    // Owner ALWAYS has access, no conditions
    const userRole = membership?.role
    if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
        return { success: false, error: `SECURITY BREACH: Only commanders can recruit. Your role: ${userRole || 'NONE'}` }
    }

    // Validate role (member removed per request)
    const validRoles = ['admin', 'manager', 'analyst']
    if (!validRoles.includes(role)) {
        return { success: false, error: 'PROTOCOL VIOLATION: Invalid rank designation.' }
    }

    // Use Admin API to find or create user by email
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email === email)

    let userId: string

    if (existingUser) {
        userId = existingUser.id
    } else {
        // Create new user with the password provided by the commander
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: password,  // Use commander-provided password
            email_confirm: true
        })

        if (createError || !newUser.user) {
            console.error('inviteCrewMember: User creation failed', createError)
            return { success: false, error: `RECRUITMENT FAILED: ${createError?.message || 'Unable to create user'}` }
        }
        userId = newUser.user.id

        // TODO: Trigger Welcome Email with credentials
        // The email system is currently offline. Credentials must be shared manually.
    }

    // Upsert profile data (firstName, lastName, telephone)
    if (profileData) {
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                first_name: profileData.firstName || null,
                last_name: profileData.lastName || null,
                telephone: profileData.telephone || null
            }, { onConflict: 'id' })

        if (profileError) {
            console.error('inviteCrewMember: Profile upsert failed', profileError)
            // Continue anyway - profile data is optional
        }
    }

    // Add to team_members (UUID injection)
    const { error: insertError } = await supabaseAdmin
        .from('team_members')
        .insert({
            team_id: teamId,
            user_id: userId,
            role: role
        })

    if (insertError) {
        return { success: false, error: formatCrewError(insertError.code, insertError.message) }
    }

    revalidatePath('/admin/crew')
    return { success: true }
}

// Update crew member (role change + telephone) - Owner/Admin only
export async function updateCrewMember(
    memberId: string,
    teamId: string,
    data: { role?: string; telephone?: string }
) {
    const ctx = await getRoleContext(teamId)

    if (!ctx || !ctx.canManageForge) {
        return { success: false, error: 'SECURITY BREACH: Only commanders (Owner/Admin) can modify crew records.' }
    }

    // Bypass RLS with Admin Client
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Prevent changing an owner's role
    const { data: targetMember } = await supabaseAdmin
        .from('team_members')
        .select('role, user_id')
        .eq('team_id', teamId)
        .eq('user_id', memberId)
        .single()

    if (targetMember?.role === 'owner') {
        return { success: false, error: 'PROTOCOL VIOLATION: The Owner\'s rank cannot be altered.' }
    }

    // Prevent self-demotion for safety
    if (targetMember?.user_id === ctx.userId && data.role && data.role !== ctx.role) {
        return { success: false, error: 'PROTOCOL VIOLATION: You cannot alter your own rank.' }
    }

    // Update role if provided
    if (data.role) {
        const { error } = await supabaseAdmin
            .from('team_members')
            .update({ role: data.role })
            .eq('team_id', teamId)
            .eq('user_id', memberId)

        if (error) {
            return { success: false, error: formatCrewError(error.code, error.message) }
        }
    }

    // Update telephone in profiles if provided
    if (data.telephone !== undefined) {
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ telephone: data.telephone || null })
            .eq('id', memberId)

        if (profileError) {
            console.error('updateCrewMember: Profile update failed', profileError)
            // Continue anyway - profile update is optional
        }
    }

    revalidatePath('/admin/crew')
    return { success: true }
}

// Toggle crew member active status - Owner/Admin only
export async function toggleCrewActive(
    userId: string,
    teamId: string,
    currentActive: boolean
) {
    const ctx = await getRoleContext(teamId)

    if (!ctx || !ctx.canManageForge) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can toggle crew status.' }
    }

    // Bypass RLS with Admin Client
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Prevent toggling owner
    const { data: targetMember } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single()

    if (targetMember?.role === 'owner') {
        return { success: false, error: 'PROTOCOL VIOLATION: The Owner cannot be deactivated.' }
    }

    // Prevent self-deactivation
    if (userId === ctx.userId) {
        return { success: false, error: 'PROTOCOL VIOLATION: You cannot deactivate yourself.' }
    }

    // Note: team_members table may not have is_active column yet
    // If it doesn't exist, this will fail gracefully or we should catch specific error
    const { error } = await supabaseAdmin
        .from('team_members')
        .update({ is_active: !currentActive })
        .eq('team_id', teamId)
        .eq('user_id', userId)

    if (error) {
        return { success: false, error: formatCrewError(error.code, error.message) }
    }

    revalidatePath('/admin/crew')
    return { success: true }
}

// Remove crew member from team - Owner/Admin only
export async function removeCrewMember(userId: string, teamId: string) {
    console.log(`[Crew] removeCrewMember requested for User ${userId} in Team ${teamId}`)

    const ctx = await getRoleContext(teamId)
    console.log(`[Crew] Context role:`, ctx?.role)

    if (!ctx || !ctx.canManageForge) {
        return { success: false, error: 'SECURITY BREACH: Only commanders can remove crew members.' }
    }

    // Bypass RLS with Admin Client
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Prevent removing owner
    const { data: targetMember, error: fetchError } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single()

    console.log(`[Crew] Target member fetch:`, { targetMember, error: fetchError })

    if (fetchError || !targetMember) {
        return { success: false, error: 'TARGET LOST: Operative not found in this alliance.' }
    }

    if (targetMember?.role === 'owner') {
        return { success: false, error: 'PROTOCOL VIOLATION: The Owner cannot be removed from the alliance.' }
    }

    // Prevent self-removal
    if (userId === ctx.userId) {
        return { success: false, error: 'PROTOCOL VIOLATION: You cannot remove yourself from the alliance.' }
    }

    const { error, count } = await supabaseAdmin
        .from('team_members')
        .delete({ count: 'exact' })
        .eq('team_id', teamId)
        .eq('user_id', userId)

    console.log(`[Crew] Delete result:`, { count, error })

    if (error) {
        return { success: false, error: formatCrewError(error.code, error.message) }
    }

    if (count === 0) {
        return { success: false, error: 'DELETION ERROR: Operation completed but no record was removed.' }
    }

    revalidatePath('/admin/crew')
    return { success: true }
}

// Reset crew member password - Owner only (requires Supabase Admin API)
export async function resetCrewPassword(userId: string, teamId: string, newPassword: string) {
    const ctx = await getRoleContext(teamId)

    // Only owner can reset passwords
    if (!ctx || !ctx.isOwner) {
        return { success: false, error: 'SECURITY BREACH: Only the Alliance Owner can reset passwords.' }
    }

    // Use Supabase Admin API with service_role key
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Prevent resetting owner's password by non-self
    const { data: targetMember } = await supabaseAdmin
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single()

    if (targetMember?.role === 'owner' && userId !== ctx.userId) {
        return { success: false, error: 'SECURITY BREACH: You cannot reset the Owner\'s password.' }
    }

    // Validate password
    if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'PROTOCOL VIOLATION: Password must be at least 6 characters.' }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
    })

    if (error) {
        console.error('resetCrewPassword: Admin API failed', error)
        return { success: false, error: `PASSWORD RESET FAILED: ${error.message}` }
    }

    return { success: true }
}

// Get memberships for a specific user within valid teams (intersected with admin's managed teams)
export async function getUserMemberships(targetUserId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Not authenticated' }

    // 1. Get teams managed by current admin
    const { data: myMemberships } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])

    if (!myMemberships || myMemberships.length === 0) return { success: false, error: 'No managed teams found' }

    const managedTeamIds = myMemberships.map(m => m.team_id)

    // 2. Get target user's memberships filtered by managed teams
    const { data: targetMemberships } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', targetUserId)
        .in('team_id', managedTeamIds)

    return { success: true, memberships: targetMemberships || [] }
}

// Update multiple team memberships for a user
export async function updateUserTeams(
    targetUserId: string,
    targetTeamIds: string[],
    role: string,
    telephone?: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Not authenticated' }

    // 1. Validate Admin Context
    // Ensure current admin is actually admin/owner of ALL targetTeamIds
    // AND all teams being removed (we need to fetch current state first)

    // Fetch Admin's roles
    const { data: myMemberships } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])

    if (!myMemberships) return { success: false, error: 'Permission denied' }

    // Map of Admin's role per team
    const myRoleByTeam = new Map(myMemberships.map(m => [m.team_id, m.role]))

    // Verify Admin manages all requested target teams
    const invalidTeams = targetTeamIds.filter(id => !myRoleByTeam.has(id))
    if (invalidTeams.length > 0) {
        return { success: false, error: 'SECURITY BREACH: You cannot assign users to teams you do not command.' }
    }

    // 2. Determine Changes
    // Fetch current memberships of target user in ALL teams managed by Admin (to detect removals)
    const managedTeamIds = Array.from(myRoleByTeam.keys())

    const { data: currentMemberships } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', targetUserId)
        .in('team_id', managedTeamIds)

    const currentTeamIds = (currentMemberships || []).map(m => m.team_id)

    const toAdd = targetTeamIds.filter(id => !currentTeamIds.includes(id))
    const toRemove = currentTeamIds.filter(id => !targetTeamIds.includes(id))
    const toUpdate = targetTeamIds.filter(id => currentTeamIds.includes(id))

    // 3. Execute Updates
    // A. Additions
    if (toAdd.length > 0) {
        const payload = toAdd.map(tid => ({
            team_id: tid,
            user_id: targetUserId,
            role: role
        }))
        const { error: addError } = await supabase.from('team_members').insert(payload)
        if (addError) return { success: false, error: `Error adding to teams: ${addError.message}` }
    }

    // B. Removals
    if (toRemove.length > 0) {
        const { error: remError } = await supabase
            .from('team_members')
            .delete()
            .eq('user_id', targetUserId)
            .in('team_id', toRemove)

        if (remError) return { success: false, error: `Error removing from teams: ${remError.message}` }
    }

    // C. Updates (Role Change)
    if (toUpdate.length > 0) {
        const { error: upError } = await supabase
            .from('team_members')
            .update({ role: role })
            .eq('user_id', targetUserId)
            .in('team_id', toUpdate)

        if (upError) return { success: false, error: `Error updating roles: ${upError.message}` }
    }

    // 4. Update Profile (Telephone) if provided
    if (telephone !== undefined) {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )
        await supabaseAdmin.from('profiles').update({ telephone }).eq('id', targetUserId)
    }

    revalidatePath('/admin/crew')
    return { success: true }
}

