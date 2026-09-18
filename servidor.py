from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from pathlib import Path
import urllib.parse

import db
import tts_service

PORTA = 8000
FRONTEND_DIR = Path(__file__).resolve().parent / "frontend"


class SuperFrancotronHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        caminho = parsed_url.path
        params = urllib.parse.parse_qs(parsed_url.query)
        texto_id = params.get("id", [None])[0]

        if caminho == "/api/textos":
            dados = db.carregar_todos()
            self._responder_json(200, dados)
            return

        elif caminho == "/api/tocar":
            if not texto_id:
                self._responder_json(
                    400, {"erro": "Parâmetro 'id' é obrigatório."}
                )
                return

            texto = db.obter_texto_por_id(texto_id)
            if not texto:
                self._responder_json(
                    404, {"erro": f"ID {texto_id} não encontrado."}
                )
                return

            caminho_audio = (
                tts_service.DEFAULT_OUTPUT_DIR / f"texto_de_id-{texto_id}.wav"
            )
            if not caminho_audio.exists():
                caminho_audio = tts_service.sintetizar_audio(
                    texto=texto, texto_id=texto_id
                )

            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(caminho_audio.stat().st_size))
            self.end_headers()
            with open(caminho_audio, "rb") as f:
                self.wfile.write(f.read())
            return

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
            self.send_header(
                "Content-Length", str(arquivo_estatico.stat().st_size)
            )
            self.end_headers()
            with open(arquivo_estatico, "rb") as f:
                self.wfile.write(f.read())
            return

        self._responder_json(404, {"erro": "Arquivo ou rota não encontrada."})

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)

        if parsed_url.path == "/api/textos":
            tamanho = int(self.headers.get("Content-Length", 0))
            corpo_raw = self.rfile.read(tamanho).decode("utf-8")

            try:
                payload = json.loads(corpo_raw)
                texto = payload.get("texto", "").strip()
                if not texto:
                    self._responder_json(
                        400, {"erro": "O campo 'texto' não pode ser vazio."}
                    )
                    return

                novo_id = db.salvar_novo_texto(texto)
                self._responder_json(
                    201,
                    {
                        "status": "criado",
                        "id": novo_id,
                        "texto": texto,
                    },
                )
            except json.JSONDecodeError:
                self._responder_json(400, {"erro": "JSON inválido."})
            except Exception as e:
                self._responder_json(500, {"erro": str(e)})
            return

        self._responder_json(404, {"erro": "Rota não encontrada."})

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)
        texto_id = params.get("id", [None])[0]

        if parsed_url.path == "/api/textos":
            if not texto_id:
                self._responder_json(
                    400, {"erro": "Parâmetro 'id' é obrigatório."}
                )
                return

            removido = db.deletar_texto_por_id(texto_id)
            if not removido:
                self._responder_json(
                    404, {"erro": f"ID {texto_id} não encontrado."}
                )
                return

            arquivo_audio = (
                tts_service.DEFAULT_OUTPUT_DIR / f"texto_de_id-{texto_id}.wav"
            )
            if arquivo_audio.exists():
                try:
                    arquivo_audio.unlink()
                except OSError as e:
                    print(f"Aviso: falha ao apagar arquivo de áudio: {e}")

            self._responder_json(
                200,
                {
                    "status": "sucesso",
                    "mensagem": f"ID {texto_id} e arquivo associado foram removidos.",
                },
            )
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
    tts_service.DEFAULT_OUTPUT_DIR.mkdir(exist_ok=True)
    servidor = HTTPServer(("", PORTA), SuperFrancotronHandler)
    print(f"Super Francotron 3000 pronto em http://localhost:{PORTA}")
    servidor.serve_forever()
