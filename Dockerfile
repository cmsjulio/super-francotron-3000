# Imagem base leve com Python 3.12
FROM python:3.12-slim

# Instala dependências de sistema necessárias para o Piper e áudio
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instala o piper-tts globalmente
RUN pip install --no-cache-dir piper-tts --break-system-packages

WORKDIR /app

# Copia os arquivos do projeto
COPY tts_service.py .
COPY servidor.py .
COPY fr_FR-siwis-medium.onnx .
COPY fr_FR-siwis-medium.onnx.json .
COPY frontend/ ./frontend/

# Variável de porta usada pelas plataformas de nuvem (Render/Koyeb)
ENV PORT=8000
EXPOSE 8000

# Executa o servidor nativo
CMD ["python3", "servidor.py"]
