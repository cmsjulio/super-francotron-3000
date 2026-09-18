from pathlib import Path
import subprocess

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL = BASE_DIR / "fr_FR-siwis-medium.onnx"


def sintetizar_audio_bytes(
    texto: str,
    model_path: Path = DEFAULT_MODEL,
    length_scale: float = 1.2,
    sentence_silence: float = 0.6,
) -> bytes:
    """Sintetiza o texto em áudio WAV e devolve os bytes brutos em memória."""
    model = Path(model_path)
    if not model.exists():
        raise FileNotFoundError(f"Modelo não encontrado em: {model}")

    # Ao omitir --output_file, o piper cospe o stream WAV direto no stdout
    comando = [
        "piper",
        "--model",
        str(model),
        "--length_scale",
        str(length_scale),
        "--sentence_silence",
        str(sentence_silence),
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

    return process.stdout
