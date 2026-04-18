# Use a lightweight Python image
FROM python:3.11-slim

WORKDIR /app

# Install PyTorch CPU explicitly (This saves ~2GB of image size vs the GPU version)
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the libraries
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# PRE-DOWNLOAD THE MODEL: This bakes the weights into the container
RUN python -c "from transformers import pipeline; pipeline('text-generation', model='sugatobagchi/smolified-news-bias-detector', device=-1)"

# Copy your server code
COPY app.py .

# Cloud Run expects the server to listen on port 8080 by default
ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]