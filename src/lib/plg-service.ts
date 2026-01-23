import { createAdminClient } from '@/lib/supabase/admin'

const PUBLIC_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com'
]

export class PLGService {
    /**
     * Extracts domain from email, checks blacklist, and manages Team Auto-Join.
     * @returns { success: boolean, teamId?: string, isNew: boolean, role: string }
     */
    static async handleAutoJoin(userId: string, email: string) {
        if (!email || !userId) return { success: false, error: 'Missing credentials' }

        const domain = email.split('@')[1]?.toLowerCase()
        if (!domain) return { success: false, error: 'Invalid email' }

        // 1. Blacklist Check
        if (PUBLIC_DOMAINS.includes(domain)) {
            console.log(`[PLG] Domain ${domain} is public. Skipping auto-join.`)
            return { success: false, skipped: true }
        }

        const supabase = createAdminClient()

        // 2. Search for existing Team
        const { data: existingTeam } = await supabase
            .from('teams')
            .select('id, name')
            .eq('domain', domain)
            .single()

        if (existingTeam) {
            console.log(`[PLG] Found existing team for ${domain}: ${existingTeam.name}`)
            // 3a. Join as Member
            const { error } = await supabase.from('team_members').insert({
                team_id: existingTeam.id,
                user_id: userId,
                role: 'member',
                joined_at: new Date().toISOString()
            })

            if (error) {
                // Ignore unique violation (user might already be in team)
                if (error.code !== '23505') {
                    console.error('[PLG] Failed to join team', error)
                    return { success: false, error: error.message }
                }
            }
            return { success: true, teamId: existingTeam.id, isNew: false, role: 'member' }
        }

        // 3b. Create New Team
        console.log(`[PLG] Creating new team for ${domain}`)
        const teamName = domain.split('.')[0].toUpperCase() // acme.com -> ACME

        // Create Team
        const { data: newTeam, error: createError } = await supabase
            .from('teams')
            .insert({
                name: teamName,
                slug: domain.replace(/\./g, '-'), // acme.com -> acme-com
                domain: domain
            })
            .select()
            .single()

        if (createError) {
            console.error('[PLG] Failed to create team', createError)
            return { success: false, error: createError.message }
        }

        // Add Owner
        await supabase.from('team_members').insert({
            team_id: newTeam.id,
            user_id: userId,
            role: 'owner',
            joined_at: new Date().toISOString()
        })

        // Init Default Data (Statuses, etc) via SQL triggers or manual calls if needed
        // Assuming triggers handle basic init, or we rely on '00_init_teams.sql' logic?
        // Note: 04_initialize_team_rpc.sql handles deep init. Ideally call that here.
        try {
            await supabase.rpc('initialize_team', { team_id: newTeam.id })
        } catch (e) {
            console.warn('[PLG] Init RPC failed (non-critical)', e)
        }

        return { success: true, teamId: newTeam.id, isNew: true, role: 'owner' }
    }
}
