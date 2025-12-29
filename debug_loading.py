
import sys
import time

print("--- DIAGNOSTIC START ---")
print(f"Python Version: {sys.version}")

try:
    import numpy
    print(f"Numpy Version: {numpy.__version__}")
except ImportError:
    print("Numpy not installed")

try:
    import torch
    print(f"Torch Version: {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
except ImportError:
    print("Torch not installed")

try:
    import transformers
    print(f"Transformers Version: {transformers.__version__}")
except ImportError:
    print("Transformers not installed")

print("\nAttempting to load model explicitly (with timeout simulation)...")
model_id = "MBZUAI/LaMini-Flan-T5-248M"

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

start_time = time.time()
print(f"Loading tokenizer for {model_id}...")
tokenizer = AutoTokenizer.from_pretrained(model_id)
print(f"Tokenizer loaded in {time.time() - start_time:.2f}s")

print(f"Loading model for {model_id}...")
start_time = time.time()
# Load only the configuration first to test connection
from transformers import AutoConfig
config = AutoConfig.from_pretrained(model_id)
print("Config loaded. Downloading/Loading weights...")

model = AutoModelForSeq2SeqLM.from_pretrained(model_id)
print(f"Model loaded in {time.time() - start_time:.2f}s")

print("--- DIAGNOSTIC END ---")
