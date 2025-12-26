import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Ship Quest Legacy - Regression Suite', () => {

    // Generate random credentials for isolation
    const randomId = Math.random().toString(36).substring(7);
    const TEST_EMAIL = `test_${randomId}@example.com`;
    const TEST_PASSWORD = 'password123';

    test.beforeEach(async ({ page }) => {
        // Register/Login before each test (or share state if optimized, but keeping simple for now)
        // We try to Sign Up. If it fails (user exists), we would Log In. 
        // But with random email, Sign Up should work.
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button:has-text("Sign up")');

        // Wait for navigation to Dashboard
        // If Signup requires email verification, this will timeout or fail redirect
        // We assume for "Quest Board" flow it works or we check for error
        await page.waitForURL(`${BASE_URL}/quest-board`, { timeout: 10000 }).catch(() => {
            console.log('Signup redirect matched or failed, checking URL...');
        });
    });

    // 1. Authentication Check
    test('Critical Path: Login & Dashboard Access', async ({ page }) => {
        // Already in dashboard from beforeEach or just checking verify
        // If beforeEach succeeded, we are at /quest-board or /
        // Let's verify we are NOT at /login
        await expect(page).not.toHaveURL(/.*login/);

        // Verify Sidebar Presence
        await expect(page.locator('aside')).toBeVisible();
        await expect(page.getByText('Ship Quest')).toBeVisible();
    });

    // 2. Quest Board & Gamification
    test('Feature: Quest Board & Gamification', async ({ page }) => {
        // We are authenticated
        await page.goto(`${BASE_URL}/quest-board`);

        // Verify Boss Bar Exists (Assuming default state might show "No Quest" or similar if db empty)
        // We just check for major layout elements
        await expect(page.getByText('QUEST BOARD')).toBeVisible();
        await expect(page.getByPlaceholder('Search tasks...')).toBeVisible();

        // Test Assignee Filter (Check if dropdown works)
        const assigneeSelect = page.locator('button[role="combobox"]').nth(0);
        await expect(assigneeSelect).toBeVisible();
    });

    // 3. Navigation Check
    test('Navigation: System Pages', async ({ page }) => {
        // Reporting Page
        await page.goto(`${BASE_URL}/admin/reporting`);
        await expect(page).toHaveURL(`${BASE_URL}/admin/reporting`);
        await expect(page.getByText('Mission Report').or(page.getByText('Reporting'))).toBeVisible();

        // Analytics Page
        await page.goto(`${BASE_URL}/admin/analytics`);
        await expect(page).toHaveURL(`${BASE_URL}/admin/analytics`);
        // Ideally check content, but "Weekly Production" might rely on data
        await expect(page.locator('h1')).toBeVisible();
    });

});
