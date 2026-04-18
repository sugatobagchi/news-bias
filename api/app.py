import os
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()

print("Loading model into memory...")
pipe = pipeline(
    "text-generation",
    model="sugatobagchi/smolified-news-bias-detector",
)
print("Model loaded successfully!")


class RequestBody(BaseModel):
    text: str


@app.post("/analyze")
def analyze_text(request: RequestBody):
    prompt = f"Analyze for bias. Respond in JSON. Article:\n{request.text}\nAnalysis:"

    result = pipe(prompt, max_new_tokens=500, temperature=0.1)

    return {"analysis": result[0]["generated_text"]}
