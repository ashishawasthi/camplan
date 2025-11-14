# camplan

Campaign Planner

Try it at https://ad-campaign-planner-708214089226.us-west1.run.app/

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testing

This project uses Playwright for end-to-end testing.

### Run Tests

**Run all tests (headless):**
```bash
npm test
```

**Run tests with UI mode (interactive):**
```bash
npm run test:ui
```
**Run headed test only for Chrome:**
```bash
npx playwright test --headed --project=chromium
```

**View test report:**
```bash
npm run test:report
```

### Record New Tests

You can record tests by interacting with the application using Playwright's codegen:

**Basic recording:**
```bash
npx playwright codegen https://ad-campaign-planner-708214089226.us-west1.run.app/
```

**Record to a specific file:**
```bash
npx playwright codegen --target typescript -o tests/step1-form-submission.spec.ts https://ad-campaign-planner-708214089226.us-west1.run.app/
```

**Record in a specific browser:**
```bash
npx playwright codegen --browser firefox https://ad-campaign-planner-708214089226.us-west1.run.app/
```

**Record with device emulation:**
```bash
npx playwright codegen --device="iPhone 13" https://ad-campaign-planner-708214089226.us-west1.run.app/
```

This will open a browser window and Playwright Inspector. Simply interact with the app (fill forms, click buttons, etc.) and Playwright will generate test code automatically.
