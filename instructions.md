# Antigravity Mission Pack — contract-reader (Ready-for-Upload)

_This document contains a complete set of Antigravity mission templates and exact agent instructions so agents can scaffold, build, test, and deploy the AI Contract Reader MVP. Copy each `*.mission` block into Antigravity as separate missions (or pack them into one project). Each mission lists: Goal, Context, Inputs, Step-by-step Agent Actions, Required Environment Variables / Secrets, Artifacts to produce, Acceptance Criteria, and Example commands/tests._

---

## How to use this pack
1. Create a new Antigravity project called `contract-reader`.
2. Upload these mission templates as separate missions (you can paste the text into Antigravity missions). Name them exactly as the mission header suggests.
3. Run missions in this order (agents may run in parallel where indicated):
   - scaffold_project.mission
   - implement_backend.mission
   - implement_frontend.mission
   - implement_rules_engine.mission
   - integrate_vision_llm.mission
   - chat_and_llm_prompts.mission
   - tests_and_ci.mission
   - deploy_to_gcp.mission
   - privacy_legal.mission
   - docs_and_handbook.mission

Agents should produce the specified Artifacts for each mission and attach logs/screenshots/PRs.

---

# MISSION: scaffold_project.mission

**Goal:** Create a working repository skeleton for `contract-reader` with backend and frontend folders, basic README, dev scripts, and a running minimal server + React app. Produce an initial commit and a screenshot of the running dev UI.

**Context:** This is the baseline repo that all subsequent missions will extend. The app must start locally with `npm run dev` in frontend and `npm run dev` in backend. Use Vite for frontend and Node/Express for backend.

**Inputs (agent has access to):** project name `contract-reader`, public Git repo (if available), Node 20 runtime.

**Required Environment Variables (for dev):** none for this mission.

**Agent actions (step-by-step):**
1. Create a git repo named `contract-reader` (local) and create the directory structure:
   - `backend/` and `frontend/` and `infra/` and `docs/` and `antigravity/`.
2. Add `backend/package.json` and minimal `src/server.js` that serves `/health` returning `{status: 'ok'}` and listens on port 8080.
3. Add `frontend` using Vite + React. `src/App.jsx` shows an Upload button and a message "Contract Reader — Upload a contract".
4. Add `README.md` with run instructions:
   ```
   cd backend && npm install && npm run dev
   cd frontend && npm install && npm run dev
   ```
5. Add `.gitignore`, `LICENSE` (MIT), and a top-level `package.json` with workspace scripts (optional).
6. Run the backend server and frontend dev server and take a screenshot of both UIs (or at least the frontend running page). If running in Antigravity environment, use the environment's built-in preview screenshot tool.
7. Commit all files and push to a new branch `ag/scaffold` and create a PR stub (PR body includes a small checklist).

**Artifacts to produce:**
- Git branch `ag/scaffold` with initial commit.
- Screenshot of local frontend (or deployed preview).
- README.md in repo.
- `ag_scaffold_explain.txt` describing which commands to run locally.

**Acceptance criteria:**
- `backend/src/server.js` responds to GET `/health` with `200` and JSON `{status:'ok'}`.
- `frontend` loads a page with the Upload button and the message.
- PR created with title "scaffold: initial project skeleton" and checklist items.

---

# MISSION: implement_backend.mission

**Goal:** Implement core backend endpoints: `/upload` (multipart file upload), `/analyze` (placeholder), and `/health`. Integrate Google Cloud Storage upload helper (stubbed using local filesystem if no credentials), and provide a working local pipeline: upload -> extract text via local OCR stub -> return extracted text.

**Context:** This mission prepares the backend for OCR and LLM integrations in later missions. Keep code modular and well-tested.

**Inputs:** repo from scaffold mission.

**Required Environment Variables / Secrets (dev-safe placeholders allowed):**
- `GCS_BUCKET` (optional for integration; can use `dev` fallback)
- `GCLOUD_PROJECT` (optional)

**Agent actions:**
1. In `backend/` create `package.json` with dependencies: `express`, `multer`, `cross-env`, `dotenv`, `node-fetch` (or `undici`) and dev deps `jest`.
2. Implement these files:
   - `src/server.js` (Express app) — already scaffolded, extend to accept JSON and file uploads.
   - `src/routes/upload.js` — uses `multer` to accept multipart file field `file`; saves to `uploads/` and returns `{path, filename}`.
   - `src/services/gcs.js` — provide two modes: if `GCS_BUCKET` present use `@google-cloud/storage` to upload; otherwise save to local `uploads/` folder. Export `uploadFile(file)`.
   - `src/services/ocr_local.js` — implement a simple Tesseract-free fallback: if file is `.txt` or `.pdf` with text nodes, extract; otherwise return a placeholder string "OCR stub - no text extracted". (Later mission will replace with Vision API calls.)
   - `src/routes/analyze.js` — accepts POST with `{path}` and returns `{"text": "...extracted...

