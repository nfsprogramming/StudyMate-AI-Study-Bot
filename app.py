import streamlit as st
import os
import PyPDF2
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
import google.generativeai as genai

st.set_page_config(page_title="StudyMate with Gemini", layout="wide")

# Configure Gemini
gemini_key = st.sidebar.text_input("🔑 Enter your Gemini API Key", type="password")
if gemini_key:
    genai.configure(api_key=gemini_key)

uploaded_file = st.file_uploader("Upload a PDF", type=["pdf"])

if uploaded_file and gemini_key:
    # Extract text
    pdf_reader = PyPDF2.PdfReader(uploaded_file)
    raw_text = ""
    for page in pdf_reader.pages:
        raw_text += page.extract_text()

    # Split into chunks
    text_splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(raw_text)

    # Embeddings (offline)
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vectorstore = FAISS.from_texts(chunks, embeddings)

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    user_question = st.text_input("Ask a question about your PDF:")

    if user_question:
        # Retrieve relevant chunks
        docs = vectorstore.similarity_search(user_question, k=3)
        context = " ".join([doc.page_content for doc in docs])

        # Use Gemini to generate answer from prompt
        prompt = f"Use the following context to answer the question.\n\nContext:\n{context}\n\nQuestion: {user_question}\nAnswer:"

        model = genai.GenerativeModel("gemini-1.5-flash")  # or gemini-1.5-pro
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.0)
        )

        answer_text = response.text

        st.session_state.chat_history.append((user_question, answer_text))

        for q, a in st.session_state.chat_history:
            st.markdown(f"**You:** {q}")
            st.markdown(f"**StudyMate:** {a}")
else:
    st.info("👆 Upload a PDF and enter your Gemini API key to begin.")
