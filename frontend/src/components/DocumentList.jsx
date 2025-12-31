import { FiTrash2 } from 'react-icons/fi'
import axios from 'axios'

export default function DocumentList({ documents, onDelete }) {
    const handleDelete = async (filename) => {
        try {
            await axios.delete(`/api/documents/${encodeURIComponent(filename)}`)
            onDelete(filename)
        } catch (error) {
            console.error('Delete error:', error)
            alert('Error deleting document')
        }
    }

    if (!documents || documents.length === 0) return null

    return (
        <div className="document-list">
            <h3>📚 Loaded Documents</h3>
            {documents.map((doc) => {
                // Handle both string and object formats
                const filename = typeof doc === 'string' ? doc : doc.filename
                const chunks = typeof doc === 'object' ? doc.chunks : null

                return (
                    <div key={filename} className="document-item">
                        <div className="document-info">
                            <span className="document-name">{filename}</span>
                            {chunks && (
                                <span className="document-chunks">{chunks} chunks</span>
                            )}
                        </div>
                        <button
                            className="delete-button"
                            onClick={() => handleDelete(filename)}
                            title="Delete document"
                        >
                            <FiTrash2 />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
