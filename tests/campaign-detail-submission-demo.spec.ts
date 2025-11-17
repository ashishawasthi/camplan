import { test, expect } from '@playwright/test';

test.describe('Campaign Details Form', () => {
  test('should fill and submit all mandatory fields & Product Details URL and proceed through all steps', async ({ page }) => {
    // This is a long-running test, so we increase the timeout.
    // The default is 30s. We set it to 4 minutes to be safe.
    test.setTimeout(240000);

    // Navigate to the page. Using a placeholder URL for demo purposes.
    await page.goto('/');

    // Wait for the page to fully load and be visible
    await expect(page.locator('h2:has-text("Campaign Details")')).toBeVisible();

    // --- Step 1: Fill Campaign Details ---
    await page.getByRole('textbox', { name: 'Campaign Name' }).fill('Live Fresh Card Signup');
    await page.waitForTimeout(1000);
    await page.getByRole('spinbutton', { name: 'Paid Media Budget (S$)' }).fill('10000');
    await page.waitForTimeout(1000);
    await page.getByRole('textbox', { name: 'Landing Page URL' }).fill('https://www.dbs.com.sg/personal/promotion/cards-dbs-livefresh-promo');
    await page.waitForTimeout(1000);
    await page.getByRole('textbox', { name: 'Product Details URL' }).fill('https://www.dbs.com.sg/personal/cards/credit-cards/live-fresh-dbs-visa-paywave-platinum-card');
    await page.waitForTimeout(1000);
    
    // Click submit to generate audience segments
    await page.getByRole('button', { name: 'Generate Audience Segments' }).click();

    // --- Step 2: Audience Segments ---
    // Assert that the next step is visible. This can take a long time.
    await expect(page.locator('h2:has-text("Target Audience Segments")')).toBeVisible({ timeout: 180000 });

    // Proceed to the next step
    await page.getByRole('button', { name: 'Ad Creatives' }).click();

    // --- Step 3: Creative Generation ---
    // Assert that the creative generation step is visible
    await expect(page.locator('h2:has-text("Ad Creatives")')).toBeVisible();
    await page.waitForTimeout(5000);

    // Proceed to the next step. Note: This test does not generate any creatives.
    await page.getByRole('button', { name: 'Paid Media Allocation' }).click();

    // --- Step 4: Budget Split ---
    // Assert that the budget allocation step is visible. This also involves an API call.
    await expect(page.locator('h2:has-text("Paid Media Allocation")')).toBeVisible({ timeout: 180000 });
    await page.waitForTimeout(5000);
    
  });
});