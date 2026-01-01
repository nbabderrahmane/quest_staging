'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function handleUnifiedLogin(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error || !user) {
        return { success: false, error: 'Invalid login credentials' }
    }

    // Use Admin Client for all role checks (bypasses RLS)
    const supabaseAdmin = createAdminClient()

    // Run ALL checks in parallel for speed
    const [teamMembersRes, clientMembersRes, invitesRes] = await Promise.all([
        supabaseAdmin.from('team_members').select('id').eq('user_id', user.id).limit(1),
        supabaseAdmin.from('client_members').select('id').eq('user_id', user.id).limit(1),
        supabaseAdmin.from('client_invitations').select('*').eq('email', user.email).eq('status', 'pending')
    ])

    const teamMembers = teamMembersRes.data
    const clientMembers = clientMembersRes.data
    const invites = invitesRes.data

    // Auto-accept pending invites (run in background)
    let newClientMember = false
    if (invites && invites.length > 0) {
        for (const invite of invites) {
            await supabaseAdmin
                .from('client_members')
                .insert({ client_id: invite.client_id, user_id: user.id, role: 'member' })

            await supabaseAdmin
                .from('client_invitations')
                .update({ status: 'accepted' })
                .eq('id', invite.id)
        }
        newClientMember = true
    }

    const isStaff = !!(teamMembers && teamMembers.length > 0)
    const isClient = !!(clientMembers && clientMembers.length > 0) || newClientMember

    return {
        success: true,
        isStaff,
        isClient,
        requiresSelection: isStaff && isClient
    }
}



export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/login?error=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    redirect('/')
}
