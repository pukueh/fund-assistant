# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app/frontend-pro

# Install dependencies
COPY frontend-pro/package.json ./
# If package-lock.json exists, copy it too
# COPY frontend-pro/package-lock.json ./ 
RUN npm install

# Copy source and build
COPY frontend-pro/ ./
RUN npm run build

# Stage 2: Run Backend
FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend build artifacts to /app/frontend
# server.py expects frontend files in "frontend" directory
COPY --from=builder /app/frontend-pro/dist /app/frontend

# Copy backend code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/api/info')"

# Start server
CMD ["python", "server.py"]
