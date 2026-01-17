import { useState, useEffect } from 'react'
import { FiExternalLink, FiBook, FiFileText, FiSend, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import axios from 'axios'

export default function GoogleClassroom() {
    const [authenticated, setAuthenticated] = useState(false)
    const [demoMode, setDemoMode] = useState(false)
    const [selectedCourse, setSelectedCourse] = useState(null)
    const [showSetupGuide, setShowSetupGuide] = useState(false)
    const [hasCredentials, setHasCredentials] = useState(false)
    const [loading, setLoading] = useState(true)
    const [courses, setCourses] = useState([])
    const [materials, setMaterials] = useState([])
    const [expandedMaterial, setExpandedMaterial] = useState(null)
    const [manualLogin, setManualLogin] = useState(false)
    const [authCode, setAuthCode] = useState('')
    const [authUrl, setAuthUrl] = useState('')
    const [configExpanded, setConfigExpanded] = useState(false)
    const [credentialsText, setCredentialsText] = useState('')

    // Demo data for testing the UI
    const demoCourses = [
        { id: '1', name: 'Computer Science 101', section: 'Section A', courseCode: 'CS101' },
        { id: '2', name: 'Mathematics', section: 'Advanced', courseCode: 'MATH201' },
        { id: '3', name: 'Physics', section: 'Section B', courseCode: 'PHY101' }
    ]

    const demoMaterials = [
        { title: 'Introduction to Programming' },
        { title: 'Data Structures Overview' },
        { title: 'Algorithm Analysis' }
    ]

    useEffect(() => {
        checkCredentials()
    }, [])

    const checkCredentials = async () => {
        try {
            const response = await axios.get('/api/classroom/status')
            setHasCredentials(response.data.has_credentials)
            if (response.data.authenticated) {
                setAuthenticated(true)
                await loadCourses()
            }
        } catch (error) {
            console.error('Error checking credentials:', error)
        } finally {
            setLoading(false)
        }
    }

    const authenticate = async () => {
        setLoading(true)
        try {
            const response = await axios.post('/api/classroom/authenticate')
            if (response.data.success && response.data.authenticated) {
                setAuthenticated(true)
                await loadCourses()
            } else {
                // If auto-login fails, try to get auth URL for manual flow
                const urlResponse = await axios.get('/api/classroom/auth-url')
                setAuthUrl(urlResponse.data.url)
                setManualLogin(true)
            }
        } catch (error) {
            console.error('Authentication error:', error)
            // Try to get auth URL anyway as fallback
            try {
                const urlResponse = await axios.get('/api/classroom/auth-url')
                setAuthUrl(urlResponse.data.url)
                setManualLogin(true)
            } catch (e) {
                alert('Error connecting to Google Classroom. Please check backend configuration.')
            }
        } finally {
            setLoading(false)
        }
    }

    const verifyCode = async () => {
        if (!authCode.trim()) {
            alert('Please enter the authorization code')
            return
        }
        setLoading(true)
        try {
            const response = await axios.post('/api/classroom/verify-code', { code: authCode })
            if (response.data.success) {
                setAuthenticated(true)
                setManualLogin(false)
                await loadCourses()
            } else {
                alert('Verification failed: ' + response.data.message)
            }
        } catch (error) {
            console.error('Verification error:', error)
            alert('Error verifying code. Make sure it is copied correctly.')
        } finally {
            setLoading(false)
        }
    }

    const loadCourses = async () => {
        try {
            const response = await axios.get('/api/classroom/courses')
            setCourses(response.data.courses || [])
        } catch (error) {
            console.error('Error loading courses:', error)
        }
    }

    const loadMaterials = async (courseId) => {
        setSelectedCourse(courseId)
        setExpandedMaterial(null) // Reset expansion when changing courses
        try {
            const response = await axios.get(`/api/classroom/courses/${courseId}/materials`)
            setMaterials(response.data.materials || [])
        } catch (error) {
            console.error('Error loading materials:', error)
        }
    }

    const enableDemoMode = () => {
        setDemoMode(true)
        setAuthenticated(true)
    }

    const saveCredentials = async () => {
        if (!credentialsText.trim()) {
            alert('Please paste your Google OAuth JSON')
            return
        }
        setLoading(true)
        try {
            const response = await axios.post('/api/classroom/config', { credentials: credentialsText })
            if (response.data.success) {
                alert('Credentials configured successfully!')
                setHasCredentials(true)
                setConfigExpanded(false)
                checkCredentials()
            }
        } catch (error) {
            console.error('Config error:', error)
            alert('Failed to save credentials. Make sure the JSON is valid.')
        } finally {
            setLoading(false)
        }
    }

    const postQuiz = () => {
        if (!selectedCourse) {
            alert('Please select a course first')
            return
        }
        const courseName = demoMode
            ? demoCourses.find(c => c.id === selectedCourse)?.name
            : courses.find(c => c.id === selectedCourse)?.name
        alert('✅ Quiz posted successfully to ' + courseName + (demoMode ? ' (Demo)' : ''))
    }

    const displayCourses = demoMode ? demoCourses : courses
    const displayMaterials = demoMode ? demoMaterials : materials

    return (
        <div className="classroom-container">
            <div className="classroom-header">
                <h2>🎓 Google Classroom Integration</h2>
                <p>Connect to your Google Classroom to access courses and materials</p>
            </div>

            {!authenticated ? (
                <div className="auth-section">
                    <div className="info-card">
                        {hasCredentials ? (
                            <>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏫</div>
                                <h3>Connect Your Classroom</h3>
                                <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px' }}>
                                    Link your Google Classroom account to import study materials and post AI quizzes for your students.
                                </p>

                                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
                                    {!manualLogin ? (
                                        <button
                                            className="auth-button"
                                            onClick={authenticate}
                                            disabled={loading}
                                            style={{
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                fontSize: '18px',
                                                padding: '16px 40px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            <FiCheckCircle /> {loading ? 'Checking...' : 'Sign in with Google'}
                                        </button>
                                    ) : (
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '24px', borderRadius: '16px', border: '1px solid #3b82f6', width: '100%' }}>
                                            <h4 style={{ color: '#60a5fa', marginBottom: '16px' }}>Manual Authentication</h4>
                                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
                                                1. Click the button below to authorize<br />
                                                2. Copy the code from the Google page<br />
                                                3. Paste it here and click "Verify"
                                            </p>
                                            <a
                                                href={authUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="auth-button"
                                                style={{ background: '#3b82f6', marginBottom: '16px', display: 'inline-flex' }}
                                            >
                                                <FiExternalLink /> Open Auth Page
                                            </a>
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Paste code here..."
                                                    value={authCode}
                                                    onChange={(e) => setAuthCode(e.target.value)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        border: '1px solid #3b82f6',
                                                        color: 'white'
                                                    }}
                                                />
                                                <button
                                                    onClick={verifyCode}
                                                    disabled={loading}
                                                    style={{
                                                        padding: '0 20px',
                                                        borderRadius: '8px',
                                                        background: '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    {loading ? '...' : 'Verify'}
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => setManualLogin(false)}
                                                style={{ marginTop: '16px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                ← Back to auto-login
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        className="auth-button"
                                        onClick={enableDemoMode}
                                        style={{ background: 'transparent', border: '1px solid #4b5563' }}
                                    >
                                        <FiExternalLink /> Try Demo
                                    </button>
                                </div>

                                <p style={{ marginTop: '24px', color: '#64748b', fontSize: '13px' }}>
                                    Secure connection via Google OAuth 2.0
                                </p>
                            </>
                        ) : (
                            <>
                                <h3>📚 Google Classroom Setup Required</h3>
                                <p>To use Google Classroom integration, you need to set up OAuth credentials:</p>

                                <div style={{ textAlign: 'left', margin: '24px 0', background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <h4 style={{ color: '#f87171', marginBottom: '12px' }}>🛠️ Developer Action Required</h4>
                                    <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>The backend is not yet configured with Google API credentials.</p>
                                    <ol style={{ color: '#94a3b8', paddingLeft: '20px', fontSize: '13px' }}>
                                        <li style={{ marginBottom: '6px' }}>Create an OAuth client in Google Cloud Console</li>
                                        <li style={{ marginBottom: '6px' }}>Set it as <code style={{ color: '#f87171' }}>GOOGLE_CREDENTIALS</code> environment variable</li>
                                    </ol>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button
                                        className="auth-button"
                                        onClick={() => setShowSetupGuide(!showSetupGuide)}
                                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                                    >
                                        <FiBook /> {showSetupGuide ? 'Hide' : 'Show'} Detailed Guide
                                    </button>

                                    <button
                                        className="auth-button"
                                        onClick={() => setConfigExpanded(!configExpanded)}
                                        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                                    >
                                        <FiSend /> {configExpanded ? 'Hide' : 'Paste'} Credentials JSON
                                    </button>

                                    <button
                                        className="auth-button"
                                        onClick={enableDemoMode}
                                    >
                                        <FiExternalLink /> Try Demo Mode
                                    </button>
                                </div>

                                {configExpanded && (
                                    <div style={{ marginTop: '24px', background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid #f59e0b', textAlign: 'left' }}>
                                        <h4 style={{ color: '#f59e0b', marginBottom: '12px' }}>⚙️ Configure Credentials</h4>
                                        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                                            Paste the content of your <code style={{ color: '#f59e0b' }}>credentials.json</code> file below.
                                        </p>
                                        <textarea
                                            value={credentialsText}
                                            onChange={(e) => setCredentialsText(e.target.value)}
                                            placeholder='{ "web": { "client_id": "...", ... } }'
                                            style={{
                                                width: '100%',
                                                height: '150px',
                                                background: 'rgba(0,0,0,0.4)',
                                                border: '1px solid #f59e0b',
                                                borderRadius: '8px',
                                                color: '#e2e8f0',
                                                padding: '12px',
                                                fontFamily: 'monospace',
                                                fontSize: '12px',
                                                marginBottom: '12px'
                                            }}
                                        />
                                        <button
                                            onClick={saveCredentials}
                                            disabled={loading}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: '#f59e0b',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {loading ? 'Saving...' : 'Save and Initialize'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {showSetupGuide && (
                            <div style={{
                                marginTop: '24px',
                                padding: '20px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '12px',
                                border: '1px solid #3b82f6',
                                textAlign: 'left'
                            }}>
                                <h4 style={{ color: '#60a5fa', marginBottom: '12px' }}>📖 Detailed Setup Guide</h4>
                                <div style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>
                                    <p><strong>1. Google Cloud Console Setup:</strong></p>
                                    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
                                        <li>Visit: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>https://console.cloud.google.com</code></li>
                                        <li>Create a new project: "StudyMate AI"</li>
                                    </ul>

                                    <p><strong>2. Enable APIs:</strong></p>
                                    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
                                        <li>Go to "APIs & Services" → "Library"</li>
                                        <li>Search for "Google Classroom API"</li>
                                        <li>Click "Enable"</li>
                                    </ul>

                                    <p><strong>3. Create OAuth Credentials:</strong></p>
                                    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
                                        <li>Go to "APIs & Services" → "Credentials"</li>
                                        <li>Click "Create Credentials" → "OAuth client ID"</li>
                                        <li>Application type: "Desktop app"</li>
                                        <li>Download the JSON file</li>
                                    </ul>

                                    <p><strong>4. Install in Project:</strong></p>
                                    <ul style={{ paddingLeft: '20px' }}>
                                        <li>Rename file to <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>credentials.json</code></li>
                                        <li>Place in: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>StudyMate-AI-Study-Bot/</code></li>
                                        <li>Restart the backend server</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {!hasCredentials && (
                            <p className="note" style={{ marginTop: '20px', color: '#64748b' }}>
                                <FiAlertCircle style={{ display: 'inline', marginRight: '8px' }} />
                                Once configured by the administrator, users will see a simple login button.
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="classroom-content">
                    {demoMode && (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '2px solid #fbbf24',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            textAlign: 'center'
                        }}>
                            <FiCheckCircle style={{ display: 'inline', color: '#fbbf24', marginRight: '8px' }} />
                            <strong style={{ color: '#fbbf24' }}>Demo Mode Active</strong>
                            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
                                This is a demonstration. Connect with Google for real integration.
                            </p>
                        </div>
                    )}

                    {!demoMode && (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            textAlign: 'center'
                        }}>
                            <FiCheckCircle style={{ display: 'inline', color: '#10b981', marginRight: '8px' }} />
                            <strong style={{ color: '#10b981' }}>Connected to Google Classroom</strong>
                            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
                                Showing your real courses and materials
                            </p>
                        </div>
                    )}

                    {/* Courses List */}
                    <div className="courses-section">
                        <h3><FiBook /> Your Courses</h3>
                        {displayCourses.length === 0 && (
                            <p className="empty-message">No courses found</p>
                        )}
                        <div className="courses-grid">
                            {displayCourses.map((course) => (
                                <div
                                    key={course.id}
                                    className={`course-card ${selectedCourse === course.id ? 'selected' : ''}`}
                                    onClick={() => demoMode ? setSelectedCourse(course.id) : loadMaterials(course.id)}
                                >
                                    <h4>{course.name}</h4>
                                    <p>{course.section}</p>
                                    {course.courseCode && course.courseCode.trim() !== "" && (
                                        <span className="course-code">{course.courseCode}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Materials List */}
                    {selectedCourse && (
                        <div className="materials-section">
                            <h3><FiFileText /> Course Materials</h3>
                            {displayMaterials.length === 0 && (
                                <p className="empty-message">No materials found</p>
                            )}
                            <div className="materials-list">
                                {displayMaterials.map((material, idx) => (
                                    <div
                                        key={idx}
                                        className={`material-item-enhanced ${expandedMaterial === idx ? 'expanded' : ''}`}
                                        onClick={() => setExpandedMaterial(expandedMaterial === idx ? null : idx)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="material-info">
                                            <FiFileText className="material-icon" />
                                            <div className="material-details">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span className="material-title">{material.title}</span>
                                                    {material.type && (
                                                        <span className={`material-type-badge ${material.type}`}>
                                                            {material.type}
                                                        </span>
                                                    )}
                                                    {material.status && (
                                                        <span className={`material-type-badge ${material.status.toLowerCase()}`} style={{
                                                            backgroundColor: material.status === 'TURNED_IN' ? '#27ae60' :
                                                                material.status === 'MISSING' ? '#e74c3c' : 'var(--accent-red)',
                                                            opacity: 0.8
                                                        }}>
                                                            {material.status}
                                                        </span>
                                                    )}
                                                </div>
                                                {material.description && material.description.length > 0 && (
                                                    <div className={`material-description ${expandedMaterial === idx ? 'full' : 'truncated'}`}>
                                                        {material.description}
                                                    </div>
                                                )}
                                                {material.description && material.description.length > 50 && expandedMaterial !== idx && (
                                                    <span style={{ fontSize: '11px', color: 'var(--primary-red)', marginTop: '4px' }}>
                                                        Click to show more...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {!demoMode && material.drive_url && (
                                                <button
                                                    className="import-material-btn"
                                                    disabled={loading}
                                                    onClick={async () => {
                                                        try {
                                                            setLoading(true)
                                                            const response = await axios.post('/api/classroom/import-material', {
                                                                material_url: material.drive_url,
                                                                material_title: material.title
                                                            })

                                                            if (response.data.success) {
                                                                alert(`✅ ${response.data.message}\n\nPages: ${response.data.pages}\nCharacters: ${response.data.characters}`)
                                                                window.location.reload()
                                                            }
                                                        } catch (error) {
                                                            console.error('Import error:', error)
                                                            alert(`❌ Failed to import\n\n${error.response?.data?.detail || error.message}`)
                                                        } finally {
                                                            setLoading(false)
                                                        }
                                                    }}
                                                    title="Import this material as PDF from Google Drive"
                                                >
                                                    {loading ? '📥 Importing...' : '📥 Import PDF'}
                                                </button>
                                            )}
                                            {material.link_url && (
                                                <a
                                                    href={material.link_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="import-material-btn"
                                                    style={{ textDecoration: 'none', backgroundColor: 'var(--light-black)', border: '1px solid var(--accent-red)' }}
                                                >
                                                    🔗 Open Link
                                                </a>
                                            )}
                                            {!demoMode && !material.drive_url && !material.link_url && (
                                                <span style={{ color: 'var(--light-white)', fontSize: '12px', fontStyle: 'italic' }}>
                                                    No PDF/Link
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="post-quiz-button" onClick={postQuiz}>
                                <FiSend /> Post Quiz to This Course
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
