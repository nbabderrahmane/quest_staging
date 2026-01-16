import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Ship Quest - Recurrence Feature', () => {

    const TEST_EMAIL = 'johndoe@doe.com';
    const USER_PASSWORD = '159263';

    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="password"]', USER_PASSWORD);
        await page.click('button:has-text("Sign in")');
        await page.waitForURL(`${BASE_URL}/quest-board`, { timeout: 15000 }).catch(() => { });
    });

    test('UI: Recurrence Fields in Create Task Dialog', async ({ page }) => {
        await page.goto(`${BASE_URL}/quest-board`);

        // Open Dialog
        // Adjust locator if needed based on actual UI
        // Try searching for the FAB "New Task" or the column header "Quick Decree" button
        const newBtn = page.getByRole('button', { name: /New Task/i }).first();
        if (await newBtn.isVisible()) {
            await newBtn.click();
        } else {
            // Fallback to the small plus button in Backlog column if FAB is hidden/missing
            await page.click('button[title="Quick Decree"]');
        }

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Check for Recurrence Toggle (Switch)
        // The switch label is "Recurrence"
        await expect(page.getByText('Recurrence', { exact: true })).toBeVisible();

        // Find the switch. It might be near the label.
        const recurrenceSwitch = dialog.locator('button[role="switch"]');
        await expect(recurrenceSwitch).toBeVisible();

        // Toggle it ON
        await recurrenceSwitch.click();

        // Check if Recurrence Options appear
        await expect(page.getByText('Frequency')).toBeVisible();
        await expect(page.getByText('Interval (Every X)')).toBeVisible();
        await expect(page.getByText('Start Date')).toBeVisible();

        // Verify Frequency Options
        const frequencyTrigger = dialog.locator('button[role="combobox"]').filter({ hasText: /daily|weekly|monthly/i }).first();
        // Or if it's the 3rd Select in the form... 
        // We can just try to click the trigger that says "Daily" or "Weekly" (default was weekly)

        // Default is Weekly
        await expect(dialog.getByRole('combobox').filter({ hasText: 'Weekly' })).toBeVisible();

        // Change to Daily
        // Note: Radix Select is tricky in tests sometimes. 
        // We'll skip complex interaction for now, just verify visibility of new fields.

        // Verify Checkboxes for Days (since default is Weekly)
        await expect(dialog.getByText('Mon', { exact: true })).toBeVisible();
        await expect(dialog.getByText('Fri', { exact: true })).toBeVisible();
    });

});
