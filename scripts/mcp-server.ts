#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'

// 1. Env Helper
const loadEnv = (filename: string) => {
    try {
        const envPath = path.resolve(__dirname, '..', filename)
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8')
            content.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/)
                if (match) {
                    const key = match[1].trim()
                    const value = match[2].trim().replace(/^["']|["']$/g, '')
                    if (!process.env[key]) process.env[key] = value
                }
            })
        }
    } catch (e) { }
}
loadEnv('.env.local')
loadEnv('.env')

const API_KEY = process.env.MCP_API_KEY || process.env.NEXT_PUBLIC_MCP_API_KEY
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// 2. Logging
function log(msg: string) {
    console.error(`[MCP] ${msg}`)
}

if (!API_KEY) {
    log('Warning: MCP_API_KEY not set. Tools might fail if not provided in request.')
}

// 3. Tool Definitions
const TOOLS = [
    {
        name: 'list_tasks',
        description: 'List tasks from the Ship Quest board. Filterable by status.',
        inputSchema: {
            type: 'object',
            properties: {
                status: { type: 'string', description: 'Filter by status name (e.g. "todo", "backlog")' },
                limit: { type: 'number', description: 'Max number of tasks to return (default 50)' },
                team_id: { type: 'string', description: 'Team ID to filter by (optional)' }
            }
        }
    },
    {
        name: 'create_task',
        description: 'Create a new task on the board.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title of the task' },
                description: { type: 'string', description: 'Detailed description' },
                team_id: { type: 'string', description: 'Team ID (optional, defaults to primary)' }
            },
            required: ['title']
        }
    },
    {
        name: 'update_task',
        description: 'Update a task status, title, or assignee.',
        inputSchema: {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'The UUID of the task' },
                status: { type: 'string', description: 'New status name (e.g. "Done")' },
                title: { type: 'string' },
                description: { type: 'string' }
            },
            required: ['taskId']
        }
    },
    {
        name: 'add_comment',
        description: 'Add a comment to a task.',
        inputSchema: {
            type: 'object',
            properties: {
                taskId: { type: 'string', description: 'The UUID of the task' },
                content: { type: 'string', description: 'Comment content' }
            },
            required: ['taskId', 'content']
        }
    }
]

// 4. API Helpers
async function callApi(method: string, endpoint: string, body?: any) {
    const headers: any = {
        'Content-Type': 'application/json'
    }
    if (API_KEY) headers['x-api-key'] = API_KEY

    const url = `${API_URL}/api/v1${endpoint}`
    log(`Calling ${method} ${url}`)

    try {
        const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
        const text = await res.text()
        try {
            return JSON.parse(text)
        } catch {
            return { error: 'Invalid JSON response', raw: text }
        }
    } catch (e: any) {
        return { error: e.message }
    }
}

// 5. Connection Loop (JSON-RPC 2.0 over Stdio)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

rl.on('line', async (line) => {
    try {
        const msg = JSON.parse(line)
        if (!msg.jsonrpc) return // Ignore non-JSONRPC

        // Handlers
        if (msg.method === 'initialize') {
            sendResponse(msg.id, {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: { name: 'ship-quest-mcp', version: '1.0.0' }
            })
        } else if (msg.method === 'notifications/initialized') {
            // No response needed
        } else if (msg.method === 'tools/list') {
            sendResponse(msg.id, { tools: TOOLS })
        } else if (msg.method === 'tools/call') {
            const { name, arguments: args } = msg.params
            const result = await handleToolCall(name, args)
            sendResponse(msg.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
        } else {
            // Unknown method
            // We generally just ignore or error, but let's be nice
        }
    } catch (e) {
        log('Error processing line: ' + e)
    }
})

function sendResponse(id: any, result: any) {
    const response = {
        jsonrpc: '2.0',
        id,
        result
    }
    console.log(JSON.stringify(response))
}

async function handleToolCall(name: string, args: any) {
    if (name === 'list_tasks') {
        const qs = new URLSearchParams()
        if (args.status) qs.set('status', args.status)
        if (args.limit) qs.set('limit', args.limit.toString())
        if (args.team_id) qs.set('team_id', args.team_id)

        return await callApi('GET', `/tasks?${qs.toString()}`)
    }
    if (name === 'create_task') {
        return await callApi('POST', '/tasks', args)
    }
    if (name === 'update_task') {
        const { taskId, ...updates } = args
        return await callApi('PATCH', `/tasks/${taskId}`, updates)
    }
    if (name === 'add_comment') {
        const { taskId, content } = args
        return await callApi('POST', `/tasks/${taskId}/comments`, { content })
    }
    return { error: `Unknown tool: ${name}` }
}

log('MCP Server Started. Waiting for input...')
