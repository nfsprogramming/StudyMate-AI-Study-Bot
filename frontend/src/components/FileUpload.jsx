import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

export default function FileUpload({ onUploadSuccess }) {
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadStatus, setUploadStatus] = useState(null) // 'success', 'error', null
    const [currentFile, setCurrentFile] = useState('')

    const onDrop = useCallback(async (acceptedFiles) => {
        for (const file of acceptedFiles) {
            setCurrentFile(file.name)
            setUploading(true)
            setUploadProgress(0)
            setUploadStatus(null)

            const formData = new FormData()
            formData.append('file', file)

            try {
                const response = await axios.post('/api/upload', formData, {
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        setUploadProgress(percentCompleted)
                    }
                })

                if (response.data.success) {
                    setUploadStatus('success')
                    onUploadSuccess(response.data.filename)

                    // Reset after 2 seconds
                    setTimeout(() => {
                        setUploading(false)
                        setUploadProgress(0)
                        setUploadStatus(null)
                        setCurrentFile('')
                    }, 2000)
                }
            } catch (error) {
                console.error('Upload error:', error)
                setUploadStatus('error')

                // Reset after 3 seconds
                setTimeout(() => {
                    setUploading(false)
                    setUploadProgress(0)
                    setUploadStatus(null)
                    setCurrentFile('')
                }, 3000)
            }
        }
    }, [onUploadSuccess])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 
            'application/pdf': ['.pdf'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        disabled: uploading
    })

    return (
        <div {...getRootProps()} className={`mt-2 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group bg-surface-container-low ${isDragActive ? 'border-primary bg-primary/20' : 'border-primary/40 hover:border-primary/60'}`}>
            <input {...getInputProps()} />

            {!uploading && !uploadStatus && (
                <>
                    <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>cloud_upload</span>
                    <p className="text-center text-on-surface-variant font-medium text-body-md">
                        {isDragActive ? 'Drop files here' : 'Drag & drop PDFs or Images'}
                    </p>
                    <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-widest">or click to browse</p>
                </>
            )}

            {uploading && (
                <div className="flex flex-col items-center gap-2 w-full">
                    <span className="material-symbols-outlined text-primary animate-spin">sync</span>
                    <p className="text-body-md text-on-surface-variant text-center w-full truncate">Uploading {currentFile}...</p>
                    <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                    <p className="text-primary font-bold">{uploadProgress}%</p>
                </div>
            )}

            {uploadStatus === 'success' && (
                <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-primary scale-110">check_circle</span>
                    <p className="text-body-md text-on-surface">Upload successful!</p>
                </div>
            )}

            {uploadStatus === 'error' && (
                <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-error">error</span>
                    <p className="text-body-md text-error">Upload failed</p>
                </div>
            )}
        </div>
    )
}
