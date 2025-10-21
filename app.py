import streamlit as st
import os
import PyPDF2
from langchain.text_splitters import CharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import google.generativeai as genai

st.set_page_config(page_title="StudyMate with Gemini", layout="wide")

# --- Sidebar for API key ---
gemini_key = st.sidebar.text_input("🔑 Enter your Gemini API Key", type="password")
if gemini_key:
    genai.configure(api_key=gemini_key)

uploaded_file = st.file_uploader("📄 Upload a PDF", type=["pdf"])

if uploaded_file and gemini_key:
    # --- Extract text from PDF ---
    pdf_reader = PyPDF2.PdfReader(uploaded_file)
    raw_text = ""
    for page in pdf_reader.pages:
        text = page.extract_text()
        if text:
            raw_text += text

    if not raw_text.strip():
        st.error("❌ No readable text found in the PDF. Please upload a text-based PDF.")
    else:
        # --- Split text into chunks ---
        text_splitter = CharacterTextSplitter(
            separator="\n",
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        chunks = text_splitter.split_text(raw_text)

        # --- Create embeddings and vectorstore ---
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        vectorstore = FAISS.from_texts(chunks, embeddings)

        if "chat_history" not in st.session_state:
            st.session_state.chat_history = []

        # --- User input ---
        user_question = st.text_input("💬 Ask a question about your PDF:")

        if user_question:
            # Retrieve relevant chunks
            docs = vectorstore.similarity_search(user_question, k=3)
            context = " ".join([doc.page_content for doc in docs])

            # --- Generate response using Gemini ---
            prompt = f"""
            You are StudyMate, an AI assistant that answers questions about a document.
            Use the following context to answer clearly and accurately.

            Context:
            {context}

            Question: {user_question}

            Answer:
            """

            try:
                model = genai.GenerativeModel("gemini-1.5-flash")  # You can switch to "gemini-1.5-pro"
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(temperature=0.0)
                )
                answer_text = response.text
            except Exception as e:
                st.error(f"⚠️ Error generating response: {e}")
                answer_text = ""

            # --- Display chat history ---
            if answer_text:
                st.session_state.chat_history.append((user_question, answer_text))
                for q, a in st.session_state.chat_history:
                    st.markdown(f"**🧑 You:** {q}")
                    st.markdown(f"**🤖 StudyMate:** {a}")

else:
    st.info("👆 Upload a PDF and enter your Gemini API key to begin.")
