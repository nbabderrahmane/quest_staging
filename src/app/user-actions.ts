'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserProfile(data: { phone?: string, password?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Update Password
    if (data.password) {
        const { error } = await supabase.auth.updateUser({
            password: data.password
        })
        if (error) {
            return { success: false, error: `Password update failed: ${error.message}` }
        }
    }

    // Update Phone
    if (data.phone !== undefined) {
        // Update in profiles table (display purpose)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ phone: data.phone })
            .eq('id', user.id)

        if (profileError) {
            console.error('Profile phone update failed:', profileError)
            return { success: false, error: `Profile update failed: ${profileError.message}` }
        }

        // Optionally update Auth user phone (might require verification)
        // We skip this to avoid triggering SMS verification flows which might lock the user out if not configured.
        // await supabase.auth.updateUser({ phone: data.phone })
    }

    revalidatePath('/')
    return { success: true }
}
