import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import axios from 'axios'

const CodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    const [copied, setCopied] = useState(false)
    
    if (inline || !match) {
        return (
            <code {...props} className="bg-surface-container-highest px-1.5 py-0.5 rounded text-[0.9em] text-primary font-mono border border-outline-variant/20">
                {children}
            </code>
        )
    }
    
    const handleCopy = () => {
        navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    
    return (
        <div className="rounded-lg overflow-hidden my-6 border border-outline-variant/30">
            <div className="flex items-center justify-between px-4 py-2 bg-surface-container-highest border-b border-outline-variant/30">
                <span className="text-xs font-medium text-on-surface-variant flex items-center gap-2 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">code</span>
                    {match[1]}
                </span>
                <button 
                    onClick={handleCopy}
                    className={`text-xs hover:text-primary transition-colors flex items-center gap-1 cursor-pointer ${copied ? 'text-primary' : 'text-on-surface-variant'}`}
                >
                    <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span> 
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <SyntaxHighlighter
                {...props}
                children={String(children).replace(/\n$/, '')}
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: 0, background: '#1e1e1e', fontSize: '0.875rem' }}
            />
        </div>
    )
}
const MarkdownComponents = {
    p: ({node, ...props}) => <p className="whitespace-pre-wrap mb-6 last:mb-0 leading-relaxed text-on-surface-variant" {...props} />,
    strong: ({node, ...props}) => <strong className="font-bold text-primary bg-primary/10 px-1 rounded mx-0.5" {...props} />,
    h1: ({node, ...props}) => <h1 className="text-3xl font-extrabold mb-6 mt-10 first:mt-0 text-on-surface tracking-tight" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-5 mt-10 first:mt-0 text-on-surface border-b border-outline-variant/30 pb-2" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-xl font-semibold mb-4 mt-8 first:mt-0 text-on-surface" {...props} />,
    hr: ({node, ...props}) => <hr className="border-outline-variant/30 my-8" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 space-y-3 marker:text-primary" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 space-y-3 marker:text-primary marker:font-medium" {...props} />,
    li: ({node, ...props}) => <li className="text-on-surface-variant leading-relaxed pl-1" {...props} />,
    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-surface-container-highest/50 italic text-on-surface-variant rounded-r" {...props} />,
    table: ({node, ...props}) => <div className="overflow-x-auto my-6 border border-outline-variant/30 rounded-lg"><table className="w-full text-left border-collapse" {...props} /></div>,
    th: ({node, ...props}) => <th className="border-b border-outline-variant/30 px-4 py-3 bg-surface-container-highest font-medium text-sm text-on-surface" {...props} />,
    td: ({node, ...props}) => <td className="border-b border-outline-variant/20 px-4 py-3 text-sm text-on-surface-variant" {...props} />,
    code: CodeBlock
}

export default function ChatInterface({ onMessageAdd, initialMessages = [] }) {
    const [messages, setMessages] = useState(initialMessages)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [recognition, setRecognition] = useState(null)
    const messagesEndRef = useRef(null)

    const [abortController, setAbortController] = useState(null)
    const [likedIndexes, setLikedIndexes] = useState({})
    const [dislikedIndexes, setDislikedIndexes] = useState({})
    const [copiedIndex, setCopiedIndex] = useState(null)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const pendingUserMessageRef = useRef(null)

    const exportAsCSV = () => {
        if (messages.length === 0) return
        let csvContent = "data:text/csv;charset=utf-8,"
        csvContent += "Role,Timestamp,Message\n"
        
        messages.forEach(msg => {
            const role = msg.role === 'user' ? 'User' : 'AI'
            const timestamp = new Date(msg.timestamp).toLocaleString()
            const content = `"${msg.content.replace(/"/g, '""')}"`
            csvContent += `${role},"${timestamp}",${content}\n`
        })
        
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `studymate_chat_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setShowExportMenu(false)
    }

    const exportAsPDF = () => {
        if (messages.length === 0) return
        
        const printWindow = window.open('', '_blank')
        
        let html = `
            <html>
            <head>
                <title>StudyMate AI Chat Export</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
                    .message { margin-bottom: 24px; padding: 16px; border-radius: 8px; }
                    .user { background: #f0f4f8; border-left: 4px solid #3b82f6; }
                    .ai { background: #ffffff; border: 1px solid #e5e7eb; }
                    .role { font-weight: bold; margin-bottom: 8px; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.05em; }
                    .user .role { color: #2563eb; }
                    .ai .role { color: #dc2626; }
                    .timestamp { color: #6b7280; font-size: 0.8em; font-weight: normal; margin-left: 8px; }
                    pre { background: #1f2937; color: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; }
                    code { font-family: monospace; }
                    @media print {
                        @page { margin: 0; }
                        body { padding: 2cm !important; margin: 0; }
                    }
                </style>
            </head>
            <body>
                <h1 style="text-align: center; color: #dc2626; margin-bottom: 10px;">StudyMate AI - Chat Transcript</h1>
                <p style="text-align: center; color: #6b7280; margin-top: 0; margin-bottom: 40px;">Exported on ${new Date().toLocaleString()}</p>
        `
        
        messages.forEach(msg => {
            const role = msg.role === 'user' ? 'You' : 'StudyMate AI'
            const timestamp = new Date(msg.timestamp).toLocaleTimeString()
            let contentHtml = msg.content
                // Code blocks
                .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>')
                // Inline code
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                // Bold
                .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
                // Italic
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                // Lists (simple conversion to bullet point char to avoid complex list HTML nesting)
                .replace(/^\s*[-*]\s+(.*)/gm, '&bull; $1')
                // Newlines
                .replace(/\n/g, '<br/>')
                
            html += `
                <div class="message ${msg.role}">
                    <div class="role">${role} <span class="timestamp">${timestamp}</span></div>
                    <div>${contentHtml}</div>
                </div>
            `
        })
        
        html += `
                <script>
                    window.onload = function() { window.print(); window.setTimeout(function(){ window.close(); }, 500); }
                </script>
            </body>
            </html>
        `
        
        printWindow.document.write(html)
        printWindow.document.close()
        setShowExportMenu(false)
    }

    const pendingUserMessageRef_original = useRef(null) // keeping original name ref below intact


    const handleStop = () => {
        if (abortController) {
            abortController.abort()
            setLoading(false)
        }
    }

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            const recognitionInstance = new SpeechRecognition()
            recognitionInstance.continuous = false
            recognitionInstance.interimResults = false

            recognitionInstance.onresult = (event) => {
                const transcript = event.results[0][0].transcript
                setInput(prev => prev ? prev + ' ' + transcript : transcript)
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

    const [autoScroll, setAutoScroll] = useState(true)

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target
        // Re-enable auto-scroll if user scrolls near the bottom
        setAutoScroll(scrollHeight - scrollTop - clientHeight < 100)
    }

    const scrollToBottom = () => {
        if (autoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, autoScroll])

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
        // Don't save yet — wait until AI response is complete
        pendingUserMessageRef.current = userMessage
        setInput('')
        setLoading(true)

        const controller = new AbortController()
        setAbortController(controller)

        try {
            const initialAiMessage = {
                role: 'ai',
                content: '',
                sources: [],
                timestamp: new Date().toISOString()
            }
            
            setMessages(prev => [...prev, initialAiMessage])

            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/ask`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: input,
                    history: messages
                        .filter(m => m.role === 'user' || m.role === 'ai')
                        .map(m => ({ role: m.role, content: m.content }))
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || 'Network response was not ok')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullText = ''
            let finalMessage = { ...initialAiMessage }

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                const chunk = decoder.decode(value, { stream: true })
                fullText += chunk
                
                if (fullText.includes('___SOURCES___')) {
                    const parts = fullText.split('___SOURCES___')
                    const answerText = parts[0].trim()
                    
                    if (fullText.trim().endsWith(']}') || fullText.trim().endsWith('}')) {
                        try {
                            const sourcesData = JSON.parse(parts[1])
                            finalMessage.content = answerText
                            finalMessage.sources = sourcesData.sources
                            finalMessage.metadata = sourcesData.metadata
                        } catch (e) {
                            // If parse fails mid-stream, just show the text so far
                            finalMessage.content = answerText
                        }
                    } else {
                        // Receiving JSON but not finished
                        finalMessage.content = answerText
                    }
                    
                    setMessages(prev => {
                        const newMessages = [...prev]
                        newMessages[newMessages.length - 1] = { ...finalMessage }
                        return newMessages
                    })
                } else {
                    finalMessage.content = fullText
                    setMessages(prev => {
                        const newMessages = [...prev]
                        newMessages[newMessages.length - 1] = { ...finalMessage }
                        return newMessages
                    })
                }
            }

            // Save both user message and AI response together only after AI finishes
            if (pendingUserMessageRef.current) {
                onMessageAdd(pendingUserMessageRef.current)
                pendingUserMessageRef.current = null
            }
            onMessageAdd(finalMessage)
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted by user')
                return
            }
            console.error('Chat error:', error)
            const errorMessage = {
                role: 'ai',
                content: `Error: ${error.message || 'Failed to get response.'}`,
                timestamp: new Date().toISOString()
            }
            setMessages(prev => {
                const newMessages = [...prev]
                // Replace the empty message we pushed with the error message
                newMessages[newMessages.length - 1] = errorMessage
                return newMessages
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6" onScroll={handleScroll}>
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <div className="max-w-[600px] w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
                            <div className="space-y-4">
                                <div className="text-4xl">👋</div>
                                <h2 className="font-display-lg text-display-lg text-primary">Welcome to StudyMate AI!</h2>
                                <p className="font-headline-sm text-headline-sm text-on-surface max-w-md mx-auto">
                                    Upload PDFs and ask questions about them to get instant, cited answers.
                                </p>
                            </div>
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-2 bg-surface-container-highest/30 px-6 py-3 rounded-full border border-outline-variant/20">
                                    <span className="material-symbols-outlined text-tertiary">lightbulb</span>
                                    <p className="font-body-md text-on-surface-variant">Try voice input with the microphone button</p>
                                </div>
                            </div>
                            {/* Bento Suggestion Grid */}
                            <div className="grid grid-cols-2 gap-4 mt-12 opacity-80">
                                <div className="bg-surface-container border border-outline-variant/10 p-4 rounded-xl text-left hover:border-primary/40 transition-colors cursor-pointer group" onClick={() => setInput("Summarize findings from the loaded documents.")}>
                                    <span className="material-symbols-outlined text-primary mb-2">summarize</span>
                                    <p className="font-bold text-body-md group-hover:text-primary transition-colors">Summarize findings</p>
                                    <p className="text-label-md text-on-surface-variant">Get a concise breakdown of uploaded docs.</p>
                                </div>
                                <div className="bg-surface-container border border-outline-variant/10 p-4 rounded-xl text-left hover:border-primary/40 transition-colors cursor-pointer group" onClick={() => setInput("Extract data tables and lists into structured format.")}>
                                    <span className="material-symbols-outlined text-primary mb-2">find_in_page</span>
                                    <p className="font-bold text-body-md group-hover:text-primary transition-colors">Extract data</p>
                                    <p className="text-label-md text-on-surface-variant">Turn tables and lists into structured data.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto w-full">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-center gap-2 mb-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded flex items-center justify-center ${msg.role === 'user' ? 'bg-surface-container-highest' : 'bg-primary'}`}>
                                        <span className={`material-symbols-outlined text-[16px] ${msg.role === 'user' ? 'text-on-surface' : 'text-on-primary-container'}`}>
                                            {msg.role === 'user' ? 'person' : 'school'}
                                        </span>
                                    </div>
                                    <span className="text-label-md text-on-surface-variant">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className={`${msg.role === 'user' ? 'bg-surface-container-highest border border-outline-variant/20 rounded-2xl rounded-tr-none' : 'glass-panel rounded-2xl rounded-tl-none'} p-4 max-w-[85%]`}>
                                    
                                    {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                                        <div className="mb-4">
                                            <details className="group border border-outline-variant/30 rounded-lg bg-surface-container-highest/20 cursor-pointer overflow-hidden">
                                                <summary className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-highest/40 transition-colors">
                                                    <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                                                    📄 Context Used ({msg.sources.length})
                                                    <span className="material-symbols-outlined ml-auto text-on-surface-variant group-open:rotate-180 transition-transform">expand_more</span>
                                                </summary>
                                                <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
                                                    {msg.sources.map((source, i) => (
                                                        <div key={i} className="bg-surface-container p-3 rounded-lg border border-outline-variant/20">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold text-sm text-on-surface">{source}</span>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Similarity: {msg.metadata?.confidence || 85}%</span>
                                                            </div>
                                                            <p className="text-xs text-on-surface-variant italic">"{msg.metadata?.context_preview || 'General knowledge used.'}"</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        </div>
                                    )}

                                    <div className={`${msg.role === 'ai' ? 'prose prose-invert max-w-none' : ''} text-body-lg leading-relaxed text-on-surface`}>
                                        {msg.role === 'user' ? (
                                            <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                                        ) : !msg.content && loading && idx === messages.length - 1 ? (
                                            <div className="flex items-center gap-1 h-6">
                                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                            </div>
                                        ) : (
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={MarkdownComponents}
                                            >
                                                {msg.content.replace(/^[-=]{3,}\s*$/gm, '')}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                    
                                    {msg.role === 'ai' && msg.metadata && (
                                        <div className="mt-6 pt-4 border-t border-outline-variant/20">

                                            
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    title="Helpful"
                                                    onClick={() => setLikedIndexes(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors ${likedIndexes[idx] ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-primary'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]" style={likedIndexes[idx] ? { fontVariationSettings: "'FILL' 1" } : {}}>thumb_up</span>
                                                </button>
                                                <button 
                                                    title="Not Helpful"
                                                    onClick={() => setDislikedIndexes(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors ${dislikedIndexes[idx] ? 'text-error bg-error/10' : 'text-on-surface-variant hover:text-error'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]" style={dislikedIndexes[idx] ? { fontVariationSettings: "'FILL' 1" } : {}}>thumb_down</span>
                                                </button>
                                                <button 
                                                    title="Copy"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(msg.content.replace(/^[-=]{3,}\s*$/gm, ''))
                                                        setCopiedIndex(idx)
                                                        setTimeout(() => setCopiedIndex(null), 2000)
                                                    }}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors text-on-surface-variant hover:text-primary"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">{copiedIndex === idx ? 'check' : 'content_copy'}</span>
                                                </button>
                                                <button 
                                                    title="Read Aloud"
                                                    onClick={() => {
                                                        if (window.speechSynthesis.speaking) {
                                                            window.speechSynthesis.cancel();
                                                        } else {
                                                            const utterance = new SpeechSynthesisUtterance(msg.content.replace(/[#*`_=-]/g, ''));
                                                            window.speechSynthesis.speak(utterance);
                                                        }
                                                    }}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors text-on-surface-variant hover:text-primary"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">volume_up</span>
                                                </button>
                                                <button title="Regenerate" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors text-on-surface-variant hover:text-primary ml-auto">
                                                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Chat Input Section */}
            <div className="p-6 pt-0 w-full max-w-[1000px] mx-auto z-10">
                {messages.length > 0 && document.getElementById('chat-header-actions') && createPortal(
                    <div className="relative">
                        <button 
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="bg-surface-container-low hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface-variant px-4 py-2 rounded-lg text-[13px] font-bold flex items-center gap-1.5 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span> Export
                        </button>
                        
                        {showExportMenu && (
                            <div className="absolute top-full mt-2 right-0 w-40 bg-surface-container-high border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                                <button onClick={exportAsPDF} className="w-full text-left px-4 py-2.5 text-[13px] text-on-surface hover:bg-surface-container-highest hover:text-primary transition-colors flex items-center gap-2 border-b border-outline-variant/10">
                                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span> PDF
                                </button>
                                <button onClick={exportAsCSV} className="w-full text-left px-4 py-2.5 text-[13px] text-on-surface hover:bg-surface-container-highest hover:text-primary transition-colors flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">table_chart</span> CSV
                                </button>
                            </div>
                        )}
                    </div>,
                    document.getElementById('chat-header-actions')
                )}
                <div className="glass-panel rounded-2xl p-2 flex items-center gap-2 shadow-2xl relative z-10">
                    <input 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-body-lg px-4 py-3 placeholder:text-on-surface-variant/40 outline-none" 
                        placeholder={`Ask a question...`} 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
                        disabled={loading}
                    />
                    <div className="flex items-center gap-2 pr-2">
                        <button 
                            title="Voice Input"
                            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-error/20 text-error' : 'text-on-surface-variant hover:text-primary hover:bg-primary/10'}`}
                            onClick={toggleVoiceInput}
                        >
                            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>mic</span>
                        </button>
                        {loading ? (
                            <button 
                                title="Stop Generating"
                                className="bg-surface-container-highest text-on-surface-variant px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-error/20 hover:text-error transition-all shadow-lg"
                                onClick={handleStop}
                            >
                                <span>Stop</span>
                                <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                            </button>
                        ) : (
                            <button 
                                title="Send Message"
                                className="accent-gradient text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleSend}
                                disabled={!input.trim()}
                            >
                                <span>Send</span>
                                <span className="material-symbols-outlined text-[18px]">send</span>
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-center text-[11px] text-on-surface-variant/40 mt-3 font-label-md">
                    AI may produce inaccurate information about people, places, or facts.
                </p>
            </div>
        </div>
    )
}
