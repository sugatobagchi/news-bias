import os
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer

app = FastAPI()

MODEL_ID = "sugatobagchi/smolified-news-bias-detector"

print("Loading tokenizer and model into CPU memory...")
# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

# Load model explicitly for CPU to prevent memory fragmentation
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID, device_map="cpu", torch_dtype=torch.float32
)
print("Model loaded successfully!")


class RequestBody(BaseModel):
    text: str


@app.post("/analyze")
def analyze_text(request: RequestBody):
    # The exact system prompt from the Smolify model card
    system_prompt = "You are an expert media analyst specializing in Indian and global news. Analyze the input text for political bias, emotional language, and narrative manipulation, providing consistent scores on a 1-10 scale."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.text},
    ]

    # 1. Apply the chat template manually
    prompt_text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    # 2. THE CRITICAL GEMMA 3 FIX: Strip the <bos> token
    if prompt_text.startswith("<bos>"):
        prompt_text = prompt_text[5:]

    # 3. Convert text to tensor format
    inputs = tokenizer(prompt_text, return_tensors="pt").to(model.device)

    # 4. Generate the response with explicit parameters to silence warnings
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=500,
            temperature=0.1,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    # 5. Strip the original prompt from the output tensor so we only return the JSON
    input_length = inputs.input_ids.shape[1]
    generated_tokens = outputs[0][input_length:]

    # Decode the final JSON string
    result_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)

    return {"analysis": result_text}


@app.get("/")
def read_root():
    return {"status": "Online", "model": "news-bias-smolify", "version": "1.3"}
