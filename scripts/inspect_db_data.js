
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
    console.log('--- INSPECTING DATABASE STATE ---\n');

    // 1. Fetch Clients (Max)
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, name, company_name, team_id')
        .ilike('name', '%Max%');

    if (clientError) console.error('Error fetching clients:', clientError);
    console.log('1. Clients found (matching "Max"):');
    console.table(clients);

    if (!clients || clients.length === 0) {
        console.log('No client "Max" found. Exiting.');
        return;
    }

    const clientId = clients[0].id;
    const teamId = clients[0].team_id;

    // 2. Fetch Departments for this Team
    const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name, team_id')
        .eq('team_id', teamId);

    if (deptError) console.error('Error fetching departments:', deptError);
    console.log('\n2. Departments found for Team ' + teamId + ':');
    console.table(departments);

    // 3. Fetch Links in client_departments
    const { data: links, error: linkError } = await supabase
        .from('client_departments')
        .select('client_id, department_id, created_at')
        .eq('client_id', clientId);

    if (linkError) console.error('Error fetching links:', linkError);
    console.log('\n3. Links in client_departments for Client ' + clientId + ':');
    console.table(links);

    // 4. Verify Mapping
    console.log('\n--- VERIFICATION ---');
    if (links && links.length > 0) {
        links.forEach(link => {
            const dept = departments.find(d => d.id === link.department_id);
            const client = clients.find(c => c.id === link.client_id);
            if (dept && client) {
                console.log(`✅ MATCH: Client "${client.name}" is linked to Department "${dept.name}"`);
            } else {
                console.log(`❌ MISMATCH: Link exists for Dept ID ${link.department_id} but department details not found in this team context.`);
            }
        });
    } else {
        console.log('⚠️ No departments linked to this client.');
    }
}

inspectData();
