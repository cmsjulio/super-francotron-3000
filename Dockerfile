# Imagem base leve com Python 3.12
FROM python:3.12-slim

# Instala ferramentas essenciais do sistema operacional
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instala o Piper TTS globalmente
RUN pip install --no-cache-dir piper-tts --break-system-packages

WORKDIR /app

# Baixa os arquivos do modelo neural em francês durante o build
RUN wget -q https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx && \
    wget -q https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json

# Copia os arquivos de código e a pasta do frontend
COPY tts_service.py .
COPY servidor.py .
COPY db.py .
COPY frontend/ ./frontend/

# Configurações de porta para serviços em nuvem (Render, Koyeb, etc.)
ENV PORT=8000
EXPOSE 8000

# Executa o servidor nativo em Python
CMD ["python3", "servidor.py"]
