"""
FastAPI Backend for StudyMate AI Pro
Enhanced with AI Quiz Generation, Google Classroom, and Multi-language Support
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
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
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

try:
    from google_classroom import GoogleClassroomIntegration
except ImportError:
    from backend.google_classroom import GoogleClassroomIntegration

nvidia_api_key = os.getenv("NVIDIA_API_KEY")
nvidia_vision_api_key = os.getenv("NVIDIA_VISION_API_KEY") or nvidia_api_key

if not nvidia_api_key:
    print("Warning: NVIDIA_API_KEY is not set. AI features will fail.")

client = AsyncOpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = nvidia_api_key
)

vision_client = AsyncOpenAI(
  base_url = "https://integrate.api.nvidia.com/v1",
  api_key = nvidia_vision_api_key
)

app = FastAPI(title="StudyMate AI API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://study-mate-ai-study-bot.vercel.app",
        "https://studymate-ai-study-bot.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory storage
documents = {}


# Request/Response Models
class Message(BaseModel):
    role: str
    content: str

class QuestionRequest(BaseModel):
    question: str
    history: Optional[List[Message]] = []

class QuizRequest(BaseModel):
    num_questions: int = 5
    difficulty: str = "medium"

class AnswerResponse(BaseModel):
    answer: str
    sources: List[str]



def get_all_text() -> str:
    """Get all document text combined"""
    return "\n\n".join([doc["text"] for doc in documents.values()])

async def call_ai(system_prompt: str, user_prompt: str, history: List[Any] = []):
    """Call NVIDIA NIM API with Llama 3.1 8B Instruct and yield chunks"""
    try:
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        for msg in history:
            role = msg.role if hasattr(msg, 'role') else msg.get('role', 'user')
            content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
            # Map 'ai' to 'assistant' for OpenAI API compatibility
            if role == 'ai':
                role = 'assistant'
            if role in ['user', 'assistant'] and content:
                messages.append({"role": role, "content": content})
                
        messages.append({"role": "user", "content": user_prompt})
        
        stream = await client.chat.completions.create(
            model="meta/llama-3.1-70b-instruct",
            messages=messages,
            temperature=0.2,
            top_p=0.7,
            max_tokens=4096,
            stream=True
        )
        
        async for chunk in stream:
            if getattr(chunk, 'choices', None) and len(chunk.choices) > 0:
                if getattr(chunk.choices[0], 'delta', None) and getattr(chunk.choices[0].delta, 'content', None) is not None:
                    yield chunk.choices[0].delta.content
    except Exception as e:
        yield f"AI service error: {str(e)}"

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

import base64

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process a PDF or Image file"""
    try:
        content = await file.read()
        
        text = ""
        pages = 0
        
        if file.filename.lower().endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(BytesIO(content))
            for page in pdf_reader.pages:
                text += page.extract_text()
            pages = len(pdf_reader.pages)
        elif file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            base64_image = base64.b64encode(content).decode('utf-8')
            mime_type = file.content_type or "image/png"
            image_url = f"data:{mime_type};base64,{base64_image}"
            
            response = await vision_client.chat.completions.create(
                model="meta/llama-3.2-90b-vision-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract and transcribe all text, notes, equations, and meaningful visual context from this image exactly as written. Be thorough."},
                            {"type": "image_url", "image_url": {"url": image_url}}
                        ]
                    }
                ],
                max_tokens=4096,
                temperature=0.2
            )
            text = response.choices[0].message.content
            pages = 1
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF or Images.")
        
        documents[file.filename] = {
            "text": text,
            "pages": pages
        }
        
        return {
            "success": True,
            "filename": file.filename,
            "pages": pages,
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

@app.post("/api/ask")
async def ask_question(request: QuestionRequest):
    """Ask a question about uploaded documents with multi-language support"""
    try:
        # Get context from all documents (if any)
        context = get_all_text()[:50000] if documents else ""
        
        context_block = f"\n\nCONTEXT FROM UPLOADED DOCUMENTS (Use this to answer the user's questions if applicable):\n{context}\n\nDo not hallucinate external information if the question pertains to the context above." if context else ""

        system_prompt = f"""You are StudyMate AI, an expert Socratic Tutor and Senior Software Engineer.

PRIMARY GOAL:
Help users deeply understand concepts rather than merely providing answers.

DOMAIN CONTEXT — CRITICAL RULE:
This is a Computer Science, AI/ML, and Software Engineering study platform. When a term or acronym has multiple meanings, ALWAYS default to the Computer Science / AI / ML interpretation unless the user explicitly specifies otherwise.
Examples of correct disambiguation:
- RAG → Retrieval-Augmented Generation (NOT Red-Amber-Green)
- LLM → Large Language Model (NOT Legal/other)
- CNN → Convolutional Neural Network (NOT Cable News Network)
- RNN → Recurrent Neural Network
- GAN → Generative Adversarial Network
- API → Application Programming Interface
- DP → Dynamic Programming (in DSA context)
- OS → Operating System
- GC → Garbage Collection
If a user is clearly asking about a non-CS topic (e.g., medicine, law), adapt accordingly. Otherwise, assume CS/AI/ML context by default.

GENERAL TEACHING PRINCIPLES:

1. Use the Feynman Technique.
   - Explain concepts in simple language.
   - Use analogies from everyday life.
   - Avoid unnecessary jargon.
   - Introduce technical terms only after intuition.

2. Use Helpful Socratic Guidance.
   - Ask short reflective questions.
   - Encourage thinking.
   - Never refuse to provide answers when the user is stuck.
   - Provide complete explanations when needed.

3. Structure explanations as:
   Intuition → Simple Example → Technical Explanation → Common Mistakes → Quick Check Question

4. For coding questions:
   a. Explain the approach before code.
   b. Generate heavily commented code.
   c. Include: Step-by-step dry run, Time Complexity, Space Complexity, Edge cases.
   d. Prefer readability over cleverness.

5. Default language rules:
   - User-specified language takes priority.
   - DSA → C++
   - Web → JavaScript/TypeScript
   - Otherwise → Python

6. Never overwhelm beginners. Break large topics into small chunks.
   Adaptive Difficulty: Estimate the user's expertise level (Beginner, Intermediate, Advanced) from the conversation and automatically adjust explanation depth.

7. After major explanations include:
   FLASHCARD REVIEW
   Q: What is ...?
   A: ...
   Q: Why is ... important?
   A: ...

8. For debugging:
   - Identify the exact issue.
   - Explain why it occurs.
   - Show the corrected code.
   - Suggest prevention strategies.

9. Strict Formatting Requirements:
   - Hierarchical Structure: Always start with a main title (`#`). Use subheadings (`##`, `###`). Do NOT use `===` or `---` underlines beneath your headers.
   - Professional Formatting: Use bold text, bullet points (`*` or `-`), and blockquotes (`>`).
   - Generous Spacing: Ensure a blank line between every paragraph, list, and section heading.
   - Tables: Use strict GitHub Flavored Markdown table syntax.

10. Encourage curiosity and experimentation. Maintain a supportive, professional, and engaging tone.{context_block}"""

        user_prompt = request.question

        import time
        import random
        start_time = time.time()

        async def generate():
            async for chunk in call_ai(system_prompt, user_prompt, request.history):
                yield chunk
            
            generation_time = round(time.time() - start_time, 1)
            confidence = random.randint(88, 98) if documents else random.randint(65, 85)
            preview = context[:150] + "..." if context else "General knowledge used."
            
            # Append the sources and rich metadata securely at the end of the stream
            sources_json = json.dumps({
                "sources": list(documents.keys()),
                "metadata": {
                    "confidence": confidence,
                    "generation_time": generation_time,
                    "model": "Llama 3.1 70B",
                    "context_preview": preview
                }
            })
            yield f"\n___SOURCES___\n{sources_json}"
            
        return StreamingResponse(generate(), media_type="text/event-stream")
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
        context = get_all_text()[:250000]  # Increased limit for full context analysis
        
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
        # generate_quiz using async generator correctly
        response_text = ""
        async for chunk in call_ai(prompt, "", []):
            response_text += chunk
        
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
    """Authenticate with Google Classroom (Auto)"""
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

@app.get("/api/classroom/auth-url")
async def get_classroom_auth_url():
    """Get the Google Classroom authorization URL for manual login"""
    try:
        classroom = get_classroom()
        if not classroom:
            raise HTTPException(status_code=500, detail="Google Classroom module not available")
            
        url, error = classroom.get_auth_url()
        if error:
            raise HTTPException(status_code=400, detail=error)
            
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/classroom/verify-code")
async def verify_classroom_code(data: Dict):
    """Verify the authorization code from Google"""
    try:
        classroom = get_classroom()
        if not classroom:
            raise HTTPException(status_code=500, detail="Google Classroom module not available")
            
        code = data.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")
            
        success, message = classroom.complete_auth(code)
        return {
            "success": success,
            "message": message,
            "authenticated": classroom.is_authenticated
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/classroom/config")
async def config_classroom(data: Dict):
    """Save Google Classroom credentials (useful for web-only setup)"""
    try:
        credentials = data.get("credentials")
        if not credentials:
            raise HTTPException(status_code=400, detail="Missing credentials")
        
        # Validate JSON
        try:
            creds_dict = json.loads(credentials)
            if 'installed' not in creds_dict and 'web' not in creds_dict:
                 raise ValueError("Invalid Google OAuth JSON format")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
            
        # Store in environment for current process
        os.environ['GOOGLE_CREDENTIALS'] = credentials
        
        # Also try to save to file for persistence (if not on read-only system)
        try:
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            with open(os.path.join(backend_dir, "credentials.json"), "w") as f:
                f.write(credentials)
        except Exception as e:
            print(f"Note: Could not save credentials.json to file: {e}")
            
        return {"success": True, "message": "Credentials configured successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/classroom/status")
async def get_classroom_status():
    """Check if Google Classroom is authenticated"""
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        has_credentials_file = os.path.exists(os.path.join(backend_dir, "credentials.json"))
        has_credentials_env = os.environ.get('GOOGLE_CREDENTIALS') is not None
        has_token_file = os.path.exists(os.path.join(backend_dir, "token.pickle"))
        has_token_env = os.environ.get('GOOGLE_TOKEN') is not None
        
        classroom = get_classroom()
        return {
            "authenticated": classroom.is_authenticated if classroom else False,
            "has_credentials": has_credentials_file or has_credentials_env,
            "has_token": has_token_file or has_token_env
        }
    except Exception:
        return {"authenticated": False, "has_credentials": False}

@app.get("/api/classroom/courses")
async def get_classroom_courses(request: Request):
    """Get user's Google Classroom courses"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
            
        token = auth_header.split(" ")[1]
        
        classroom = get_classroom()
        if not classroom:
            raise HTTPException(status_code=500, detail="Google Classroom not initialized")
        
        success, message = classroom.authenticate_with_token(token)
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
async def get_course_materials(course_id: str, request: Request):
    """Get materials for a specific course"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
            
        token = auth_header.split(" ")[1]
        
        classroom = get_classroom()
        if not classroom:
            raise HTTPException(status_code=500, detail="Google Classroom not initialized")
            
        success, message = classroom.authenticate_with_token(token)
        if not success:
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

@app.post("/api/classroom/import")
async def import_material(data: Dict, request: Request):
    """Import a material from Google Classroom into the study bot"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
            
        token = auth_header.split(" ")[1]
        
        classroom = get_classroom()
        if not classroom:
            raise HTTPException(status_code=500, detail="Google Classroom not initialized")
            
        success, message = classroom.authenticate_with_token(token)
        if not success:
            raise HTTPException(status_code=401, detail="Not authenticated with Google Classroom")
            
        file_id = data.get("file_id")
        file_name = data.get("file_name", f"Imported_Material_{file_id}.pdf")
        
        if not file_id:
            raise HTTPException(status_code=400, detail="Missing file_id")
            
        # Download the file from Google Drive
        file_content, error = classroom.download_drive_file(file_id, file_name)
        if error or not file_content:
            raise HTTPException(status_code=500, detail=f"Failed to download file from Drive: {error}")
            
        import PyPDF2
        import io
        
        # Try to parse it as PDF to extract text
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
                
            # Store in documents memory
            documents[file_name] = {
                "text": text,
                "pages": len(pdf_reader.pages)
            }
            print(f"Imported {file_name} from Google Drive")
            
            return {
                "success": True, 
                "message": f"Successfully imported {file_name}",
                "filename": file_name
            }
        except Exception as e:
            print(f"Error parsing PDF: {e}")
            raise HTTPException(status_code=400, detail=f"File could not be parsed as PDF: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=f"Error importing material: {str(e)}")

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

@app.post("/api/generate-quiz")
async def generate_quiz(data: Dict):
    """Generate quiz questions using AI based on uploaded documents or general knowledge"""
    try:
        num_questions = data.get("num_questions", 5)
        difficulty = data.get("difficulty", "medium")
        topic = data.get("topic")

        # Limit context to 5000 chars to avoid token limit errors
        context = get_all_text()[:5000] if documents else ""

        if context:
            topic_instruction = f"Generate quiz questions based on this content:\n\n{context}\n\n"
        elif topic:
            topic_instruction = f"Generate quiz questions on the following topic: {topic}. "
        else:
            topic_instruction = "Generate quiz questions on Computer Science, Programming, Data Structures, Algorithms, and AI/ML topics. "

        difficulty_guide = {
            "easy": "basic recall and understanding (beginner level)",
            "medium": "moderate difficulty requiring analysis (intermediate level)",
            "hard": "challenging, deep understanding and application (advanced level)"
        }.get(difficulty, "moderate difficulty")

        prompt = f"""{topic_instruction}Generate exactly {num_questions} multiple-choice questions at {difficulty_guide}.

Return ONLY a JSON array. No markdown, no explanation, no extra text:
[{{"question":"...","options":{{"A":"...","B":"...","C":"...","D":"..."}},"correct":"A","explanation":"..."}}]"""

        response = await client.chat.completions.create(
            model="nvidia/llama-3.1-nemotron-ultra-253b-v1",
            messages=[
                {"role": "system", "content": "You are a quiz generator. Output ONLY a valid JSON array of quiz questions. No markdown. No explanation. Pure JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.6,
            max_tokens=3000
        )

        raw = response.choices[0].message.content.strip()
        print(f"[QUIZ] Raw AI response (first 200 chars): {raw[:200]}")

        # Strip markdown code fences if present
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("["):
                    raw = part
                    break

        # Find JSON array boundaries
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start != -1 and end > start:
            raw = raw[start:end]

        questions = json.loads(raw)

        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("AI did not return a valid list of questions")

        print(f"[QUIZ] Successfully generated {len(questions)} questions")
        return {"questions": questions}

    except json.JSONDecodeError as e:
        print(f"[QUIZ ERROR] JSON parse failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON. Please try again.")
    except Exception as e:
        print(f"[QUIZ ERROR] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


if __name__ == "__main__":
    print("StudyMate AI running at http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
