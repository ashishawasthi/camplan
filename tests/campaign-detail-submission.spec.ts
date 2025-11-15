import { test, expect } from '@playwright/test';

test.describe('Campaign Details Form', () => {
  test('should fill and submit all mandatory fields & Product Details URL', async ({ page }) => {
    // Navigate to the page
    await page.goto('/');

    // Wait for the page to fully load and be visible
    await expect(page.locator('h2:has-text("Campaign Details")')).toBeVisible();

    // Wait 1 second so user can see the form in headed mode
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
    await page.getByRole('textbox', { name: 'Product Details URL' }).fill('https://www.dbs.com.sg/personal/cards/credit-cards/live-fresh-dbs-visa-paywave-platinum-card');
    await page.waitForTimeout(1000);

    // Take screenshot before submit (optional)
    await page.screenshot({ path: 'tests/screenshots/before-submit.png', fullPage: true });
    
    // Click submit
    await page.getByRole('button', { name: 'Generate Audience Segments' }).click();
    await page.waitForTimeout(1000);

    // Assert that the next step is visible
    await expect(page.locator('h2:has-text("Target Audience Segments")')).toBeVisible({ timeout: 60000 });

    // Take screenshot after submit to see the result
    await page.screenshot({ path: 'tests/screenshots/after-submit.png', fullPage: true });
  });
});
