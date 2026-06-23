import { useState, useEffect } from 'react'
import axios from 'axios'
import { signInWithClassroom } from '../firebase'

export default function GoogleClassroom({ onImportSuccess, documents, latestQuiz }) {
    const [authenticated, setAuthenticated] = useState(false)
    const [demoMode, setDemoMode] = useState(false)
    const [selectedCourse, setSelectedCourse] = useState(null)
    const [loading, setLoading] = useState(true)
    const [courses, setCourses] = useState([])
    const [materials, setMaterials] = useState([])

    // Demo data
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
        const token = localStorage.getItem('classroom_token')
        if (token) {
            setAuthenticated(true)
            await loadCourses(token)
        }
        setLoading(false)
    }

    const authenticate = async () => {
        setLoading(true)
        try {
            const result = await signInWithClassroom()
            if (result.token) {
                localStorage.setItem('classroom_token', result.token)
                setAuthenticated(true)
                await loadCourses(result.token)
            }
        } catch (error) {
            console.error('Authentication error:', error)
            alert('Error connecting to Google Classroom. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const loadCourses = async (token = localStorage.getItem('classroom_token')) => {
        if (!token) return
        try {
            const response = await axios.get('/api/classroom/courses', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCourses(response.data.courses || [])
        } catch (error) {
            console.error('Error loading courses:', error)
            if (error.response?.status === 401) {
                // Token might be expired
                localStorage.removeItem('classroom_token')
                setAuthenticated(false)
            }
        }
    }

    const loadMaterials = async (courseId) => {
        setSelectedCourse(courseId)
        const token = localStorage.getItem('classroom_token')
        if (!token) return
        try {
            const response = await axios.get(`/api/classroom/courses/${courseId}/materials`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setMaterials(response.data.materials || [])
        } catch (error) {
            console.error('Error loading materials:', error)
        }
    }

    const enableDemoMode = () => {
        setDemoMode(true)
        setAuthenticated(true)
    }

    const postQuiz = async () => {
        if (!selectedCourse) {
            alert('Please select a course first')
            return
        }
        if (!latestQuiz || latestQuiz.length === 0) {
            alert('Please generate a quiz first')
            return
        }
        
        if (demoMode) {
            const courseName = demoCourses.find(c => c.id === selectedCourse)?.name
            alert('✅ Quiz posted successfully to ' + courseName + ' (Demo)')
            return
        }

        try {
            setLoading(true)
            const token = localStorage.getItem('classroom_token')
            await axios.post('/api/classroom/post-quiz', {
                course_id: selectedCourse,
                quiz: latestQuiz
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            
            const courseName = courses.find(c => c.id === selectedCourse)?.name
            alert(`✅ Quiz successfully posted as an assignment to ${courseName}!`)
        } catch (error) {
            console.error('Error posting quiz:', error)
            alert('Failed to post quiz: ' + (error.response?.data?.detail || error.message))
        } finally {
            setLoading(false)
        }
    }

    const displayCourses = demoMode ? demoCourses : courses
    const displayMaterials = demoMode ? demoMaterials : materials

    return (
        <div className="p-6 max-w-4xl mx-auto pb-32">
            <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500">
                
                {/* Header Section */}
                <div className="glass-card rounded-2xl p-8 space-y-4">
                    <div className="flex items-center gap-2 text-primary font-label-md">
                        <span className="material-symbols-outlined text-[16px]">school</span>
                        GOOGLE CLASSROOM INTEGRATION
                    </div>
                    <h2 className="font-display-lg text-display-lg">Connect & Learn</h2>
                    <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                        Connect to your Google Classroom to access courses and materials seamlessly.
                    </p>
                </div>

                {!authenticated ? (
                    <div className="space-y-6">
                        <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/30 flex flex-col items-center text-center gap-6">
                            <span className="material-symbols-outlined text-[48px] text-primary">account_balance</span>
                            <h3 className="font-headline-md text-headline-md">Connect Your Classroom</h3>
                            <p className="text-on-surface-variant max-w-md">
                                Link your Google Classroom account to import study materials and post AI quizzes for your students.
                            </p>

                            <div className="flex gap-4 flex-wrap justify-center w-full mt-4">
                                <button
                                    onClick={authenticate}
                                    disabled={loading}
                                    className="accent-gradient text-on-primary font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">{loading ? 'sync' : 'login'}</span> 
                                    {loading ? 'Connecting...' : 'Sign in with Google'}
                                </button>


                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className={`p-4 rounded-xl border ${demoMode ? 'bg-secondary/10 border-secondary/30 text-secondary' : 'bg-primary/10 border-primary/30 text-primary'} flex items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined">check_circle</span>
                                <div>
                                    <strong className="block">{demoMode ? 'Demo Mode Active' : 'Connected to Google Classroom'}</strong>
                                    <span className="text-[12px] opacity-80">{demoMode ? 'Showing sample data.' : 'Showing real courses.'}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    localStorage.removeItem('classroom_token')
                                    setAuthenticated(false)
                                    setDemoMode(false)
                                    setCourses([])
                                    setMaterials([])
                                    setSelectedCourse(null)
                                }}
                                className="text-[13px] font-bold px-4 py-2 border border-outline-variant/30 rounded-lg hover:bg-error/10 hover:text-error hover:border-error/30 transition-all"
                            >
                                Disconnect
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-headline-md text-headline-md flex items-center gap-2 border-l-4 border-primary pl-4">
                                <span className="material-symbols-outlined">book</span> Your Courses
                            </h3>
                            {displayCourses.length === 0 ? (
                                <p className="text-on-surface-variant italic">No courses found.</p>
                            ) : (
                                <div className="space-y-4">
                                    {displayCourses.map(course => (
                                        <button
                                            key={course.id}
                                            onClick={() => loadMaterials(course.id)}
                                            className={`w-full text-left p-6 rounded-xl border transition-all duration-300 group
                                                ${selectedCourse === course.id 
                                                    ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' 
                                                    : 'bg-surface-container-low border-outline-variant/20 hover:border-primary/50'}`}
                                        >
                                            <h4 className="font-headline-sm text-headline-sm flex justify-between items-center">
                                                {course.name}
                                                <span className={`material-symbols-outlined transition-transform duration-300 ${selectedCourse === course.id ? 'rotate-90 text-primary' : 'text-on-surface-variant group-hover:text-primary group-hover:translate-x-1'}`}>
                                                    chevron_right
                                                </span>
                                            </h4>
                                            {course.section && <p className="text-on-surface-variant font-body-md mt-2 opacity-80">{course.section}</p>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedCourse && (
                            <div className="space-y-4 animate-in fade-in">
                                <h3 className="font-headline-md text-headline-md flex items-center gap-2 border-l-4 border-primary pl-4">
                                    <span className="material-symbols-outlined">description</span> Course Materials
                                </h3>
                                
                                {displayMaterials.length === 0 ? (
                                    <p className="text-on-surface-variant italic">No materials found.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {displayMaterials.map((material, idx) => (
                                            <div key={idx} className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-primary/40 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <span className="material-symbols-outlined text-primary mt-1">article</span>
                                                    <div>
                                                        <h4 className="font-bold text-on-surface">{material.title}</h4>
                                                        {material.description && (
                                                            <p className="text-[13px] text-on-surface-variant line-clamp-2 mt-1">{material.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {!demoMode && material.drive_url && (
                                                        <button 
                                                            onClick={async () => {
                                                                const btn = document.getElementById(`import-btn-${idx}`);
                                                                if (btn) {
                                                                    btn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size:16px;">sync</span> Importing...';
                                                                    btn.disabled = true;
                                                                }
                                                                try {
                                                                    const token = localStorage.getItem('classroom_token');
                                                                    await axios.post('/api/classroom/import', {
                                                                        file_id: material.drive_id,
                                                                        file_name: material.title + '.pdf'
                                                                    }, {
                                                                        headers: { Authorization: `Bearer ${token}` }
                                                                    });
                                                                    alert('PDF Imported Successfully! It is now available in your chat documents.');
                                                                    if (onImportSuccess) onImportSuccess();
                                                                } catch (err) {
                                                                    alert('Failed to import PDF: ' + (err.response?.data?.detail || err.message));
                                                                } finally {
                                                                    if (btn) {
                                                                        btn.innerHTML = 'Import PDF';
                                                                        btn.disabled = false;
                                                                    }
                                                                }
                                                            }}
                                                            id={`import-btn-${idx}`}
                                                            disabled={(documents || []).includes(material.title + '.pdf')}
                                                            className={`flex items-center gap-2 border px-4 py-2 rounded-lg font-label-md transition-colors ${
                                                                (documents || []).includes(material.title + '.pdf')
                                                                    ? 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30 opacity-50 cursor-not-allowed'
                                                                    : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                                            }`}
                                                        >
                                                            {(documents || []).includes(material.title + '.pdf') ? (
                                                                <>
                                                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                                                    Imported
                                                                </>
                                                            ) : 'Import PDF'}
                                                        </button>
                                                    )}
                                                    {material.link_url && (
                                                        <a href={material.link_url} target="_blank" rel="noopener noreferrer" className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg font-label-md border border-outline-variant/30 hover:border-primary/50 transition-colors">
                                                            Open Link
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {latestQuiz && latestQuiz.length > 0 ? (
                                    <div className="pt-6">
                                        <button onClick={postQuiz} disabled={loading} className="accent-gradient text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                            <span className="material-symbols-outlined">{loading ? 'sync' : 'send'}</span> 
                                            {loading ? 'Posting...' : 'Post Quiz to Course'}
                                        </button>
                                        <p className="text-on-surface-variant text-[13px] mt-2">
                                            This will create an assignment in Google Classroom with the quiz questions.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="pt-6">
                                        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex items-center gap-3 text-on-surface-variant">
                                            <span className="material-symbols-outlined text-primary">info</span>
                                            <p className="text-[14px]">Generate a quiz in the Quiz tab to post it to this course.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
