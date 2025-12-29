# StudyMate AI - Offline Study Assistant

StudyMate AI is a local, privacy-focused study assistant that allows you to chat with your PDF documents without needing an internet connection (after initial model download) or third-party API keys.

## Features

- **Offline Capability**: Uses local AI models (`MBZUAI/LaMini-Flan-T5-248M` and `all-MiniLM-L6-v2`) for generating answers and embeddings.
- **Privacy First**: Your documents and questions never leave your machine.
- **PDF Support**: Extract text, vectorize, and query any PDF document.
- **Chat History**: Keeps track of your conversation context.
- **Optimized UI**: Clean, dark-themed interface for focused studying.

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository_url>
   cd StudyMate-AI-Study-Bot
   ```

2. **Install Dependencies**:
   It is recommended to use a virtual environment.
   ```bash
   pip install -r requirements.txt
   ```

   *Note: PyTorch will be installed. If you have a dedicated GPU (NVIDIA), ensure you have the correct CUDA version enabled or install the specific Torch version from [pytorch.org](https://pytorch.org/). By default, it will run on CPU or what `accelerate` detects.*

## Usage

1. **Run the Application**:
   ```bash
   streamlit run app.py
   ```

2. **Upload a PDF**: Use the sidebar to upload your study material.
3. **Wait for Processing**: The app will process the PDF (this happens once per file).
4. **Chat**: Ask questions about the content of the PDF.

## Troubleshooting

- **First Run Slowness**: The first time you run the app or process a file, it needs to download the AI models from Hugging Face. This depends on your internet speed. Subsequent runs will be much faster as models are cached.
- **Memory Issues**: If you encounter memory errors, try processing smaller PDFs or ensures no other heavy applications are running. The selected model (LaMini-Flan-T5-248M) is lightweight (~250M params) and should run on most modern systems.

## Tech Stack

- **Streamlit**: Frontend UI.
- **LangChain**: LLM framework and RAG (Retrieval-Augmented Generation) logical.
- **FAISS**: Vector database for fast similarity search.
- **Hugging Face Transformers**: Local model inference.
