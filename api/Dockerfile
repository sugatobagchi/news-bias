# Use a lightweight Python image
FROM python:3.11-slim

WORKDIR /app

# Install PyTorch CPU explicitly (This saves ~2GB of image size vs the GPU version)
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the libraries
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake full model snapshot into the image (Hub only at build time; optional HF_TOKEN for rate limits)
COPY download_model.py .
ENV MODEL_PATH=/app/model
RUN python download_model.py

# Copy server code after heavy layers so code edits don't re-download weights
COPY app.py .

# Cloud Run expects the server to listen on port 8080 by default
ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
