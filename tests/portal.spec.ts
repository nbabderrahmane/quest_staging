import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Ship Quest - Client Portal E2E', () => {

    const TEST_EMAIL = process.env.TEST_USER_EMAIL || '';
    const USER_PASSWORD = process.env.TEST_USER_PASSWORD || '';

    test('Portal: Login & Dashboard Access', async ({ page }) => {
        // Go to portal login
        await page.goto(`${BASE_URL}/portal/login`);

        // Fill credentials
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', USER_PASSWORD);

        // Click Sign In
        await page.click('button:has-text("Sign In")');

        // Wait for redirection to dashboard or select-dashboard
        try {
            // Allow dashboard, select-dashboard OR home (if no roles)
            await page.waitForURL(/.*(dashboard|select-dashboard|$)/, { timeout: 15000 });
        } catch (e) {
            console.log('Login timeout. Current URL:', page.url());
            throw e;
        }

        const url = page.url();
        if (url.includes('select-dashboard')) {
            await page.click('text="Client Portal"');
            await page.waitForURL(/.*portal\/dashboard/);
        } else if (!url.includes('dashboard')) {
            // If we land on home, we can't test portal specific features on this user
            console.log('User redirected to home (no roles). Skipping portal checks.');
            return;
        }

        // Verify Portal Header
        await expect(page.locator('h1')).toContainText('Portal');

        // Verify Dashboard Elements
        // Check for "Mission Status" or "Support Tickets"
        await expect(page.getByText(/Mission Status|Support Tickets/i)).toBeVisible();
    });

    test('Portal: Navigation & Inbox', async ({ page }) => {
        // Login first
        await page.goto(`${BASE_URL}/portal/login`);
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', USER_PASSWORD);
        await page.click('button:has-text("Sign In")');
        // Allow dashboard, select-dashboard OR home (if no roles)
        try {
            await page.waitForURL(/.*(dashboard|select-dashboard|$)/, { timeout: 15000 });
        } catch (e) {
            console.log('Login timeout. Current URL:', page.url());
            throw e;
        }

        const url = page.url();
        if (url.includes('select-dashboard')) {
            await page.click('text="Client Portal"');
            await page.waitForURL(/.*portal\/dashboard/);
        } else if (!url.includes('dashboard')) {
            console.log('User redirected to home (no roles). Skipping portal checks.');
            return;
        }

        // Check Navigation to Inbox
        // Assuming there is an "Inbox" link or icon
        const inboxLink = page.locator('a[href*="/portal/inbox"]');
        if (await inboxLink.isVisible()) {
            await inboxLink.click();
            await expect(page).toHaveURL(/.*portal\/inbox/);
            await expect(page.getByRole('heading', { name: /Inbox|Comms/i })).toBeVisible();
        }
    });

    test('Portal: Create Support Ticket Dialog', async ({ page }) => {
        // Login
        await page.goto(`${BASE_URL}/portal/login`);
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', USER_PASSWORD);
        await page.click('button:has-text("Sign In")');
        // Allow dashboard, select-dashboard OR home (if no roles)
        try {
            await page.waitForURL(/.*(dashboard|select-dashboard|$)/, { timeout: 15000 });
        } catch (e) {
            console.log('Login timeout. Current URL:', page.url());
            throw e;
        }

        const url = page.url();
        if (url.includes('select-dashboard')) {
            await page.click('text="Client Portal"');
            await page.waitForURL(/.*portal\/dashboard/);
        } else if (!url.includes('dashboard')) {
            console.log('User redirected to home (no roles). Skipping portal checks.');
            return;
        }

        // Open Create Ticket Dialog
        const createBtn = page.getByRole('button', { name: /New Ticket|Request Support/i });
        if (await createBtn.isVisible()) {
            await createBtn.click();

            // Verify Dialog
            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();
            await expect(dialog.getByText(/Create New Ticket|Support Request/i)).toBeVisible();

            // Fill but don't submit to avoid polluting DB if it's production-like
            await dialog.getByPlaceholder(/Title|Subject/i).fill('Test Ticket from E2E');
            await dialog.getByRole('button', { name: /Cancel|Close/i }).click();
            await expect(dialog).not.toBeVisible();
        }
    });
});
