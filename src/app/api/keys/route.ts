import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json() as { label?: string }
        const label = body.label || 'My API Key'

        // 1. Generate Secure Key (prefix + 32 bytes hex)
        const rawKey = 'sk_quest_' + crypto.randomBytes(32).toString('hex')

        // 2. Hash it (SHA-256)
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

        // 3. Store in DB
        const supabaseAdmin = createAdminClient()
        const { data: record, error } = await supabaseAdmin
            .from('api_keys')
            .insert({
                user_id: user.id,
                label,
                key_hash: keyHash
            })
            .select()
            .single()

        if (error) {
            console.error('API Key Insert Error:', error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        // 4. Return Raw Key (ONCE)
        return NextResponse.json({
            success: true,
            key: rawKey,
            record: {
                id: record?.id,
                label: record?.label,
                created_at: record?.created_at,
                last_used_at: null
            }
        })

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('API Key creation error:', errorMessage)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 })

        const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
