import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import FileUpload from './components/FileUpload'
import ChatInterface from './components/ChatInterface'
import DocumentList from './components/DocumentList'
import QuizGenerator from './components/QuizGenerator'
import GoogleClassroom from './components/GoogleClassroom'
import { auth, logout, signInWithGoogle, saveChatSession, loadChatSessions, deleteChatSession } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'

function App() {
    const [user, setUser] = useState(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('chat')
    const [documents, setDocuments] = useState([])
    
    // Chat History State
    const [chatSessions, setChatSessions] = useState([])
    const [currentChatId, setCurrentChatId] = useState(Date.now().toString())
    const [latestQuiz, setLatestQuiz] = useState(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
            setAuthLoading(false)
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        if (user) {
            loadChatSessions(user.uid).then(sessions => {
                setChatSessions(sessions)
            })
        } else {
            setChatSessions([])
        }
    }, [user])

    useEffect(() => {
        if (user) {
            loadDocuments()
        }
    }, [user])

    const loadDocuments = async () => {
        try {
            const response = await axios.get('/api/documents')
            setDocuments(response.data.documents)
        } catch (error) {
            console.error('Error loading documents:', error)
        }
    }

    const handleUploadSuccess = (doc) => {
        loadDocuments()
    }

    const handleDeleteDocument = (filename) => {
        setDocuments(documents.filter(d => d !== filename))
    }

    const handleNewChat = () => {
        setCurrentChatId(Date.now().toString())
    }

    const addChatMessage = (message) => {
        if (!user) return;
        
        setChatSessions(prev => {
            const existingSession = prev.find(s => s.id === currentChatId)
            let updated;
            let sessionToSave;
            if (existingSession) {
                sessionToSave = { ...existingSession, messages: [...existingSession.messages, message], updatedAt: Date.now() }
                updated = prev.map(s => s.id === currentChatId ? sessionToSave : s)
            } else {
                const title = message.content ? message.content.substring(0, 35) + '...' : 'New Chat'
                sessionToSave = { id: currentChatId, title, messages: [message], updatedAt: Date.now() }
                updated = [sessionToSave, ...prev]
            }
            // Save to Firestore in background
            saveChatSession(user.uid, sessionToSave)
            return updated;
        })
    }

    const handleDeleteSession = (e, sessionId) => {
        e.stopPropagation()
        if (!user) return
        deleteChatSession(user.uid, sessionId)
        setChatSessions(prev => prev.filter(s => s.id !== sessionId))
        if (currentChatId === sessionId) {
            handleNewChat()
        }
    }

    const currentInitialMessages = chatSessions.find(s => s.id === currentChatId)?.messages || []

    if (authLoading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-surface overflow-hidden">
            {/* Sidebar Component Identity */}
            <aside className="w-[280px] h-full fixed left-0 top-0 bg-surface-container border-r border-primary/20 flex flex-col p-4 gap-4 z-50">
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-primary-container text-[20px]">school</span>
                        </div>
                        <h1 className="font-headline-md text-headline-md font-bold text-primary">StudyMate AI</h1>
                    </div>
                </div>

                <button 
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-4 py-3 rounded-xl shadow-md transition-all active:scale-[0.98] font-bold"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Chat
                </button>
                
                <nav className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 mt-2">
                    {/* Chat History Section */}
                    <div className="flex flex-col gap-2">
                        <span className="font-label-md text-label-md text-primary flex items-center gap-2 uppercase tracking-widest opacity-80 mt-2">
                            <span className="material-symbols-outlined text-[16px]">history</span> Recent Chats
                        </span>
                        
                        {!user ? (
                            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 text-center">
                                <span className="material-symbols-outlined text-primary mb-2 text-[24px]">lock</span>
                                <p className="text-sm text-on-surface-variant mb-3">Sign in to automatically save and view your chat history.</p>
                                <button onClick={signInWithGoogle} className="text-sm bg-surface-container-highest hover:bg-surface-container-highest/80 text-primary font-bold py-1.5 px-4 rounded-lg transition-colors border border-outline-variant/50">
                                    Sign In
                                </button>
                            </div>
                        ) : chatSessions.length === 0 ? (
                            <div className="text-sm text-on-surface-variant/50 p-2 text-center">No recent chats</div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {chatSessions.map(session => (
                                    <div
                                        key={session.id}
                                        className={`group flex items-center gap-1 rounded-lg transition-colors ${currentChatId === session.id ? 'bg-primary/10' : 'hover:bg-surface-container-highest'}`}
                                    >
                                        <button 
                                            onClick={() => setCurrentChatId(session.id)}
                                            className={`flex-1 text-left text-sm truncate px-3 py-2 transition-colors ${currentChatId === session.id ? 'text-primary font-medium' : 'text-on-surface-variant'}`}
                                        >
                                            {session.title}
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteSession(e, session.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-all"
                                            title="Delete chat"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                        <span className="font-label-md text-label-md text-primary flex items-center gap-2 uppercase tracking-widest opacity-80">
                            <span className="material-symbols-outlined text-[16px]">upload_file</span> Upload PDFs
                        </span>
                        <FileUpload onUploadSuccess={handleUploadSuccess} />
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        <span className="font-label-md text-label-md text-primary flex items-center gap-2 uppercase tracking-widest opacity-80">
                            <span className="material-symbols-outlined text-[16px]">description</span> Loaded Documents
                        </span>
                        <DocumentList
                            documents={documents}
                            onDelete={handleDeleteDocument}
                        />
                    </div>
                </nav>

                {/* User Profile Placeholder */}
                <div className="mt-auto pt-4 border-t border-outline-variant/10">
                    {!user ? (
                        <button 
                            onClick={signInWithGoogle}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-container-highest hover:bg-surface-container-highest/80 border border-outline-variant/30 transition-all font-bold text-on-surface"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Sign In
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-surface-container-low border border-outline-variant/20 hover:bg-surface-container-highest transition-colors group">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-highest border border-outline-variant/20 shrink-0">
                                <img className="w-full h-full object-cover" alt="Profile" src={user.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuCtl6kt93yk3-WIyj-0u9KnCVAcKeUG1B87fb9QbE3lP7BvTE3P_41OmSh-2M87l7rnQprJVoQc9VbSMiGM8avRpWd14IcOA7Lgbc61r1Hu4KjVAZDbDWRp2xrZ3d_l7IjDQMrvGn4AIBF_56we6s3IwzMnn95T7KY0kSmDzoZmixEysNuUYloSENOxc4gWKITh2AP-30lEZJyPf2MLG8gf16PBm9JxhC8gELeKieLto4JHpLPNxw8fxHyOT0iLOdv0rvcE29HtgaQr"} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-label-md text-label-md font-bold truncate">{user.displayName || 'Student'}</span>
                                <span className="text-[10px] text-on-surface-variant truncate">{user.email}</span>
                            </div>
                            <button 
                                onClick={logout}
                                title="Sign out"
                                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="ml-[280px] flex-1 h-screen flex flex-col relative overflow-hidden bg-surface">
                {/* Top App Bar */}
                <header className="flex items-center justify-start gap-4 px-6 h-16 w-full sticky top-0 bg-surface z-40 border-b border-outline-variant/10">
                    <div className="flex items-center gap-2">
                        <button
                            className={`rounded-lg px-4 py-2 flex items-center gap-2 transition-all ${activeTab === 'chat' ? 'bg-primary text-on-primary active-pill' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            <span className="material-symbols-outlined text-[20px]">chat</span>
                            <span className="font-label-md">Chat</span>
                        </button>
                        <button
                            className={`rounded-lg px-4 py-2 flex items-center gap-2 transition-all ${activeTab === 'quiz' ? 'bg-primary text-on-primary active-pill shadow-lg shadow-primary/20' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'}`}
                            onClick={() => setActiveTab('quiz')}
                        >
                            <span className="material-symbols-outlined text-[20px]" style={activeTab === 'quiz' ? {fontVariationSettings: "'FILL' 1"} : {}}>quiz</span>
                            <span className="font-label-md">Quiz</span>
                        </button>
                        <button
                            className={`rounded-lg px-4 py-2 flex items-center gap-2 transition-all ${activeTab === 'classroom' ? 'bg-primary text-on-primary active-pill shadow-lg shadow-primary/20' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest'}`}
                            onClick={() => setActiveTab('classroom')}
                        >
                            <span className="material-symbols-outlined text-[20px]">school</span>
                            <span className="font-label-md">Classroom</span>
                        </button>
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-2" id="chat-header-actions">
                        {/* ChatInterface portal will render the Export button here when activeTab === 'chat' */}
                    </div>
                </header>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
                        <ChatInterface
                            key={currentChatId}
                            initialMessages={currentInitialMessages}
                            onMessageAdd={addChatMessage}
                        />
                    </div>
                    <div style={{ display: activeTab === 'quiz' ? 'block' : 'none', height: '100%' }}>
                        <QuizGenerator onQuizGenerated={(quiz) => setLatestQuiz(quiz)} />
                    </div>
                    <div style={{ display: activeTab === 'classroom' ? 'block' : 'none', height: '100%' }}>
                        <GoogleClassroom onImportSuccess={loadDocuments} documents={documents} latestQuiz={latestQuiz} />
                    </div>
                </div>

                {/* Visual Polish */}
                <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
                <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            </main>
        </div>
    )
}

export default App
