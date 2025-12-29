
import streamlit as st
import os
import PyPDF2
import torch
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

# --- Page Config ---
st.set_page_config(
    page_title="StudyMate AI",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Custom CSS for Aesthetics ---
st.markdown("""
    <style>
    /* Global Font - Force Apply to Everything */
    html, body, [class*="css"], .stApp, .stMarkdown, .stText, .stTitle, .stHeader, .stsubheader, .stSidebar, .stButton, .stTextInput, .stSelectbox, div[data-testid="stSidebar"] {
        font-family: 'Courier New', Courier, monospace !important;
    }

    /* Main Background */
    .stApp {
        background-color: #000000;
        color: #D4AF37; /* Gold */
    }

    /* Input Fields */
    .stTextInput > div > div > input {
        background-color: #0f0f0f;
        color: #D4AF37;
        border: 1px solid #D4AF37;
        border-radius: 5px;
    }

    /* Chat Messages */
    .stChatMessage {
        background-color: #0f0f0f;
        border: 1px solid #996515; /* Darker Gold border */
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 10px;
    }

    /* Buttons */
    .stButton > button {
        border-radius: 5px;
        background: linear-gradient(to bottom, #FFD700 0%, #B8860B 100%);
        color: #000000;
        font-weight: bold;
        border: 1px solid #FFD700;
        font-family: 'Courier New', Courier, monospace !important;
    }
    
    /* Headings and Markdown */
    h1, h2, h3, h4, strong {
        color: #FFD700 !important;
    }
    
    .stMarkdown {
        color: #F5DEB3 !important; /* Wheat color for smoother reading against black */
    }
    </style>
""", unsafe_allow_html=True)

# --- Caching Resources ---

@st.cache_resource
def load_embedding_model():
    """Load and cache the embedding model."""
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

@st.cache_resource(show_spinner="Downloading & Loading AI Model... This only happens once!")
def load_llm_pipeline():
    """Load and cache the local LLM pipeline."""
    model_id = "google/flan-t5-base" # Downgraded to Base (250MB) to prevent Cloud Crash
    # Using explicit 'cpu' if no CUDA to avoid half-loading states on weak GPUs
    device = 0 if torch.cuda.is_available() else -1
    
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_id)
    
    pipe = pipeline(
        "text2text-generation",
        model=model,
        tokenizer=tokenizer,
        device=device,
        max_length=512,
        truncation=True, # Ensure input is truncated to model max length
        model_kwargs={
            "temperature": 0.3,
            "repetition_penalty": 1.5,
            "no_repeat_ngram_size": 3,
            "early_stopping": True
        }
    )
    return pipe

# --- Helper Functions ---

def extract_text_from_pdf(pdf_file):
    pdf_reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text
    return text

def chunk_text(text, chunk_size=500, chunk_overlap=100): # Increased size for better context
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - chunk_overlap
    return chunks

class SimpleVectorStore:
    def __init__(self, chunks, embeddings):
        self.chunks = chunks
        self.dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(self.dimension)
        self.index.add(embeddings)

    def search(self, query_embedding, k=3): # Increased k to retrieve more chunks
        distances, indices = self.index.search(np.array([query_embedding]), k)
        return [self.chunks[i] for i in indices[0]]

# --- Main Application ---

def main():
    st.title("📚 StudyMate AI")
    st.markdown("### Your Personal Offline Study Assistant")

    # Initialize Session State
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []
    if "vector_store" not in st.session_state:
        st.session_state.vector_store = None
    if "current_file" not in st.session_state:
        st.session_state.current_file = None

    # Sidebar
    with st.sidebar:
        st.header("📂 Document Center")
        uploaded_file = st.file_uploader("Upload a PDF", type=["pdf"])
        
        if st.button("Clear Chat History", key="clear_chat"):
            st.session_state.chat_history = []
            st.rerun()
            
        st.markdown("---")

    # Process Uploaded File
    if uploaded_file:
        if st.session_state.current_file != uploaded_file.name:
            with st.spinner("🔄 Processing PDF... This runs once per file."):
                # 1. Extract Text
                raw_text = extract_text_from_pdf(uploaded_file)
                
                if not raw_text.strip():
                    st.error("❌ No readable text found. Try another PDF.")
                else:
                    # 2. Chunk Text
                    chunks = chunk_text(raw_text)
                    
                    # 3. Embed Text
                    embedder = load_embedding_model()
                    embeddings = embedder.encode(chunks)
                    
                    # 4. Create Vector Store
                    st.session_state.vector_store = SimpleVectorStore(chunks, embeddings)
                    st.session_state.current_file = uploaded_file.name
                    st.session_state.chat_history = []
                    st.success("✅ PDF Processed! Ready to chat.")

    # Chat Interface
    if st.session_state.vector_store:
        # Display Chat History
        for role, message in st.session_state.chat_history:
            with st.chat_message(role):
                st.markdown(message)

        # User Input
        if user_question := st.chat_input("Ask a question about your document..."):
            st.session_state.chat_history.append(("user", user_question))
            with st.chat_message("user"):
                st.markdown(user_question)

            # Generate Answer
            with st.chat_message("assistant"):
                status_placeholder = st.empty()
                status_placeholder.markdown("🔍 Searching document...")
                
                try:
                    # 1. Embed Query
                    embedder = load_embedding_model()
                    query_embedding = embedder.encode(user_question)
                    
                    # 2. Retrieve Context
                    relevant_chunks = st.session_state.vector_store.search(query_embedding, k=3)
                    context = "\n\n".join(relevant_chunks)
                    
                    status_placeholder.markdown("🤖 Generating answer...")
                    
                    # 3. Generate with LLM
                    llm_pipe = load_llm_pipeline()
                    
                    # Improved Prompt
                    prompt = f"""Use the following pieces of context to answer the question at the end.
Context:
{context}

Question: {user_question}
Answer:"""
                    
                    # Explicit generation call
                    output = llm_pipe(prompt, max_new_tokens=200, do_sample=True)
                    response = output[0]['generated_text']
                    
                    status_placeholder.empty()
                    st.markdown(response)
                    st.session_state.chat_history.append(("assistant", response))
                except Exception as e:
                    status_placeholder.empty()
                    st.error(f"Error during generation: {e}")

    elif not uploaded_file:
        st.info("👈 Please upload a PDF to get started.")

if __name__ == "__main__":
    main()
