import { test, expect } from '@playwright/test';

test.describe('Campaign Details Form (Step 1)', () => {
  test('should fill and submit all mandatory fields & Product Details URL', async ({ page }) => {
    // Navigate to the page
    await page.goto('https://ad-campaign-planner-708214089226.us-west1.run.app/');

    // Wait for the page to fully load and be visible
    await expect(page.locator('h2:has-text("Campaign Details")')).toBeVisible();

    // Wait 3 seconds so user can see the form in headed mode
    await page.waitForTimeout(1000);

    // Fill Campaign Name
    await page.getByRole('textbox', { name: 'Campaign Name' }).click();
    await page.getByRole('textbox', { name: 'Campaign Name' }).fill('Live Fresh Card Signup');
    await page.waitForTimeout(1000);

    // Fill Total Budget
    await page.getByRole('spinbutton', { name: 'Total Budget (S$)' }).click();
    await page.getByRole('spinbutton', { name: 'Total Budget (S$)' }).fill('10000');
    await page.waitForTimeout(1000);

    // Fill Landing Page URL
    await page.getByRole('textbox', { name: 'Landing Page URL' }).click();
    await page.getByRole('textbox', { name: 'Landing Page URL' }).fill('https://www.dbs.com.sg/personal/promotion/cards-dbs-livefresh-promo');
    await page.waitForTimeout(1000);

    // Fill Product Details URL
    await page.getByRole('textbox', { name: 'Product Details URL' }).click();
    await page.getByRole('textbox', { name: 'Product Details URL' }).fill('https://www.dbs.com.sg/personal/cards/credit-cards/live-fresh-dbs-visa-paywave-platinum-card ');
    await page.waitForTimeout(1000);

    // Take screenshot before submit (optional)
    await page.screenshot({ path: 'tests/screenshots/before-submit.png', fullPage: true });

    // Click the submit button
    await page.getByRole('button', { name: 'Define Audience' }).click();

    // Wait for step 2 to load - expect to see the loading state first
    await expect(page.getByText('Analyzing market and identifying audience segments...')).toBeVisible({ timeout: 10000 });

    // Wait for the loading to complete and the Target Audience Segments heading to appear (AI processing can take time)
    await expect(page.locator('h2:has-text("Target Audience Segments")')).toBeVisible({ timeout: 120000 });

    // Verify the "Generate Creatives" button is present
    await expect(page.getByRole('button', { name: 'Generate Creatives' })).toBeVisible();

    // Verify at least one audience segment card is present (segments have checkboxes)
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();

    // Verify the Back button is present
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();

    // Take screenshot after successful navigation (optional)
    await page.screenshot({ path: 'tests/screenshots/after-submit.png', fullPage: true });
  });

});
