import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { FiUpload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
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
                const response = await axios.post('/api/upload-pdf', formData, {
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
        accept: { 'application/pdf': ['.pdf'] },
        disabled: uploading
    })

    return (
        <div className="file-upload">
            <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}>
                <input {...getInputProps()} />

                {!uploading && !uploadStatus && (
                    <>
                        <div className="upload-icon">
                            <FiUpload />
                        </div>
                        <p className="upload-text">
                            {isDragActive ? 'Drop PDFs here' : 'Drag & drop PDFs'}
                        </p>
                        <p className="upload-hint">or click to browse</p>
                    </>
                )}

                {uploading && (
                    <div className="upload-progress-container">
                        <div className="upload-icon uploading-icon">
                            <FiUpload className="spin" />
                        </div>
                        <p className="upload-text">Uploading {currentFile}...</p>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="upload-percentage">{uploadProgress}%</p>
                    </div>
                )}

                {uploadStatus === 'success' && (
                    <div className="upload-success">
                        <div className="upload-icon success-icon">
                            <FiCheckCircle />
                        </div>
                        <p className="upload-text">✅ Upload successful!</p>
                        <p className="upload-hint">{currentFile}</p>
                    </div>
                )}

                {uploadStatus === 'error' && (
                    <div className="upload-error">
                        <div className="upload-icon error-icon">
                            <FiAlertCircle />
                        </div>
                        <p className="upload-text">❌ Upload failed</p>
                        <p className="upload-hint">Please try again</p>
                    </div>
                )}
            </div>
        </div>
    )
}
