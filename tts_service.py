from pathlib import Path
import subprocess
from typing import Union

# Diretórios e caminhos padrão relativos ao arquivo do módulo
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL = BASE_DIR / "fr_FR-siwis-medium.onnx"
DEFAULT_OUTPUT_DIR = BASE_DIR / "audio_cache"


def sintetizar_audio(
    texto: str,
    texto_id: Union[int, str],
    output_dir: Union[str, Path] = DEFAULT_OUTPUT_DIR,
    model_path: Union[str, Path] = DEFAULT_MODEL,
    length_scale: float = 1.2,
    sentence_silence: float = 0.6,
) -> Path:
    """Sintetiza texto em áudio WAV usando Piper via subprocess.

    Retorna o caminho (Path) do arquivo gerado ou já existente.
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Nome determinístico baseado no ID
    arquivo_saida = out_dir / f"texto_de_id-{texto_id}.wav"

    # Se o áudio já foi gerado antes, retorna o caminho existente (cache local)
    if arquivo_saida.exists() and arquivo_saida.stat().st_size > 44:
        return arquivo_saida

    model = Path(model_path)
    if not model.exists():
        raise FileNotFoundError(f"Modelo não encontrado em: {model}")

    comando = [
        "piper",
        "--model",
        str(model),
        "--length_scale",
        str(length_scale),
        "--sentence_silence",
        str(sentence_silence),
        "--output_file",
        str(arquivo_saida),
    ]

    process = subprocess.run(
        comando,
        input=texto.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    if process.returncode != 0:
        erro_msg = process.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Erro na execução do Piper (código {process.returncode}): {erro_msg}"
        )

    return arquivo_saida
