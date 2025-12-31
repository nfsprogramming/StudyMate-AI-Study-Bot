"""
FastAPI Backend for StudyMate AI Pro
Enhanced with AI Quiz Generation, Google Classroom, and Multi-language Support
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import PyPDF2
from io import BytesIO
import os
import requests
import json
import re
try:
    from google_classroom import GoogleClassroomIntegration
except ImportError:
    from backend.google_classroom import GoogleClassroomIntegration

app = FastAPI(title="StudyMate AI Pro API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for easier deployment, or specify your vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory storage
documents = {}

# Supported languages
SUPPORTED_LANGUAGES = [
    "English", "Spanish", "French", "German", "Italian", 
    "Portuguese", "Hindi", "Chinese", "Japanese", "Korean",
    "Arabic", "Russian", "Dutch", "Swedish", "Turkish"
]

# Language code mapping
LANGUAGE_CODES = {
    "English": "en", "Spanish": "es", "French": "fr", "German": "de",
    "Italian": "it", "Portuguese": "pt", "Hindi": "hi", "Chinese": "zh",
    "Japanese": "ja", "Korean": "ko", "Arabic": "ar", "Russian": "ru",
    "Dutch": "nl", "Swedish": "sv", "Turkish": "tr"
}

# Request/Response Models
class QuestionRequest(BaseModel):
    question: str
    language: str = "English"

class QuizRequest(BaseModel):
    num_questions: int = 5
    difficulty: str = "medium"
    language: str = "English"

class AnswerResponse(BaseModel):
    answer: str
    sources: List[str]


# Helper Functions
def get_language_code(language: str) -> str:
    """Convert language name to code"""
    return LANGUAGE_CODES.get(language, "en")

def get_all_text() -> str:
    """Get all document text combined"""
    return "\n\n".join([doc["text"] for doc in documents.values()])

async def call_ai(prompt: str, language: str = "English") -> str:
    """Call Pollinations AI API with language-specific instructions"""
    try:
        messages = [{"role": "user", "content": prompt}]
        if language != "English":
            messages[0]["content"] += f"\n\nIMPORTANT: Respond in {language} language."
        
        response = requests.post(
            "https://text.pollinations.ai/",
            json={"messages": messages},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            return response.text.strip()
        raise Exception(f"AI API error: {response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

# Routes
@app.get("/")
async def root():
    return {
        "message": "StudyMate AI Pro API", 
        "version": "2.0.0", 
        "status": "running",
        "features": ["AI Chat", "Quiz Generation", "Multi-language", "Google Classroom"]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "documents": len(documents),
        "languages": len(SUPPORTED_LANGUAGES)
    }

@app.get("/api/languages")
async def get_languages():
    """Get list of supported languages"""
    return {"languages": SUPPORTED_LANGUAGES}

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file"""
    try:
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(BytesIO(content))
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        
        documents[file.filename] = {
            "text": text,
            "pages": len(pdf_reader.pages)
        }
        
        return {
            "success": True,
            "filename": file.filename,
            "pages": len(pdf_reader.pages),
            "characters": len(text)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def get_documents():
    """Get list of uploaded documents"""
    return {"documents": list(documents.keys())}

@app.delete("/api/documents/{filename}")
async def delete_document(filename: str):
    """Delete a document"""
    if filename in documents:
        del documents[filename]
        return {"success": True, "message": f"{filename} deleted"}
    raise HTTPException(status_code=404, detail="Document not found")

@app.post("/api/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """Ask a question about uploaded documents with multi-language support"""
    try:
        if not documents:
            raise HTTPException(status_code=400, detail="No documents uploaded")
        
        # Get context from all documents
        context = get_all_text()[:3000]  # Limit context size
        
        prompt = f"""Based on the following context from uploaded documents, answer the question accurately and concisely.

Context:
{context}

Question: {request.question}

Provide a clear, informative answer based only on the context provided."""

        answer = await call_ai(prompt, request.language)
        
        return AnswerResponse(
            answer=answer,
            sources=list(documents.keys())
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """Generate AI-powered quiz from uploaded documents"""
    try:
        if not documents:
            raise HTTPException(status_code=400, detail="No documents uploaded. Please upload PDFs first.")
        
        # Get context from documents
        context = get_all_text()[:2500]  # Limit for better AI performance
        
        # Create difficulty-specific prompt
        difficulty_instructions = {
            "easy": "Create straightforward questions with obvious answers.",
            "medium": "Create moderately challenging questions requiring understanding.",
            "hard": "Create complex questions requiring deep analysis and critical thinking."
        }
        
        difficulty_instruction = difficulty_instructions.get(request.difficulty, difficulty_instructions["medium"])
        
        prompt = f"""Based on the following educational content, generate {request.num_questions} multiple-choice questions.

Content:
{context}

Requirements:
- {difficulty_instruction}
- Each question must have 4 options (A, B, C, D)
- Only ONE option should be correct
- Questions should test understanding of the content
- Difficulty level: {request.difficulty}

Return ONLY a valid JSON array in this exact format, with no additional text:
[
  {{
    "question": "Question text here?",
    "options": {{
      "A": "First option",
      "B": "Second option",
      "C": "Third option",
      "D": "Fourth option"
    }},
    "correct": "A"
  }}
]

Generate {request.num_questions} questions now:"""

        response_text = await call_ai(prompt, request.language)
        
        # Try to extract JSON from response
        try:
            # Look for JSON array in the response
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                questions = json.loads(json_match.group())
            else:
                questions = json.loads(response_text)
            
            # Validate structure
            if not isinstance(questions, list) or len(questions) == 0:
                raise ValueError("Invalid quiz format")
            
            # Ensure each question has required fields
            validated_questions = []
            for q in questions[:request.num_questions]:
                if all(key in q for key in ["question", "options", "correct"]):
                    validated_questions.append(q)
            
            if len(validated_questions) == 0:
                raise ValueError("No valid questions generated")
            
            return {"questions": validated_questions}
            
        except (json.JSONDecodeError, ValueError) as e:
            # Fallback: create structured questions from context
            print(f"JSON parsing failed: {e}, creating fallback quiz")
            return {"questions": create_fallback_quiz(request.num_questions, context, request.difficulty)}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")

def create_fallback_quiz(num: int, context: str, difficulty: str) -> List[Dict]:
    """Create a basic quiz when AI fails"""
    # Extract key sentences from context
    sentences = [s.strip() for s in context.split('.') if len(s.strip()) > 20][:num]
    
    questions = []
    for i, sentence in enumerate(sentences):
        questions.append({
            "question": f"Based on the document, which statement is accurate? (Question {i+1})",
            "options": {
                "A": sentence[:100] + "..." if len(sentence) > 100 else sentence,
                "B": "This information is not in the document",
                "C": "The document does not address this topic",
                "D": "None of the above"
            },
            "correct": "A"
        })
    
    return questions[:num]

# Google Classroom Integration
classroom_integration = None

def get_classroom():
    """Get or initialize classroom integration singleton"""
    global classroom_integration
    if classroom_integration is None:
        try:
            classroom_integration = GoogleClassroomIntegration()
        except Exception as e:
            return None
    return classroom_integration

@app.post("/api/classroom/authenticate")
async def authenticate_classroom():
    """Authenticate with Google Classroom"""
    try:
        classroom = get_classroom()
        if not classroom:
            return {"success": False, "message": "Google Classroom module not available"}
        
        success, message = classroom.authenticate()
        return {
            "success": success,
            "message": message,
            "authenticated": classroom.is_authenticated
        }
    except Exception as e:
        return {"success": False, "error": str(e), "message": "Authentication failed"}

@app.get("/api/classroom/status")
async def get_classroom_status():
    """Check if Google Classroom is authenticated"""
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        has_credentials_file = os.path.exists(os.path.join(backend_dir, "credentials.json"))
        has_credentials_env = os.environ.get('GOOGLE_CREDENTIALS') is not None
        has_token = os.path.exists(os.path.join(backend_dir, "token.pickle"))
        
        classroom = get_classroom()
        return {
            "authenticated": classroom.is_authenticated if classroom else False,
            "has_credentials": has_credentials_file or has_credentials_env,
            "has_token": has_token
        }
    except Exception:
        return {"authenticated": False, "has_credentials": False}

@app.get("/api/classroom/courses")
async def get_classroom_courses():
    """Get user's Google Classroom courses"""
    try:
        classroom = get_classroom()
        if not classroom:
            raise HTTPException(status_code=500, detail="Google Classroom not initialized")
        
        if not classroom.is_authenticated:
            # Try to authenticate
            success, message = classroom.authenticate()
            if not success:
                raise HTTPException(status_code=401, detail=message)
        
        courses, error = classroom.get_courses()
        if error:
            raise HTTPException(status_code=500, detail=error)
        
        # Format courses for frontend
        formatted_courses = []
        for course in courses:
            formatted_courses.append({
                "id": course.get("id"),
                "name": course.get("name"),
                "section": course.get("section", ""),
                "courseCode": course.get("descriptionHeading", ""),
                "room": course.get("room", ""),
                "ownerId": course.get("ownerId", ""),
                "enrollmentCode": course.get("enrollmentCode", "")
            })
        
        return {"courses": formatted_courses}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching courses: {str(e)}")

@app.get("/api/classroom/courses/{course_id}/materials")
async def get_course_materials(course_id: str):
    """Get materials for a specific course"""
    try:
        classroom = get_classroom()
        if not classroom or not classroom.is_authenticated:
            raise HTTPException(status_code=401, detail="Not authenticated with Google Classroom")
        
        # Get coursework (assignments)
        coursework, error1 = classroom.get_course_work(course_id)
        if error1: coursework = []
        
        # Get materials
        materials, error2 = classroom.get_course_materials(course_id)
        if error2: materials = []

        # Get announcements
        announcements, error3 = classroom.get_announcements(course_id)
        if error3: announcements = []
        
        # Combine and format
        all_items = []
        
        # Process Announcements
        for ann in (announcements or []):
            ann_data = {
                "id": ann.get("id"),
                "title": ann.get("text")[:100] + "..." if len(ann.get("text", "")) > 100 else ann.get("text", "Announcement"),
                "type": "announcement",
                "description": ann.get("text", ""),
                "timestamp": ann.get("updateTime")
            }
            # Extract materials from announcements
            ann_materials = ann.get("materials", [])
            for m in ann_materials:
                if "driveFile" in m:
                    df = m["driveFile"].get("driveFile", {})
                    ann_data["drive_url"] = df.get("alternateLink")
                    ann_data["drive_id"] = df.get("id")
                elif "link" in m:
                    ann_data["link_url"] = m["link"].get("url")
            all_items.append(ann_data)

        # Process Assignments (Coursework)
        for work in (coursework or []):
            work_data = {
                "id": work.get("id"),
                "title": work.get("title", "Untitled"),
                "type": "assignment",
                "description": work.get("description", ""),
                "dueDate": work.get("dueDate"),
                "maxPoints": work.get("maxPoints")
            }
            
            # Fetch submission status for this assignment
            subs, s_err = classroom.get_student_submissions(course_id, work.get("id"))
            if subs and len(subs) > 0:
                work_data["status"] = subs[0].get("state", "ASSIGNED")
            else:
                work_data["status"] = "ASSIGNED"

            # Extract materials
            work_materials = work.get("materials", [])
            for m in work_materials:
                if "driveFile" in m:
                    df = m["driveFile"].get("driveFile", {})
                    work_data["drive_url"] = df.get("alternateLink")
                    work_data["drive_id"] = df.get("id")
                    if work_data["drive_url"]: break
                elif "link" in m:
                    work_data["link_url"] = m["link"].get("url")
            
            all_items.append(work_data)
        
        # Process Materials
        for mat in (materials or []):
            material_data = {
                "id": mat.get("id"),
                "title": mat.get("title", "Untitled"),
                "type": "material",
                "description": mat.get("description", "")
            }
            
            mat_materials = mat.get("materials", [])
            for m in mat_materials:
                if "driveFile" in m:
                    df = m["driveFile"].get("driveFile", {})
                    material_data["drive_url"] = df.get("alternateLink")
                    material_data["drive_id"] = df.get("id")
                    if material_data["drive_url"]: break
                elif "link" in m:
                    material_data["link_url"] = m["link"].get("url")
            
            all_items.append(material_data)
        
        return {"materials": all_items}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching materials: {str(e)}")

@app.post("/api/classroom/post-quiz")
async def post_quiz_to_classroom(data: Dict):
    """Post a quiz to Google Classroom"""
    try:
        classroom = get_classroom()
        if not classroom or not classroom.is_authenticated:
            raise HTTPException(status_code=401, detail="Not authenticated with Google Classroom")
        
        course_id = data.get("course_id")
        quiz_questions = data.get("quiz", [])
        
        if not course_id or not quiz_questions:
            raise HTTPException(status_code=400, detail="Missing course_id or quiz data")
        
        # Create quiz assignment
        result, error = classroom.create_quiz_assignment(
            course_id=course_id,
            quiz_data=quiz_questions,
            max_points=len(quiz_questions) * 10  # 10 points per question
        )
        
        if error:
            raise HTTPException(status_code=500, detail=error)
        
        return {
            "success": True,
            "message": "Quiz posted successfully to Google Classroom",
            "assignment_id": result.get("id") if result else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error posting quiz: {str(e)}")

@app.post("/api/classroom/import-material")
async def import_material_from_classroom(data: Dict):
    """Import a material from Google Classroom as PDF"""
    try:
        classroom = get_classroom()
        if not classroom or not classroom.is_authenticated:
            raise HTTPException(status_code=401, detail="Not authenticated with Google Classroom")
        
        material_url = data.get("material_url")
        material_title = data.get("material_title", "Imported Material")
        
        if not material_url:
            raise HTTPException(status_code=400, detail="Missing material_url")
        
        # Extract Drive file ID from URL
        file_id = classroom.extract_drive_file_id(material_url)
        
        if not file_id:
            raise HTTPException(status_code=400, detail="Could not extract file ID from URL. Only Google Drive links are supported.")
        
        # Download the file from Google Drive
        file_content, error = classroom.download_drive_file(file_id, material_title)
        
        if error:
            raise HTTPException(status_code=500, detail=error)
        
        if not file_content:
            raise HTTPException(status_code=500, detail="Downloaded file is empty")
        
        # Process the PDF
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            
            # Generate a safe filename
            safe_filename = "".join(c for c in material_title if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_filename = safe_filename[:100] + ".pdf"  # Limit length
            
            # Store in documents
            documents[safe_filename] = {
                "text": text,
                "pages": len(pdf_reader.pages),
                "source": "Google Classroom"
            }
            
            print(f"✅ Successfully imported: {safe_filename}")
            
            return {
                "success": True,
                "message": f"Successfully imported '{material_title}' from Google Classroom",
                "filename": safe_filename,
                "pages": len(pdf_reader.pages),
                "characters": len(text)
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing material: {str(e)}")


# Export Features
@app.post("/api/export-chat")
async def export_chat(data: List[Dict]):
    """Export chat history"""
    try:
        export_data = {
            "type": "chat_history",
            "timestamp": str(json.dumps(data)),
            "messages": data,
            "total_messages": len(data)
        }
        return export_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export-quiz")
async def export_quiz(data: Dict):
    """Export quiz results"""
    try:
        export_data = {
            "type": "quiz_results",
            "timestamp": data.get("timestamp"),
            "quiz": data.get("quiz"),
            "answers": data.get("answers"),
            "score": data.get("score"),
            "total": data.get("total"),
            "percentage": round((data.get("score", 0) / data.get("total", 1)) * 100, 2),
            "difficulty": data.get("difficulty"),
            "language": data.get("language")
        }
        return export_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 StudyMate AI Pro API running at http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
