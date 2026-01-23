import { createClient } from '@/lib/supabase/client'

export interface SubTeam {
    id: string
    org_id: string
    name: string
    description?: string | null
    created_at: string
}

export const SubTeamService = {
    // Fetch Sub-Teams for a given Organization
    async getSubTeams(orgId: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('sub_teams')
            .select('*')
            .eq('org_id', orgId)
            .order('name')

        if (error) {
            console.error('Error fetching sub-teams:', error)
            return []
        }
        return data as SubTeam[]
    },

    // Create a new Sub-Team (Squad)
    async createSubTeam(orgId: string, name: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('sub_teams')
            .insert({ org_id: orgId, name })
            .select()
            .single()

        if (error) {
            console.error('CRITICAL: Failed to create sub-team', {
                orgId,
                name,
                error: {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                }
            })
            throw error
        }
        return data as SubTeam
    },

    // Join a Sub-Team (Add user to squad)
    async joinSubTeam(subTeamId: string, userId: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('sub_team_members')
            .insert({ sub_team_id: subTeamId, user_id: userId })

        if (error) throw error
    },

    // Update Sub-Team details
    async updateSubTeam(id: string, updates: Partial<Pick<SubTeam, 'name' | 'description'>>) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('sub_teams')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as SubTeam
    },

    // Delete a Sub-Team
    async deleteSubTeam(id: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from('sub_teams')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}
