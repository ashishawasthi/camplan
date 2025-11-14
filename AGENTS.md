# AGENTS.md

This file provides guidance to coding tools and agents, when working with code in this repository.

## Project Overview

Ad Campaign Planner is a React-based web application built with Vite that helps marketing and branding creatives design time-bound ad campaigns. The app integrates with Google's Gemini AI API to provide intelligent audience segmentation, creative generation, and budget allocation recommendations.

**AI Studio Link**: https://ai.studio/apps/drive/14x0hy7v9WULBiUI44NOLNf5a_IFjL-6X

## Development Commands

### Setup
```bash
npm install
```

Set the `GEMINI_API_KEY` in `.env.local` file (create if it doesn't exist):
```
GEMINI_API_KEY=your_api_key_here
```

### Run Development Server
```bash
npm run dev
```
The app runs on `http://0.0.0.0:3000` (configured in vite.config.ts:9)

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Architecture

### Tech Stack
- **Frontend**: React 19.2.0 with TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **AI Integration**: Google Gemini API (@google/genai 1.29.0)
- **Styling**: Tailwind CSS (via inline classes)

### Application Flow

The app follows a **5-step wizard pattern** managed by `App.tsx`:

1. **Campaign Details** (`Step1ProductDetails.tsx`) - Collect campaign metadata, product information, and optional supporting documents
2. **Audience Segments** (`Step2AudienceSegments.tsx`) - Generate 3-5 AI-powered audience segments using Gemini with Google Search grounding
3. **Creative Generation** (`Step3CreativeGeneration.tsx`) - Generate ad images and notification text for each segment using Gemini 2.5 Flash Image
4. **Budget Allocation** (`Step4BudgetSplit.tsx`) - AI-recommended budget split across segments and media channels
5. **Campaign Summary** (`Step5CampaignSummary.tsx`) - Review and export the complete campaign plan

State is managed at the root level in `App.tsx` with a single `Campaign` object that accumulates data across steps.

### Key Service Architecture

**Gemini API Integration** (`services/`):
- `geminiClient.ts` - Single point of interaction with Gemini API. All API calls go through `runGenerateContent()` function. This is where enterprise proxy configurations or network modifications should be applied.
- `geminiService.ts` - High-level service functions that construct prompts and handle responses:
  - `getAudienceSegments()` - Uses `gemini-2.5-pro` with Google Search tool for web-grounded segmentation and competitor analysis
  - `generateImagenImage()` - Uses `gemini-2.5-flash-image` for text-to-image generation
  - `generateImageFromProduct()` - Context-aware image generation using a product image
  - `generateNotificationText()` / `editNotificationText()` - Uses `gemini-2.5-flash` for notification copy
  - `editImage()` - Image editing using `gemini-2.5-flash-image`
  - `getBudgetSplit()` - Uses `gemini-2.5-pro` with Google Search for budget recommendations

### Type System

All core types are defined in `types.ts`:
- `Campaign` - Root object containing all campaign data
- `AudienceSegment` - Target segment with AI-generated creative prompts and rationale
- `Creative` - Contains generated image (base64 data URI) and notification text
- `SupportingDocument` - Base64-encoded file uploads (images, PDFs, text files)
- `GroundingSource` - Web sources from Google Search grounding metadata
- `CompetitorAnalysis` - Structured competitor comparison data

### Path Aliasing

The project uses `@/` as an alias for the root directory (configured in tsconfig.json:21-24 and vite.config.ts:18-20).

### Important Implementation Details

**API Key Configuration**:
- The Vite config (vite.config.ts:14-15) exposes the API key via `process.env.API_KEY` and `process.env.GEMINI_API_KEY`
- Both variables point to `GEMINI_API_KEY` from `.env.local`

**Image Handling**:
- All images are stored as base64-encoded data URIs in the `Campaign` state
- Images are 1024x1024 pixels
- Product images can be provided to generate contextual ad creatives

**Structured Output**:
- Gemini API calls use `responseMimeType: 'application/json'` with `responseSchema` for type-safe responses
- The schema definitions use `Type` enum from `@google/genai`

**Google Search Grounding**:
- Audience segmentation and budget allocation use the `googleSearch` tool
- Grounding sources are extracted from `groundingMetadata.groundingChunks` in responses
- Sources are deduplicated by URI

**Error Handling**:
- Service functions catch errors and throw user-friendly messages
- Steps 2-4 have local error state management
- Loading states are managed per-component

## File Structure

```
/
├── App.tsx                    # Root component with step navigation
├── index.tsx                  # Entry point
├── types.ts                   # All TypeScript interfaces
├── vite.config.ts             # Vite configuration
├── components/
│   ├── StepIndicator.tsx      # Progress indicator UI
│   ├── ImageEditorModal.tsx   # Modal for AI image editing
│   ├── NotificationEditorModal.tsx # Modal for notification text editing
│   ├── common/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Loader.tsx
│   ├── icons/                 # Icon components
│   └── steps/                 # Step components
│       ├── Step1ProductDetails.tsx
│       ├── Step2AudienceSegments.tsx
│       ├── Step3CreativeGeneration.tsx
│       ├── Step4BudgetSplit.tsx
│       └── Step5CampaignSummary.tsx
└── services/
    ├── geminiClient.ts        # Low-level API client
    └── geminiService.ts       # High-level service functions
```

## Countries Supported

The app targets consumer banking in: Singapore, Hong Kong, India, Indonesia, Taiwan (Step1ProductDetails.tsx:10)
