import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function checkDbConnection() {
    const supabase = await createClient()
    try {
        const { data, error } = await supabase.from('teams').select('*').limit(1)
        if (error) {
            logger.error('Supabase DB Error', { error })
            return { success: false, error }
        }
        logger.info('Supabase DB Success', { data })
        return { success: true, data }
    } catch (e) {
        logger.error('Connection Exception', { error: e })
        return { success: false, error: e }
    }
}
