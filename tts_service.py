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
    """
    Sintetiza o texto em áudio WAV com cabeçalho RIFF completo
    e devolve os bytes brutos em memória diretamente do stdout.
    """
    model = Path(model_path)
    if not model.exists():
        raise FileNotFoundError(f"Modelo não encontrado em: {model}")

    # O segredo é '--output_file', '-' que força a inclusão do header WAV no stdout
    comando = [
        "piper",
        "--model", str(model),
        "--length_scale", str(length_scale),
        "--sentence_silence", str(sentence_silence),
        "--output_file", "-"
    ]

    process = subprocess.run(
        comando,
        input=texto.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False
    )

    if process.returncode != 0:
        erro_msg = process.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(f"Erro no Piper (código {process.returncode}): {erro_msg}")

    return process.stdout
