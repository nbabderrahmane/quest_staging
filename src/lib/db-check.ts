import { createClient } from '@/lib/supabase/server'

export async function checkDbConnection() {
    const supabase = await createClient()
    try {
        const { data, error } = await supabase.from('teams').select('*').limit(1)
        if (error) {
            console.error('Supabase DB Error:', error)
            return { success: false, error }
        }
        console.log('Supabase DB Success:', data)
        return { success: true, data }
    } catch (e) {
        console.error('Connection Exception:', e)
        return { success: false, error: e }
    }
}
