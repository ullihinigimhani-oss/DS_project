# Python ML Service Dockerfile
FROM python:3.11-slim-bookworm

WORKDIR /app/ml-service

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy requirements first (for better caching)
COPY services/ai-symptom-service/ml-integration/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML scripts
COPY services/ai-symptom-service/ml-integration/symptom_analyzer.py .
COPY services/ai-symptom-service/ml-integration/train_model.py .
COPY services/ai-symptom-service/ml-integration/training_data ./training_data

# Create models/training directories
RUN mkdir -p models training_data

# Train model on startup if data is available
RUN python train_model.py || true

# Expose port
EXPOSE 5000

# Start the service
CMD ["python", "symptom_analyzer.py"]
