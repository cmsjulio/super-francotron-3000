import json
from pathlib import Path
from typing import Dict, Optional

DB_PATH = Path(__file__).resolve().parent / "db.json"


def carregar_todos() -> Dict[str, str]:
    if not DB_PATH.exists():
        return {}
    with open(DB_PATH, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def obter_texto_por_id(texto_id: str) -> Optional[str]:
    dados = carregar_todos()
    return dados.get(str(texto_id))


def salvar_novo_texto(texto: str) -> str:
    """Gera um novo ID numérico sequencial e salva o texto no db.json."""
    dados = carregar_todos()

    # Gera próximo ID sequencial
    ids_existentes = [int(k) for k in dados.keys() if k.isdigit()]
    proximo_id = str(max(ids_existentes) + 1 if ids_existentes else 1)

    dados[proximo_id] = texto.strip()

    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    return proximo_id
