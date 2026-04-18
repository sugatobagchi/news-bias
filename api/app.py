import os
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()

print("Loading model into memory...")
pipe = pipeline(
    "text-generation",
    model="sugatobagchi/smolified-news-bias-detector",
    device=-1,  # Forces CPU execution
)
print("Model loaded successfully!")


class RequestBody(BaseModel):
    text: str


@app.post("/analyze")
def analyze_text(request: RequestBody):
    # Use the exact system prompt from your fine-tuning dataset
    system_prompt = "You are an expert media analyst specializing in Indian and global news. You analyze raw text extracted from news articles or browser pages for political bias, emotional language, and narrative manipulation."

    # Format using the standard chat template array
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.text},
    ]

    # Generate the response
    result = pipe(
        messages,
        max_new_tokens=500,
        max_length=None,  # <-- This silences the warning in your Cloud Run logs
        temperature=0.1,
        return_full_text=False,  # <-- Crucial: Ensures the API only returns the JSON, not the prompt
    )

    return {"analysis": result[0]["generated_text"]}


@app.get("/")
def read_root():
    return {"status": "Online", "model": "news-bias-smolify", "version": "1.1"}
