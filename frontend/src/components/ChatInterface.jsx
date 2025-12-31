import { useState, useRef, useEffect } from 'react'
import { FiMic, FiMicOff } from 'react-icons/fi'
import axios from 'axios'

export default function ChatInterface({ language, onMessageAdd }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [recognition, setRecognition] = useState(null)
    const messagesEndRef = useRef(null)

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            const recognitionInstance = new SpeechRecognition()
            recognitionInstance.continuous = false
            recognitionInstance.interimResults = false

            recognitionInstance.onresult = (event) => {
                const transcript = event.results[0][0].transcript
                setInput(transcript)
                setIsListening(false)
            }

            recognitionInstance.onerror = () => {
                setIsListening(false)
            }

            recognitionInstance.onend = () => {
                setIsListening(false)
            }

            setRecognition(recognitionInstance)
        }
    }, [])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const toggleVoiceInput = () => {
        if (!recognition) {
            alert('Voice input not supported in your browser')
            return
        }

        if (isListening) {
            recognition.stop()
            setIsListening(false)
        } else {
            recognition.start()
            setIsListening(true)
        }
    }

    const handleSend = async () => {
        if (!input.trim()) return

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        }

        setMessages([...messages, userMessage])
        onMessageAdd(userMessage)
        setInput('')
        setLoading(true)

        try {
            const response = await axios.post('/api/ask', {
                question: input,
                language: language
            })

            const aiMessage = {
                role: 'ai',
                content: response.data.answer,
                sources: response.data.sources,
                timestamp: new Date().toISOString()
            }

            setMessages(prev => [...prev, aiMessage])
            onMessageAdd(aiMessage)
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage = {
                role: 'ai',
                content: 'Error getting response. Please try again.',
                timestamp: new Date().toISOString()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="chat-container">
            <div className="messages">
                {messages.length === 0 && (
                    <div className="empty-state">
                        <h3>👋 Welcome to StudyMate AI!</h3>
                        <p>Upload PDFs and ask questions about them</p>
                        <p className="hint">💡 Try voice input with the microphone button</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <div className="message-header">
                            <strong>{msg.role === 'user' ? '👤 You' : '🤖 AI'}</strong>
                            <span className="timestamp">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <p className="message-content">{msg.content}</p>
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="message-sources">
                                <small>📚 Sources: {msg.sources.join(', ')}</small>
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="message ai">
                        <div className="message-header">
                            <strong>🤖 AI</strong>
                        </div>
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <input
                    type="text"
                    className="chat-input"
                    placeholder={`Ask a question in ${language}...`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                />
                <button
                    className={`voice-button ${isListening ? 'listening' : ''}`}
                    onClick={toggleVoiceInput}
                    title="Voice input"
                >
                    {isListening ? <FiMicOff /> : <FiMic />}
                </button>
                <button
                    className="send-button"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    {loading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    )
}
