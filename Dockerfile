FROM python:3.12-slim

# Instala ferramentas essenciais do sistema operacional
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt --break-system-packages

# Baixa os modelos do Piper durante o build
RUN wget -q https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx && \
    wget -q https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json

# Copia o código e a interface estática
COPY tts_service.py .
COPY servidor.py .
COPY frontend/ ./frontend/

ENV PORT=8000
EXPOSE 8000

# Inicia o servidor Uvicorn escutando a porta dinâmica definida pelo ambiente
CMD ["sh", "-c", "uvicorn servidor:app --host 0.0.0.0 --port ${PORT}"]
