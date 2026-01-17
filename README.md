# StudyMate AI PRO - Your AI-Powered Study Assistant

StudyMate AI PRO is a powerful, full-stack AI-driven study assistant built with **FastAPI** and **React**. It helps you learn from your PDF documents, generate quizzes, and integrate with Google Classroom.

## 🚀 Features

- ✅ **AI-Powered Chat** - Ask questions about your PDF documents.
- 🎮 **AI Quiz Generation** - Automatically generate multiple-choice questions from your study materials.
- 🎓 **Google Classroom Integration** - Connect to your classes, import materials, and post generated quizzes.
- � **PDF Import** - Directly import materials from Google Classroom as PDFs.
- 🌍 **Multi-language Support** - Communicate and generate quizzes in 15 different languages.
- 🎨 **Modern UI** - Sleek Black, Red, and White premium theme.
- 📊 **Progressive Uploads** - Real-time progress tracking for PDF uploads.

## �️ Tech Stack

- **Backend:** FastAPI (Python)
- **Frontend:** React (Vite)
- **AI API:** Pollinations AI (Free & Fast)
- **PDF Processing:** PyPDF2
- **LMS:** Google Classroom API & Drive API

## 📋 Installation & Setup

### 1. Prerequisite
- Python 3.10+
- Node.js & npm

### 2. Backend Setup
```bash
cd backend
pip install -r ../requirements.txt
python main.py
```
*Note: Place your `credentials.json` in the `backend/` folder for Google Classroom features.*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🎮 How to Use

1. **Upload PDFs**: Drag and drop your study materials or import them from Google Classroom.
2. **Chat with AI**: Ask specific questions about the content of your PDFs.
3. **Generate Quizzes**: Click the Quiz tab to create custom tests based on your documents.
4. **Classroom Sync**: Link your Google Classroom to keep all your study materials in one place.

## � Privacy & Security

- PDFs are processed and stored in-memory during the session.
- Authentication is handled securely via Google OAuth 2.0.
- All AI processing is done via prompt engineering with context truncation for efficiency.

---

**Made with ❤️ for learners everywhere**
**Version:** 2.2.0 | **Build:** December 2025
