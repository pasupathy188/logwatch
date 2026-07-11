FROM python:3.10-slim

RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs supervisor && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ai-service/requirements.txt /app/ai-requirements.txt
RUN pip install --no-cache-dir -r /app/ai-requirements.txt

COPY backend/package*.json /app/
RUN npm install --only=production

COPY . .

# Train the AI model during build
RUN python ai-service/train.py

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 5000
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]