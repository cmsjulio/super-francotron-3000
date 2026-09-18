import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Módulos locais desacoplados
import db
import tts_service

PORTA = 8000

class SuperFrancotronHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)
        texto_id = params.get("id", [None])[0]

        # 1. Rota para gerar/obter metadados do áudio: /audio?id=1
        if parsed_url.path == "/gerar":
            if not texto_id:
                self._responder_json(400, {"erro": "Parâmetro 'id' é obrigatório."})
                return

            texto = db.obter_texto_por_id(texto_id)
            if not texto:
                self._responder_json(404, {"erro": f"ID {texto_id} não encontrado no banco de dados."})
                return

            try:
                # Chama a interface do Piper
                caminho_audio = tts_service.sintetizar_audio(texto=texto, texto_id=texto_id)

                self._responder_json(200, {
                    "status": "sucesso",
                    "id": texto_id,
                    "texto": texto,
                    "arquivo": caminho_audio.name,
                    "url_reproducao": f"/tocar?id={texto_id}"
                })
            except Exception as e:
                self._responder_json(500, {"erro": str(e)})
            return

        # 2. Rota para ouvir/transmitir o arquivo WAV diretamente: /tocar?id=1
        elif parsed_url.path == "/tocar":
            if not texto_id:
                self._responder_json(400, {"erro": "Parâmetro 'id' é obrigatório."})
                return

            texto = db.obter_texto_por_id(texto_id)
            if not texto:
                self._responder_json(404, {"erro": "Texto não cadastrado."})
                return

            caminho_audio = tts_service.DEFAULT_OUTPUT_DIR / f"texto_de_id-{texto_id}.wav"
            
            # Se ainda não existe fisicamente, sintetiza sob demanda
            if not caminho_audio.exists():
                caminho_audio = tts_service.sintetizar_audio(texto=texto, texto_id=texto_id)

            # Envia o arquivo de áudio binário
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(caminho_audio.stat().st_size))
            self.end_headers()

            with open(caminho_audio, "rb") as f:
                self.wfile.write(f.read())
            return

        # Rota padrão / 404
        self._responder_json(404, {"erro": "Rota não encontrada."})

    def _responder_json(self, status_code: int, payload: dict):
        corpo = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)


if __name__ == "__main__":
    servidor = HTTPServer(("", PORTA), SuperFrancotronHandler)
    print(f"Super Francotron 3000 online em http://localhost:{PORTA}")
    servidor.serve_forever()
