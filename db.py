import json
from pathlib import Path
from typing import Optional, Dict

DB_PATH = Path(__file__).resolve().parent / "db.json"

def carregar_todos() -> Dict[str, str]:
    """Lê o arquivo db.json e retorna o dicionário completo."""
    if not DB_PATH.exists():
        return {}
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def obter_texto_por_id(texto_id: str) -> Optional[str]:
    """Busca o texto referente ao ID fornecido."""
    dados = carregar_todos()
    return dados.get(str(texto_id))
