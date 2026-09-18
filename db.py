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
    dados = carregar_todos()
    ids_existentes = [int(k) for k in dados.keys() if k.isdigit()]
    proximo_id = str(max(ids_existentes) + 1 if ids_existentes else 1)

    dados[proximo_id] = texto.strip()

    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)

    return proximo_id


def deletar_texto_por_id(texto_id: str) -> bool:
    dados = carregar_todos()
    chave = str(texto_id)
    if chave in dados:
        del dados[chave]
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(dados, f, ensure_ascii=False, indent=2)
        return True
    return False
