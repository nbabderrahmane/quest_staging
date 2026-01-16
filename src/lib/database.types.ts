export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            teams: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    created_at?: string
                }
                Relationships: []
            }
            team_members: {
                Row: {
                    id: string
                    team_id: string
                    user_id: string
                    role: 'owner' | 'admin' | 'manager' | 'analyst' | 'member'
                    joined_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    user_id: string
                    role: 'owner' | 'admin' | 'manager' | 'analyst' | 'member'
                    joined_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    user_id?: string
                    role?: 'owner' | 'admin' | 'manager' | 'analyst' | 'member'
                    joined_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "team_members_team_id_fkey"
                        columns: ["team_id"]
                        referencedRelation: "teams"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "team_members_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    id: string
                    email: string
                    first_name: string | null
                    last_name: string | null
                    avatar_url: string | null
                }
                Insert: {
                    id: string
                    email: string
                    first_name?: string | null
                    last_name?: string | null
                    avatar_url?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    first_name?: string | null
                    last_name?: string | null
                    avatar_url?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            tasks: {
                Row: {
                    id: string
                    team_id: string
                    quest_id: string | null
                    title: string
                    description: string | null
                    status_id: string
                    size_id: string | null
                    urgency_id: string | null
                    assigned_to: string | null
                    client_id: string | null
                    project_id: string | null
                    department_id: string | null
                    xp_points: number
                    was_dropped: boolean
                    needs_info: boolean
                    created_at: string
                    updated_at: string
                    created_by: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    quest_id?: string | null
                    title: string
                    description?: string | null
                    status_id: string
                    size_id?: string | null
                    urgency_id?: string | null
                    assigned_to?: string | null
                    client_id?: string | null
                    project_id?: string | null
                    department_id?: string | null
                    xp_points?: number
                    was_dropped?: boolean
                    needs_info?: boolean
                    created_at?: string
                    updated_at?: string
                    created_by: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    quest_id?: string | null
                    title?: string
                    description?: string | null
                    status_id?: string
                    size_id?: string | null
                    urgency_id?: string | null
                    assigned_to?: string | null
                    client_id?: string | null
                    project_id?: string | null
                    department_id?: string | null
                    xp_points?: number
                    was_dropped?: boolean
                    needs_info?: boolean
                    created_at?: string
                    updated_at?: string
                    created_by?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "tasks_team_id_fkey"
                        columns: ["team_id"]
                        referencedRelation: "teams"
                        referencedColumns: ["id"]
                    }
                ]
            }
            quests: {
                Row: {
                    id: string
                    team_id: string
                    name: string
                    description: string | null
                    start_date: string | null
                    end_date: string | null
                    is_active: boolean
                    is_archived: boolean
                    created_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    name: string
                    description?: string | null
                    start_date?: string | null
                    end_date?: string | null
                    is_active?: boolean
                    is_archived?: boolean
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    name?: string
                    description?: string | null
                    start_date?: string | null
                    end_date?: string | null
                    is_active?: boolean
                    is_archived?: boolean
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            api_keys: {
                Row: {
                    id: string
                    user_id: string
                    key_hash: string
                    label: string
                    last_used_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    key_hash: string
                    label: string
                    last_used_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    key_hash?: string
                    label?: string
                    last_used_at?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "api_keys_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            clients: {
                Row: {
                    id: string
                    team_id: string
                    name: string
                    logo_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    name: string
                    logo_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    name?: string
                    logo_url?: string | null
                    created_at?: string
                }
                Relationships: []
            }
            task_comments: {
                Row: {
                    id: string
                    team_id: string
                    task_id: string
                    author_id: string
                    content: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    task_id: string
                    author_id: string
                    content: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    task_id?: string
                    author_id?: string
                    content?: string
                    created_at?: string
                }
                Relationships: []
            }
            projects: {
                Row: {
                    id: string
                    team_id: string
                    name: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    name: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    name?: string
                }
                Relationships: []
            }
            departments: {
                Row: {
                    id: string
                    team_id: string
                    name: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    name: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    name?: string
                }
                Relationships: []
            }
            statuses: {
                Row: {
                    id: string
                    team_id: string
                    name: string
                    category: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    name: string
                    category: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    name?: string
                    category?: string
                    created_at?: string
                }
                Relationships: []
            }
            sizes: {
                Row: {
                    id: string
                    team_id: string
                    name: string
                    xp_points: number
                    sort_order: number
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    name: string
                    xp_points?: number
                    sort_order?: number
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    name?: string
                    xp_points?: number
                    sort_order?: number
                    is_active?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            urgencies: {
                Row: {
                    id: string
                    team_id: string
                    name: string
                    weight: number
                    color: string
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    name: string
                    weight?: number
                    color?: string
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    name?: string
                    weight?: number
                    color?: string
                    is_active?: boolean
                    created_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_: string]: {
                Row: {
                    [key: string]: unknown
                }
            }
        }
        Functions: {
            [_: string]: {
                Args: {
                    [key: string]: unknown
                }
                Returns: unknown
            }
        }
        Enums: {
            [_: string]: unknown
        }
        CompositeTypes: {
            [_: string]: {
                [_: string]: unknown
            }
        }
    }
}
