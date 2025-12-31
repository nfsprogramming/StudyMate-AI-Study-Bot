import { FiDownload, FiTrash2 } from 'react-icons/fi'

export default function ChatHistory({ messages, onExport, onClear }) {
    if (messages.length === 0) return null

    return (
        <div className="chat-history-panel">
            <div className="history-header">
                <h3>💬 Chat History</h3>
                <div className="history-actions">
                    <button
                        className="icon-button"
                        onClick={onExport}
                        title="Export chat"
                    >
                        <FiDownload />
                    </button>
                    <button
                        className="icon-button danger"
                        onClick={onClear}
                        title="Clear history"
                    >
                        <FiTrash2 />
                    </button>
                </div>
            </div>
            <div className="history-count">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
            </div>
        </div>
    )
}
