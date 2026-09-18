import asyncio
import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
import httpx
import jwt
from pydantic import BaseModel

import tts_service

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

app = FastAPI(title="Super Francotron 3000")
security = HTTPBearer()

# Semáforo assíncrono para limitar o consumo de CPU do Piper a 1 síntese simultânea
TTS_LOCK = asyncio.Lock()


async def supabase_request(
    endpoint: str, method: str = "GET", json_data: dict = None
):
    """Executa requisições REST assíncronas no Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/{endpoint.lstrip('/')}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "SuperFrancotron/2.0",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.request(
            method, url, headers=headers, json=json_data
        )
        if resp.is_error:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Erro Supabase: {resp.text}",
            )
        return resp.json() if resp.text else None


async def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(security),
):
    """Decodifica e valida o JWT enviado pelo frontend."""
    token = cred.credentials
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token sem identificador de usuário.",
            )

        profiles = await supabase_request(
            f"profiles?id=eq.{user_id}&select=role"
        )
        role = profiles[0]["role"] if profiles else "USER"
        return {"id": user_id, "role": role}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas ou sessão expirada.",
        )


class TextoInput(BaseModel):
    texto: str


# --- ENDPOINTS DA API ---


@app.get("/api/textos")
async def listar_textos(user: dict = Depends(get_current_user)):
    textos = await supabase_request(
        "textos?select=id,texto,created_at&order=id.desc"
    )
    return {"textos": textos or [], "user_role": user["role"]}


@app.post("/api/textos", status_code=status.HTTP_201_CREATED)
async def criar_texto(
    body: TextoInput, user: dict = Depends(get_current_user)
):
    if user["role"] != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem inserir textos.",
        )

    texto_limpo = body.texto.strip()
    if not texto_limpo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Texto não pode ser vazio.",
        )

    dados = {"texto": texto_limpo, "created_by": user["id"]}
    novo = await supabase_request("textos", method="POST", json_data=dados)
    return novo[0] if novo else {}


@app.delete("/api/textos")
async def deletar_texto(id: int, user: dict = Depends(get_current_user)):
    if user["role"] != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem deletar textos.",
        )

    await supabase_request(f"textos?id=eq.{id}", method="DELETE")
    return {"status": "deletado", "id": id}


@app.get("/api/tocar")
async def tocar_audio(id: int, user: dict = Depends(get_current_user)):
    registros = await supabase_request(
        f"textos?id=eq.{id}&select=id,texto,audio_blob"
    )
    if not registros:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Texto não encontrado."
        )

    registro = registros[0]
    audio_dado = registro.get("audio_blob")

    # Caso já exista em cache no Supabase
    if audio_dado:
        if isinstance(audio_dado, str):
            audio_bytes = bytes.fromhex(
                audio_dado[2:] if audio_dado.startswith("\\x") else audio_dado
            )
        else:
            audio_bytes = bytes(audio_dado)

        if audio_bytes.startswith(b"RIFF"):
            return Response(
                content=audio_bytes,
                media_type="audio/wav",
                headers={"Accept-Ranges": "bytes"},
            )

    # Caso precise sintetizar com Piper de forma não bloqueante
    async with TTS_LOCK:
        recheck = await supabase_request(
            f"textos?id=eq.{id}&select=audio_blob"
        )
        if recheck and recheck[0].get("audio_blob"):
            hex_val = recheck[0]["audio_blob"]
            audio_bytes = bytes.fromhex(
                hex_val[2:] if hex_val.startswith("\\x") else hex_val
            )
        else:
            # Executa a geração em thread pool do SO sem travar o loop do FastAPI
            audio_bytes = await asyncio.to_thread(
                tts_service.sintetizar_audio_bytes, registro["texto"]
            )
            hex_payload = "\\x" + audio_bytes.hex()
            await supabase_request(
                f"textos?id=eq.{id}",
                method="PATCH",
                json_data={"audio_blob": hex_payload},
            )

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={"Accept-Ranges": "bytes"},
    )


# Entrega dos arquivos estáticos do frontend
frontend_path = Path(__file__).resolve().parent / "frontend"
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
