
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCategories() {
    const { data, error } = await supabase
        .from('statuses')
        .select('name, category')
        .order('category')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Statuses in DB:', data)
}

checkCategories()
