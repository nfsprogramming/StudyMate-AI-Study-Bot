"""
Google Classroom Integration Module for StudyMate AI Pro
Handles authentication and API interactions with Google Classroom
"""

import os
import pickle
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime, timedelta
import json

# Google Classroom and Drive API scopes
SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me',
    'https://www.googleapis.com/auth/classroom.coursework.students',
    'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
    'https://www.googleapis.com/auth/classroom.announcements.readonly',
    'https://www.googleapis.com/auth/classroom.topics.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
    # Google Drive scopes for downloading files
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file'
]

class GoogleClassroomIntegration:
    """Handle Google Classroom API operations"""
    
    def __init__(self):
        self.creds = None
        self.service = None
        self.is_authenticated = False
        
    def authenticate(self):
        """Authenticate with Google Classroom API"""
        # Get the directory where this script is located (backend folder)
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        token_path = os.path.join(backend_dir, 'token.pickle')
        
        # 1. Try to load from environment variable (Best for production)
        env_creds_json = os.environ.get('GOOGLE_CREDENTIALS')
        
        # 2. Try to load existing token (User already logged in)
        if os.path.exists(token_path):
            with open(token_path, 'rb') as token:
                self.creds = pickle.load(token)
        
        # 3. If no valid credentials, let user log in
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                # Use environment variable if available, otherwise look for file
                if env_creds_json:
                    try:
                        creds_dict = json.loads(env_creds_json)
                        flow = InstalledAppFlow.from_client_config(creds_dict, SCOPES)
                    except Exception as e:
                        return False, f"Error parsing GOOGLE_CREDENTIALS env var: {str(e)}"
                else:
                    credentials_path = os.path.join(backend_dir, 'credentials.json')
                    if not os.path.exists(credentials_path):
                        return False, "Google Classroom not configured. Developer setup required."
                    flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
                
                # Use a specific port for local server or host-based flow
                self.creds = flow.run_local_server(port=0, access_type='offline')
            
            # Save credentials for next run (if possible)
            try:
                with open(token_path, 'wb') as token:
                    pickle.dump(self.creds, token)
            except:
                pass # Might fail on read-only filesystems
        
        try:
            self.service = build('classroom', 'v1', credentials=self.creds)
            self.is_authenticated = True
            return True, "Successfully authenticated with Google Classroom"
        except Exception as e:
            return False, f"Authentication error: {str(e)}"
    
    def get_courses(self):
        """Get list of all courses (as student or teacher)"""
        if not self.is_authenticated:
            return None, "Not authenticated. Please authenticate first."
        
        try:
            # Get courses where user is a student
            results = self.service.courses().list(
                studentId='me',
                courseStates=['ACTIVE']
            ).execute()
            
            courses = results.get('courses', [])
            
            # Also try to get courses where user is a teacher
            try:
                teacher_results = self.service.courses().list(
                    teacherId='me',
                    courseStates=['ACTIVE']
                ).execute()
                
                teacher_courses = teacher_results.get('courses', [])
                
                # Combine and deduplicate
                all_course_ids = {c['id'] for c in courses}
                for tc in teacher_courses:
                    if tc['id'] not in all_course_ids:
                        courses.append(tc)
            except:
                pass  # If teacher query fails, just use student courses
            
            return courses, None
        except HttpError as error:
            return None, f"Error fetching courses: {error}"
    
    def create_quiz_assignment(self, course_id, quiz_data, due_date=None, max_points=100):
        """
        Create a quiz assignment in Google Classroom
        
        Args:
            course_id: ID of the course
            quiz_data: Quiz questions and answers
            due_date: Due date (datetime object)
            max_points: Maximum points for the assignment
        """
        if not self.is_authenticated:
            return None, "Not authenticated"
        
        try:
            # Format quiz as description
            description = self._format_quiz_for_classroom(quiz_data)
            
            # Prepare assignment
            coursework = {
                'title': f'StudyMate AI Quiz - {datetime.now().strftime("%Y-%m-%d")}',
                'description': description,
                'workType': 'ASSIGNMENT',
                'state': 'PUBLISHED',
                'maxPoints': max_points,
            }
            
            # Add due date if provided
            if due_date:
                coursework['dueDate'] = {
                    'year': due_date.year,
                    'month': due_date.month,
                    'day': due_date.day
                }
                coursework['dueTime'] = {
                    'hours': 23,
                    'minutes': 59
                }
            
            # Create the assignment
            result = self.service.courses().courseWork().create(
                courseId=course_id,
                body=coursework
            ).execute()
            
            return result, None
        except HttpError as error:
            return None, f"Error creating assignment: {error}"
    
    def post_material(self, course_id, title, description, materials=None):
        """
        Post course material to Google Classroom
        
        Args:
            course_id: ID of the course
            title: Material title
            description: Material description
            materials: Optional list of materials (links, files)
        """
        if not self.is_authenticated:
            return None, "Not authenticated"
        
        try:
            material = {
                'title': title,
                'description': description,
                'state': 'PUBLISHED',
                'workType': 'ASSIGNMENT'
            }
            
            if materials:
                material['materials'] = materials
            
            result = self.service.courses().courseWork().create(
                courseId=course_id,
                body=material
            ).execute()
            
            return result, None
        except HttpError as error:
            return None, f"Error posting material: {error}"
    
    def create_announcement(self, course_id, text):
        """
        Create an announcement in Google Classroom
        
        Args:
            course_id: ID of the course
            text: Announcement text
        """
        if not self.is_authenticated:
            return None, "Not authenticated"
        
        try:
            announcement = {
                'text': text,
                'state': 'PUBLISHED'
            }
            
            result = self.service.courses().announcements().create(
                courseId=course_id,
                body=announcement
            ).execute()
            
            return result, None
        except HttpError as error:
            return None, f"Error creating announcement: {error}"
    
    def get_students(self, course_id):
        """Get list of students in a course"""
        if not self.is_authenticated:
            return None, "Not authenticated"
        
        try:
            results = self.service.courses().students().list(
                courseId=course_id
            ).execute()
            
            students = results.get('students', [])
            return students, None
        except HttpError as error:
            return None, f"Error fetching students: {error}"
    
    def get_course_work(self, course_id):
        """Get all assignments/coursework for a course"""
        if not self.is_authenticated:
            return None, "Not authenticated"
        
        try:
            results = self.service.courses().courseWork().list(
                courseId=course_id,
                orderBy='dueDate desc'
            ).execute()
            
            coursework = results.get('courseWork', [])
            return coursework, None
        except HttpError as error:
            return None, f"Error fetching coursework: {error}"
    
    def get_course_materials(self, course_id):
        """Get all materials for a course"""
        if not self.is_authenticated:
            return None, "Not authenticated"
        
        try:
            results = self.service.courses().courseWorkMaterials().list(
                courseId=course_id
            ).execute()
            
            materials = results.get('courseWorkMaterial', [])
            return materials, None
        except HttpError as error:
            return None, f"Error fetching materials: {error}"
    
    def get_announcements(self, course_id):
        """Get all announcements for a course"""
        if not self.is_authenticated:
            return None, "Not authenticated"
        
        try:
            results = self.service.courses().announcements().list(
                courseId=course_id,
                orderBy='updateTime desc'
            ).execute()
            
            announcements = results.get('announcements', [])
            return announcements, None
        except HttpError as error:
            return None, f"Error fetching announcements: {error}"
    
    def get_student_submissions(self, course_id, coursework_id):
        """Get student submissions for an assignment"""
        if not self.is_authenticated:
            return None, "Not authenticated"
        
        try:
            results = self.service.courses().courseWork().studentSubmissions().list(
                courseId=course_id,
                courseWorkId=coursework_id
            ).execute()
            
            submissions = results.get('studentSubmissions', [])
            return submissions, None
        except HttpError as error:
            return None, f"Error fetching submissions: {error}"
    
    def download_material_content(self, material_url):
        """Download content from a material URL"""
        try:
            import requests
            response = requests.get(material_url)
            response.raise_for_status()
            return response.content, None
        except Exception as e:
            return None, f"Error downloading material: {str(e)}"
    
    def download_drive_file(self, file_id, file_name):
        """Download a file from Google Drive"""
        try:
            from googleapiclient.http import MediaIoBaseDownload
            import io
            
            # Build Drive service
            drive_service = build('drive', 'v3', credentials=self.creds)
            
            # Get file metadata to check if it's a PDF
            file_metadata = drive_service.files().get(fileId=file_id, fields='mimeType,name').execute()
            mime_type = file_metadata.get('mimeType', '')
            
            # Handle Google Docs files (export as PDF)
            if 'google-apps' in mime_type:
                if 'document' in mime_type:
                    # Export Google Doc as PDF
                    request = drive_service.files().export_media(fileId=file_id, mimeType='application/pdf')
                else:
                    return None, f"Cannot export {mime_type} as PDF"
            else:
                # Download regular file
                request = drive_service.files().get_media(fileId=file_id)
            
            # Download the file
            file_buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(file_buffer, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            file_buffer.seek(0)
            return file_buffer.read(), None
            
        except HttpError as error:
            return None, f"Drive API error: {error}"
        except Exception as e:
            return None, f"Error downloading from Drive: {str(e)}"
    
    def extract_drive_file_id(self, url):
        """Extract Google Drive file ID from various URL formats"""
        import re
        
        # Pattern for /file/d/FILE_ID/
        match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
        if match:
            return match.group(1)
        
        # Pattern for id=FILE_ID
        match = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
        if match:
            return match.group(1)
        
        # Pattern for /open?id=FILE_ID
        match = re.search(r'/open\?id=([a-zA-Z0-9_-]+)', url)
        if match:
            return match.group(1)
        
        return None
    
    def _format_quiz_for_classroom(self, quiz_data):
        """Format quiz data for Google Classroom description"""
        description = "📚 StudyMate AI Generated Quiz\n\n"
        description += "Instructions: Answer the following questions and submit your responses.\n\n"
        description += "="*50 + "\n\n"
        
        for idx, question in enumerate(quiz_data, 1):
            description += f"Question {idx}:\n"
            description += f"{question.get('question', '')}\n\n"
            
            options = question.get('options', {})
            for letter, option_text in sorted(options.items()):
                description += f"{letter}) {option_text}\n"
            
            description += "\n" + "-"*50 + "\n\n"
        
        description += "\n📝 Submit your answers in the format: 1-A, 2-B, 3-C, etc.\n"
        description += "\n✨ Generated by StudyMate AI Pro"
        
        return description
    
    def disconnect(self):
        """Disconnect from Google Classroom"""
        if os.path.exists('token.pickle'):
            os.remove('token.pickle')
        self.creds = None
        self.service = None
        self.is_authenticated = False
        return True, "Disconnected from Google Classroom"

# Singleton instance
_classroom_instance = None

def get_classroom_integration():
    """Get or create Google Classroom integration instance"""
    global _classroom_instance
    if _classroom_instance is None:
        _classroom_instance = GoogleClassroomIntegration()
    return _classroom_instance
