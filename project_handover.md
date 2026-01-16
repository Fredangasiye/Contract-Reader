# Project Handover: Contract Reader

This document contains all the essential information needed to understand, maintain, and resume development on the Contract Reader project.

## 🏗️ Project Architecture

The application is split into two main components:
1.  **Frontend:** React (Vite) application deployed to Vercel.
2.  **Backend:** Node.js/Express server deployed to Vercel.

### Key Services (Backend)
-   **`visionOcr.js`:** Handles text extraction from PDFs and images using Google Cloud Vision API.
-   **`llmAnalysis.js`:** Performs contract summarization, red flag enhancement, and field extraction using OpenRouter (Mistral-7B).
-   **`rulesEngine.js`:** Initial regex-based detection of contract types and red flags.
-   **`dataStorage.js`:** Manages data persistence using Supabase (with local file fallbacks).

## 🚀 Deployment Details

### Production URLs
-   **Frontend:** [https://frontend-nine-alpha-95.vercel.app](https://frontend-nine-alpha-95.vercel.app)
-   **Backend:** [https://backend-freds-projects-7c342310.vercel.app](https://backend-freds-projects-7c342310.vercel.app)

### Vercel Project Names
-   **Frontend:** `freds-projects-7c342310/frontend`
-   **Backend:** `freds-projects-7c342310/backend`

## 🔑 Environment Variables

### Backend (Required)
| Variable | Description |
| :--- | :--- |
| `OPENROUTER_API_KEY` | API key for OpenRouter LLM services. |
| `GOOGLE_CLOUD_VISION_API_KEY` | API key for Google Cloud Vision OCR. |
| `SUPABASE_URL` | Your Supabase project URL. |
| `SUPABASE_KEY` | Your Supabase service role or anon key. |
| `JWT_SECRET` | Secret for signing user authentication tokens. |
| `ENCRYPTION_KEY` | Key for encrypting sensitive contract text in the database. |

### Frontend (Required)
| Variable | Description |
| :--- | :--- |
| `VITE_API_BASE_URL` | The URL of the deployed backend. |

> [!IMPORTANT]
> When updating environment variables in Vercel, always use `npx vercel env add` or the Vercel Dashboard. If the production URL doesn't seem to update after a redeploy, use `npx vercel alias set` to manually point the production alias to the latest deployment.

## 🛠️ Common Troubleshooting

### 401 Errors on Analysis
-   **Cause:** Usually an invalid `OPENROUTER_API_KEY` or a mismatch in the `VITE_API_BASE_URL`.
-   **Fix:** 
    1. Verify the API key with `node test_openrouter.js`.
    2. Check Vercel Project Settings for the frontend to ensure `VITE_API_BASE_URL` isn't being overridden by an old value.
    3. Manually update Vercel aliases if redeploys aren't reflecting changes.

### Password Reset
- **Status:** Currently implemented as a mock flow. The frontend shows a success message, but no actual email is sent as an email service (like SendGrid or AWS SES) is not yet integrated.

### Missing Advice Content
-   **Cause:** `data/` directory was previously gitignored.
-   **Fix:** Ensure `data/advice_content.json` is included in the deployment. The system now has a bundled fallback in `dataStorage.js` if the file is missing.

## 📝 Development Commands
-   **Backend Dev:** `npm run dev` (in `backend/`)
-   **Frontend Dev:** `npm run dev` (in `frontend/`)
-   **Test LLM:** `node test_openrouter.js`
-   **Deploy:** `npx vercel --prod`

## 🆕 Recent Enhancements
- **Forgot Password:** Added to `LoginPage` with mock reset flow.
- **Change Document:** Added to `UploadForm` to allow resetting selection before analysis.
