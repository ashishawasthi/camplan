# Playwright Tests

This directory contains end-to-end tests for the Ad Campaign Planner application using Playwright.

## Running Tests

### Prerequisites

Make sure you have installed all dependencies:
```bash
npm install
```

### Run all tests (headless mode)
```bash
npm test
```

### Run tests with UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see the browser)
```bash
npm run test:headed
```

### View test report
After running tests, view the HTML report:
```bash
npm run test:report
```

## Test Structure

- **step1-form-submission.spec.ts** - Tests for Campaign Details form (Step 1)
  - Fills and submits all mandatory fields
  - Validates form submission with empty fields
  - Tests optional field acceptance

## Screenshots

Test screenshots are saved to `tests/screenshots/` during test execution:
- `before-submit.png` - Form state before submission
- `after-submit.png` - Next step after successful submission

## Configuration

Playwright configuration is defined in `playwright.config.ts` at the project root.

- **Base URL**: https://ad-campaign-planner-708214089226.us-west1.run.app
- **Browsers**: Chromium, Firefox, WebKit
- **Timeout**: 60 seconds for AI processing steps
