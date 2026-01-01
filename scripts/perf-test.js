#!/usr/bin/env node
/**
 * Ship Quest Performance Tracker
 * 
 * Run: node scripts/perf-test.js [base_url]
 * Example: node scripts/perf-test.js http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000'

const ROUTES = [
    { path: '/', name: 'Home (Redirect)' },
    { path: '/login', name: 'Login Page' },
    { path: '/portal/login', name: 'Portal Login' },
    { path: '/select-dashboard', name: 'Select Dashboard' },
    { path: '/quest-board', name: 'Quest Board (Auth Required)' },
    { path: '/portal/dashboard', name: 'Portal Dashboard (Auth Required)' },
    { path: '/admin', name: 'Admin Forge' },
    { path: '/admin/quests', name: 'Quest Factory' },
    { path: '/admin/pipeline', name: 'Mission Pipeline' },
    { path: '/admin/clients', name: 'Clients List' },
    { path: '/admin/analytics', name: 'Analytics' },
]

async function measureRoute(path, name) {
    const url = `${BASE_URL}${path}`
    const start = performance.now()

    try {
        const response = await fetch(url, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'ShipQuest-PerfTest/1.0'
            }
        })
        const end = performance.now()
        const duration = Math.round(end - start)
        const status = response.status
        const finalUrl = response.url
        const wasRedirected = finalUrl !== url

        return {
            name,
            path,
            duration,
            status,
            wasRedirected,
            finalUrl: wasRedirected ? finalUrl.replace(BASE_URL, '') : null
        }
    } catch (error) {
        return {
            name,
            path,
            duration: -1,
            status: 'ERROR',
            error: error.message
        }
    }
}

function formatDuration(ms) {
    if (ms < 0) return 'ERROR'
    if (ms < 100) return `\x1b[32m${ms}ms\x1b[0m` // Green
    if (ms < 300) return `\x1b[33m${ms}ms\x1b[0m` // Yellow
    return `\x1b[31m${ms}ms\x1b[0m` // Red (slow)
}

async function runTest() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗')
    console.log('║          SHIP QUEST // PERFORMANCE DIAGNOSTIC                  ║')
    console.log('╚════════════════════════════════════════════════════════════════╝\n')
    console.log(`Target: ${BASE_URL}`)
    console.log(`Date: ${new Date().toISOString()}\n`)

    console.log('─'.repeat(70))
    console.log(`${'Route'.padEnd(30)} ${'Time'.padEnd(12)} ${'Status'.padEnd(8)} Redirect`)
    console.log('─'.repeat(70))

    const results = []

    for (const route of ROUTES) {
        const result = await measureRoute(route.path, route.name)
        results.push(result)

        const timeStr = result.duration < 0 ? 'ERROR' : `${result.duration}ms`
        const redirectInfo = result.wasRedirected ? `→ ${result.finalUrl}` : ''

        console.log(
            `${result.name.padEnd(30)} ${formatDuration(result.duration).padEnd(20)} ${String(result.status).padEnd(8)} ${redirectInfo}`
        )
    }

    console.log('─'.repeat(70))

    // Summary
    const successfulResults = results.filter(r => r.duration > 0)
    const avgTime = successfulResults.length > 0
        ? Math.round(successfulResults.reduce((a, b) => a + b.duration, 0) / successfulResults.length)
        : 0
    const slowest = successfulResults.reduce((a, b) => a.duration > b.duration ? a : b, { duration: 0 })
    const fastest = successfulResults.reduce((a, b) => a.duration < b.duration ? a : b, { duration: Infinity })

    console.log('\n📊 SUMMARY')
    console.log(`   Average Response: ${avgTime}ms`)
    console.log(`   Fastest: ${fastest.name} (${fastest.duration}ms)`)
    console.log(`   Slowest: ${slowest.name} (${slowest.duration}ms)`)
    console.log(`   Errors: ${results.filter(r => r.duration < 0).length}/${results.length}`)

    // Performance Grade
    let grade = 'A'
    if (avgTime > 500) grade = 'B'
    if (avgTime > 1000) grade = 'C'
    if (avgTime > 2000) grade = 'D'
    if (avgTime > 3000) grade = 'F'

    console.log(`\n🏆 GRADE: ${grade}\n`)

    // Plain text report for copy-paste
    console.log('\n--- COPY-PASTE REPORT ---')
    console.log(`Performance Test @ ${new Date().toISOString()}`)
    console.log(`Base: ${BASE_URL}`)
    results.forEach(r => {
        console.log(`${r.path}: ${r.duration}ms (${r.status})${r.wasRedirected ? ` → ${r.finalUrl}` : ''}`)
    })
    console.log(`Avg: ${avgTime}ms | Grade: ${grade}`)
    console.log('--- END REPORT ---\n')
}

runTest().catch(console.error)
