import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiUpload, FiMessageSquare, FiBook, FiTrash2, FiDownload, FiMic, FiGlobe } from 'react-icons/fi'
import axios from 'axios'
import './App.css'
import FileUpload from './components/FileUpload'
import ChatInterface from './components/ChatInterface'
import DocumentList from './components/DocumentList'
import QuizGenerator from './components/QuizGenerator'
import LanguageSelector from './components/LanguageSelector'
import ChatHistory from './components/ChatHistory'
import GoogleClassroom from './components/GoogleClassroom'


function App() {
    const [activeTab, setActiveTab] = useState('chat')
    const [documents, setDocuments] = useState([])
    const [chatHistory, setChatHistory] = useState([])
    const [selectedLanguage, setSelectedLanguage] = useState('English')
    const [languages, setLanguages] = useState([])

    // Load languages on mount
    useEffect(() => {
        loadLanguages()
        loadDocuments()
    }, [])

    const loadLanguages = async () => {
        try {
            const response = await axios.get('/api/languages')
            setLanguages(response.data.languages)
        } catch (error) {
            console.error('Error loading languages:', error)
        }
    }

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

    const addChatMessage = (message) => {
        setChatHistory([...chatHistory, message])
    }

    const exportChatHistory = async () => {
        try {
            const response = await axios.post('/api/export-chat', chatHistory)
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `chat-history-${new Date().toISOString()}.json`
            a.click()
        } catch (error) {
            console.error('Export error:', error)
        }
    }

    const clearChatHistory = () => {
        if (window.confirm('Clear all chat history?')) {
            setChatHistory([])
        }
    }

    return (
        <div className="app">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1>📚 StudyMate AI Pro</h1>
                    <p>Your AI Study Assistant</p>
                </div>

                {/* Language Selector */}
                <LanguageSelector
                    languages={languages}
                    selected={selectedLanguage}
                    onChange={setSelectedLanguage}
                />

                {/* File Upload */}
                <FileUpload onUploadSuccess={handleUploadSuccess} />

                {/* Document List */}
                <DocumentList
                    documents={documents}
                    onDelete={handleDeleteDocument}
                />

                {/* Chat History */}
                <ChatHistory
                    messages={chatHistory}
                    onExport={exportChatHistory}
                    onClear={clearChatHistory}
                />
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Tab Navigation */}
                <div className="tab-nav">
                    <button
                        className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        <FiMessageSquare /> Chat
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'quiz' ? 'active' : ''}`}
                        onClick={() => setActiveTab('quiz')}
                    >
                        <FiBook /> Quiz
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'classroom' ? 'active' : ''}`}
                        onClick={() => setActiveTab('classroom')}
                    >
                        <FiGlobe /> Classroom
                    </button>
                </div>

                {/* Content Area */}
                <div className="content-area">
                    {activeTab === 'chat' && (
                        <ChatInterface
                            language={selectedLanguage}
                            onMessageAdd={addChatMessage}
                        />
                    )}
                    {activeTab === 'quiz' && (
                        <QuizGenerator language={selectedLanguage} />
                    )}
                    {activeTab === 'classroom' && (
                        <GoogleClassroom />
                    )}
                </div>
            </main>
        </div>
    )
}

export default App
