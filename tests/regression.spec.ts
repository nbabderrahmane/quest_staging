import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Ship Quest Legacy - Regression Suite', () => {

    // 1. Authentication Check
    test('Critical Path: Login & Dashboard Access', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);

        // Fill credentials (assuming seeded test account from TESTING.md)
        await page.fill('input[name="email"]', 'admin@ship.quest');
        await page.fill('input[name="password"]', 'shipquest123');
        await page.click('button:has-text("Sign in")');

        // Expect redirect to dashboard
        await expect(page).toHaveURL(`${BASE_URL}/quest-board`);

        // Verify Sidebar Presence
        await expect(page.locator('aside')).toBeVisible();
        await expect(page.getByText('Ship Quest')).toBeVisible();
    });

    // 2. Quest Board & Gamification
    test('Feature: Quest Board & Gamification', async ({ page }) => {
        // Authenticate First
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', 'admin@ship.quest');
        await page.fill('input[name="password"]', 'shipquest123');
        await page.click('button:has-text("Sign in")');
        await page.waitForURL(`${BASE_URL}/quest-board`);

        // Verify Boss Bar Exists (if active quest exists)
        // Note: This relies on seeded data having an active quest. 
        // We check for the container presence generally or specific text if known.
        await expect(page.locator('h3', { hasText: 'Active Operation' }).first()).toBeVisible();

        // Verify Quest Board Columns
        await expect(page.getByText('BACKLOG')).toBeVisible();
        await expect(page.getByText('DONE')).toBeVisible();

        // Verify Filter UI
        await expect(page.getByText('PROTOCOL:')).toBeVisible();
        await expect(page.getByPlaceholder('Search tasks...')).toBeVisible();

        // Test Assignee Filter (Check if dropdown works)
        const assigneeSelect = page.locator('button[role="combobox"]').nth(0); // Assuming first select is assignee or using specific locator
        await expect(assigneeSelect).toBeVisible();
    });

    // 3. Navigation Check
    test('Navigation: System Pages', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', 'admin@ship.quest');
        await page.fill('input[name="password"]', 'shipquest123');
        await page.click('button:has-text("Sign in")');
        await page.waitForURL(`${BASE_URL}/quest-board`);

        // Reporting Page
        await page.click('a[href="/admin/reporting"]');
        await expect(page).toHaveURL(`${BASE_URL}/admin/reporting`);
        await expect(page.getByText('Mission Report')).toBeVisible();

        // Analytics Page
        await page.click('a[href="/admin/analytics"]');
        await expect(page).toHaveURL(`${BASE_URL}/admin/analytics`);
        await expect(page.getByText('Weekly Production')).toBeVisible();
    });

});
