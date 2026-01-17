# 🚀 Deployment Guide for StudyMate AI Pro

This guide explains how to deploy the StudyMate AI Pro application. Since the app has a Python Backend and a React Frontend, we recommend a **Split Deployment** strategy:

1.  **Backend** on **Render** (as a Web Service)
2.  **Frontend** on **Vercel** (as a Static Site)

---

## Part 1: Deploy Backend to Render

1.  **Push your code to GitHub** (if you haven't already).
2.  **Sign up/Log in to [Render](https://render.com/)**.
3.  Click **"New +"** and select **"Web Service"**.
4.  Connect your GitHub repository.
5.  **Configure the Service**:
    *   **Name**: `studymate-backend` (or similar)
    *   **Root Directory**: `.` (leave empty or dot)
    *   **Environment**: `Python 3`
    *   **Start Command**: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app` (This is already in your `Procfile`, so Render might detect it automatically).
    *   **Build Command**: `pip install -r requirements.txt`
6.  **Environment Variables**:
    *   Add any secrets you need (e.g., `GOOGLE_API_KEY` if used).
7.  Click **"Create Web Service"**.
8.  **Wait for deployment**. Once finished, copy the **Backend URL** (e.g., `https://studymate-backend.onrender.com`).

---

## Part 2: Deploy Frontend to Vercel

1.  **Sign up/Log in to [Vercel](https://vercel.com/)**.
2.  Click **"Add New..."** -> **"Project"**.
3.  Import the same GitHub repository.
4.  **Configure the Project**:
    *   **Framework Preset**: Vite (should be detected automatically).
    *   **Root Directory**: click "Edit" and select `frontend`.
5.  **Environment Variables**:
    *   **Variable Name**: `VITE_API_URL`
    *   **Value**: The **Backend URL** you copied from Render (e.g., `https://studymate-backend.onrender.com`).
    *   *Note: Do not add a trailing slash.*
6.  Click **"Deploy"**.

---

## Part 3: Final Verification

1.  Open your new Vercel App URL (e.g., `https://studymate-frontend.vercel.app`).
2.  Try uploading a PDF and asking a question.
3.  The frontend will now communicate with your live backend on Render.

### Troubleshooting
*   **CORS Errors**: If you see CORS errors in the browser console, you may need to update the `allow_origins` list in `backend/main.py` to include your specific Vercel URL (e.g., `["https://studymate-frontend.vercel.app"]`). Currently, it might be set to `["*"]` which is open but good to check.
