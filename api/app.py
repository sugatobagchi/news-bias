import os
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer

app = FastAPI()

MODEL_ID = "sugatobagchi/smolified-news-bias-detector"

print("Loading tokenizer and model into CPU memory...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

# REMOVED device_map="cpu" to prevent the 'accelerate' crash
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, torch_dtype=torch.float32)
print("Model loaded successfully!")


class RequestBody(BaseModel):
    text: str


@app.post("/analyze")
def analyze_text(request: RequestBody):
    system_prompt = "You are an expert media analyst specializing in Indian and global news. Analyze the input text for political bias, emotional language, and narrative manipulation, providing consistent scores on a 1-10 scale."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.text},
    ]

    prompt_text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    if prompt_text.startswith("<bos>"):
        prompt_text = prompt_text[5:]

    inputs = tokenizer(prompt_text, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=500,
            temperature=0.1,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    input_length = inputs.input_ids.shape[1]
    generated_tokens = outputs[0][input_length:]

    result_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)

    return {"analysis": result_text}


@app.get("/")
def read_root():
    return {"status": "Online", "model": "news-bias-smolify", "version": "1.4"}
