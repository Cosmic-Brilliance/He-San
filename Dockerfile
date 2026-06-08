# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Create a non-root user and group
RUN groupadd -r agiuser && useradd -r -g agiuser agiuser

# Install system dependencies
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker cache
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . /app/

# Ensure the non-root user owns the /app directory
RUN chown -R agiuser:agiuser /app

# Switch to the non-root user
USER agiuser

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variable
ENV UVICORN_CMD="uvicorn main:app --host 0.0.0.0 --port 8000"

# Run the application
CMD ["sh", "-c", "$UVICORN_CMD"]
