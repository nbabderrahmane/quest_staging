import { createClient } from '@/lib/supabase/server'
import { ApiKeyGenerator } from '@/components/dashboard/api-key-generator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, Terminal } from 'lucide-react'

export default async function DeveloperSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Unauthorized</div>

    // Fetch existing keys
    const { data: keys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black uppercase tracking-tighter">Developer Settings</h1>
                <p className="text-muted-foreground">Manage your Personal Access Tokens for automation and API access.</p>
            </div>

            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Terminal className="h-5 w-5" />
                        Automation & MCP
                    </CardTitle>
                    <CardDescription className="text-blue-700">
                        Use these keys to connect 3rd party tools like N8N, Zapier, or AI Agents (via MCP).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-blue-800">
                        <strong>Endpoint:</strong> <code className="bg-white px-1 py-0.5 rounded border border-blue-200">POST /api/v1/tasks</code>
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-white border border-blue-200 rounded text-xs text-muted-foreground">
                        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p>
                            Treat these keys like your password. They grant full access to your account via the API.
                            Never share them in public repositories.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Access Tokens</CardTitle>
                    <CardDescription>Generate and manage your API keys.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ApiKeyGenerator existingKeys={keys || []} />
                </CardContent>
            </Card>
        </div>
    )
}
