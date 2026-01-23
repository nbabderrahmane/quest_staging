import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Ship Quest Legacy - Regression Suite', () => {

    // Read credentials from environment variables (see .env.example)
    const TEST_EMAIL = process.env.TEST_USER_EMAIL || '';
    const USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';

    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="password"]', USER_PASSWORD);

        // Wait for and click the Sign In button (assuming "Sign in" text based on standard UI)
        await page.click('button:has-text("Sign in")');

        // Wait for navigation to Dashboard
        await page.waitForURL(`${BASE_URL}/quest-board`, { timeout: 15000 }).catch(() => {
            console.log('Login redirect timed out, checking URL...');
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
        // Use more specific locator for sidebar logo
        await expect(page.locator('aside').getByRole('img', { name: 'Quest' })).toBeVisible();
    });

    // 2. Quest Board & Gamification
    test('Feature: Quest Board & Gamification', async ({ page }) => {
        // We are authenticated
        await page.goto(`${BASE_URL}/quest-board`);

        // Verify Boss Bar Exists (Assuming default state might show "No Quest" or similar if db empty)
        // We just check for major layout elements using strict headings
        await expect(page.getByRole('heading', { name: 'Quest Board' })).toBeVisible();
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
        // Handle "Mission Report" or "Reporting"
        await expect(page.getByRole('heading').filter({ hasText: /Mission Report|Reporting/ })).toBeVisible();

        // Analytics Page
        await page.goto(`${BASE_URL}/admin/analytics`);
        await expect(page).toHaveURL(`${BASE_URL}/admin/analytics`);
        // Ideally check content, but "Weekly Production" might rely on data
        await expect(page.locator('h1')).toBeVisible();
    });

    // 4. Task Lifecycle
    test('Critical Path: Create & Abandon Task', async ({ page }) => {
        await page.goto(`${BASE_URL}/admin/pipeline`);

        // 1. Create Task
        await page.click('button:has-text("Create New Task")');
        const taskTitle = `Test Task ${Math.random().toString(36).substring(7)}`;

        // Wait for modal/drawer
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Fill details
        await dialog.getByPlaceholder('Enter task objective...').fill(taskTitle);

        // Submit (Click the Create New Task button INSIDE the dialog)
        await dialog.getByRole('button', { name: 'Create New Task' }).click();

        // 2. Verify Creation
        await expect(page.getByText(taskTitle)).toBeVisible();

        // 3. Open Detail & Abandon
        await page.getByText(taskTitle).first().click();

        // Wait for drawer content (e.g. "Mission Parameters" or "Mission Control")
        await expect(page.getByText(/Mission Parameters|Mission Control/i)).toBeVisible();

        // Setup Dialog Handler for Confirm
        page.once('dialog', async (d) => {
            if (d.type() === 'confirm') {
                await d.accept();
            } else {
                await d.dismiss();
            }
        });

        // Click Abort Mission
        const abortBtn = page.getByRole('button', { name: /Abort Mission/i });
        await abortBtn.click();

        // 4. Verify Task is Dropped (marked as Aborted)
        // The UI should show "Mission Aborted" badge or similar
        await expect(page.getByText(/Mission Aborted|Dropped/i)).toBeVisible({ timeout: 10000 });

        // Close drawer if it's still open
        const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
        }
    });

    // 5. Admin Modules (Crew & Quests)
    test('Admin Modules: Crew & Quests', async ({ page }) => {
        // Crew Page
        await page.goto(`${BASE_URL}/admin/crew`);
        await expect(page).toHaveURL(`${BASE_URL}/admin/crew`);
        // Check for key headers - if these load, the initial data fetch (Result<T>) worked
        await expect(page.getByRole('heading').filter({ hasText: 'Crew Deck' })).toBeVisible();
        await expect(page.getByText('Active Crew')).toBeVisible();

        // Quests Page
        await page.goto(`${BASE_URL}/admin/quests`);
        await expect(page).toHaveURL(`${BASE_URL}/admin/quests`);
        // Check for headers
        await expect(page.getByRole('heading').filter({ hasText: 'Quest Objectives' })).toBeVisible(); // Assuming "Mission Control" or "Active Operations"
        // Wait for data to load
        // "Active Operations" is usually a section header
        await expect(page.getByText('Objectives Registry')).toBeVisible();
    });

});
