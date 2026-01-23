import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Ship Quest - Health Check API', () => {

    test('GET /api/health should return ok', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/health`);

        expect(response.ok()).toBe(true);
        expect(response.status()).toBe(200);

        const data = await response.json();

        expect(data.status).toBe('healthy');
        expect(data.checks.database.status).toBe('ok');
        expect(data.timestamp).toBeDefined();
        expect(data.responseTimeMs).toBeDefined();
    });

});
