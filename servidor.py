import base64
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

import tts_service

PORTA = int(os.environ.get("PORT", 8000))
FRONTEND_DIR = Path(__file__).resolve().parent / "frontend"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def decodificar_jwt_payload(token: str) -> dict:
    try:
        partes = token.split(".")
        if len(partes) != 3:
            return {}
        payload_b64 = partes[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        dados_bytes = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        return json.loads(dados_bytes.decode("utf-8"))
    except Exception as e:
        print(f"[JWT] Erro ao decodificar: {e}")
        return {}


def requisicao_supabase(
    endpoint: str,
    metodo: str = "GET",
    dados: dict = None,
    headers_extras: dict = None
):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint.lstrip('/')}"
    req = urllib.request.Request(url, method=metodo)
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "SuperFrancotron/1.0")

    if headers_extras:
        for k, v in headers_extras.items():
            req.add_header(k, v)

    payload_bytes = None
    if dados is not None:
        payload_bytes = json.dumps(dados).encode("utf-8")

    try:
        with urllib.request.urlopen(req, data=payload_bytes) as resp:
            conteudo = resp.read().decode("utf-8")
            if conteudo:
                return json.loads(conteudo)
            return None
    except urllib.error.HTTPError as e:
        corpo_erro = e.read().decode("utf-8", errors="replace")
        print(f"[Supabase REST] Erro {e.code}: {corpo_erro}")
        raise RuntimeError(f"Erro Supabase ({e.code}): {corpo_erro}")


def obter_usuario_supabase(token: str):
    payload = decodificar_jwt_payload(token)
    if not payload:
        return None

    exp = payload.get("exp", 0)
    if time.time() > exp:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("User-Agent", "SuperFrancotron/1.0")

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        if payload.get("aud") == "authenticated":
            return {"id": user_id, "email": payload.get("email", "")}
        return None


def obter_perfil_usuario(user_id: str):
    url = f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=role"
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("User-Agent", "SuperFrancotron/1.0")

    try:
        with urllib.request.urlopen(req) as resp:
            registros = json.loads(resp.read().decode("utf-8"))
            if registros:
                return registros[0].get("role", "USER")
    except Exception as e:
        print(f"[Profiles] Erro ao obter perfil: {e}")

    return "USER"


class SuperFrancotronHandler(BaseHTTPRequestHandler):

    def _autenticar(self):
        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None, None

        token = auth_header.split(" ", 1)[1].strip()
        usuario = obter_usuario_supabase(token)
        if not usuario:
            return None, None

        role = obter_perfil_usuario(usuario["id"])
        return usuario, role

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        caminho = parsed_url.path
        params = urllib.parse.parse_qs(parsed_url.query)
        texto_id = params.get("id", [None])[0]

        # 1. API: Listar textos
        if caminho == "/api/textos":
            usuario, role = self._autenticar()
            if not usuario:
                self._responder_json(401, {"erro": "Não autorizado."})
                return

            try:
                textos = requisicao_supabase(
                    "textos?select=id,texto,created_at&order=id.desc"
                )
                self._responder_json(200, {"textos": textos or [], "user_role": role})
            except Exception as e:
                self._responder_json(500, {"erro": str(e)})
            return

        # 2. API: Tocar / Transmitir áudio binário
        elif caminho == "/api/tocar":
            usuario, _ = self._autenticar()
            if not usuario:
                self._responder_json(401, {"erro": "Não autorizado."})
                return

            if not texto_id:
                self._responder_json(400, {"erro": "Parâmetro 'id' obrigatório."})
                return

            try:
                registros = requisicao_supabase(
                    f"textos?id=eq.{texto_id}&select=id,texto,audio_blob"
                )
                if not registros:
                    self._responder_json(404, {"erro": "Texto não encontrado."})
                    return

                registro = registros[0]
                audio_dado = registro.get("audio_blob")

                audio_bytes = None
                if audio_dado:
                    # Converte formato hex do PostgreSQL
                    if isinstance(audio_dado, str):
                        if audio_dado.startswith("\\x"):
                            audio_bytes = bytes.fromhex(audio_dado[2:])
                        else:
                            try:
                                audio_bytes = bytes.fromhex(audio_dado)
                            except ValueError:
                                audio_bytes = base64.b64decode(audio_dado)

                # Se não havia áudio em cache ou veio corrompido sem cabeçalho WAV ('RIFF')
                if not audio_bytes or not audio_bytes.startswith(b"RIFF"):
                    audio_bytes = tts_service.sintetizar_audio_bytes(registro["texto"])
                    hex_payload = "\\x" + audio_bytes.hex()
                    requisicao_supabase(
                        f"textos?id=eq.{texto_id}",
                        metodo="PATCH",
                        dados={"audio_blob": hex_payload}
                    )

                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(audio_bytes)))
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()
                self.wfile.write(audio_bytes)
                return
            except Exception as e:
                print(f"[Erro /api/tocar] {e}")
                self._responder_json(500, {"erro": str(e)})
                return

        # 3. Servir arquivos estáticos do Frontend
        if caminho == "/" or caminho == "":
            caminho = "/index.html"

        arquivo_estatico = FRONTEND_DIR / caminho.lstrip("/")
        if (
            arquivo_estatico.resolve().is_relative_to(FRONTEND_DIR)
            and arquivo_estatico.exists()
            and arquivo_estatico.is_file()
        ):
            extensoes = {
                ".html": "text/html; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".js": "application/javascript; charset=utf-8",
            }
            content_type = extensoes.get(
                arquivo_estatico.suffix, "application/octet-stream"
            )

            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(arquivo_estatico.stat().st_size))
            self.end_headers()
            with open(arquivo_estatico, "rb") as f:
                self.wfile.write(f.read())
            return

        self._responder_json(404, {"erro": "Recurso não encontrado."})

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)

        if parsed_url.path == "/api/textos":
            usuario, role = self._autenticar()
            if not usuario:
                self._responder_json(401, {"erro": "Não autorizado."})
                return

            if role != "ADMIN":
                self._responder_json(
                    403, {"erro": "Permissão negada. Apenas ADMIN pode cadastrar."}
                )
                return

            tamanho = int(self.headers.get("Content-Length", 0))
            corpo = json.loads(self.rfile.read(tamanho).decode("utf-8"))
            texto = corpo.get("texto", "").strip()

            if not texto:
                self._responder_json(400, {"erro": "Texto vazio."})
                return

            try:
                novo = requisicao_supabase(
                    "textos",
                    metodo="POST",
                    dados={"texto": texto, "created_by": usuario["id"]},
                    headers_extras={"Prefer": "return=representation"}
                )
                self._responder_json(201, novo[0] if novo else {})
            except Exception as e:
                self._responder_json(500, {"erro": str(e)})
            return

        self._responder_json(404, {"erro": "Rota não encontrada."})

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)
        texto_id = params.get("id", [None])[0]

        if parsed_url.path == "/api/textos":
            usuario, role = self._autenticar()
            if not usuario:
                self._responder_json(401, {"erro": "Não autorizado."})
                return

            if role != "ADMIN":
                self._responder_json(
                    403, {"erro": "Permissão negada. Apenas ADMIN pode deletar."}
                )
                return

            if not texto_id:
                self._responder_json(400, {"erro": "Parâmetro 'id' obrigatório."})
                return

            try:
                requisicao_supabase(f"textos?id=eq.{texto_id}", metodo="DELETE")
                self._responder_json(200, {"status": "deletado", "id": texto_id})
            except Exception as e:
                self._responder_json(500, {"erro": str(e)})
            return

        self._responder_json(404, {"erro": "Rota não encontrada."})

    def _responder_json(self, status_code: int, payload: dict):
        corpo = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)


if __name__ == "__main__":
    FRONTEND_DIR.mkdir(exist_ok=True)
    servidor = HTTPServer(("", PORTA), SuperFrancotronHandler)
    print(f"Super Francotron 3000 online na porta {PORTA}")
    servidor.serve_forever()
