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
        <div className="mt-2 flex flex-col gap-2 px-3">
            {documents.map((doc) => {
                const filename = typeof doc === 'string' ? doc : doc.filename || 'Unknown'

                if (!filename || filename === 'Unknown') return null;

                return (
                    <div key={filename} className="flex items-center justify-between p-3 bg-surface-container-highest/30 rounded-lg border border-outline-variant/20 hover:bg-surface-container-highest transition-colors group">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="material-symbols-outlined text-primary text-sm">picture_as_pdf</span>
                            <span className="truncate text-body-md" title={filename}>{filename}</span>
                        </div>
                        <button
                            className="text-on-surface-variant hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                            onClick={() => handleDelete(filename)}
                            title="Delete document"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
