import subprocess

texto = '''"J'ai reçu un télégramme de l'asile : "Mère décédée. Enterrement demain. Sentiments distingués." Cela ne veut rien dire. C'était peut-être hier. L'asile de vieillards est à Marengo, à quatre-vingts kilomètres d'Alger. Je prendrai l'autobus à deux heures et j'arriverai dans l'après-midi. Ainsi, je pourrai veiller la mort et je rentrerai demain soir. J'ai demandé à mon patron deux jours de congé et il ne pouvait me les refuser avec une excuse pareille."'''
model_path = "fr_FR-siwis-medium.onnx"
output_file = "saida_frances.wav"

comando = [
    "piper",
    "--model", model_path,
    "--length_scale", "1.2",          # Velocidade (maior = mais lento)
    "--sentence_silence", "0.6",      # 0.6 segundos de pausa entre as frases
    "--output_file", output_file
]

process = subprocess.run(
    comando,
    input=texto.encode("utf-8"),
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    check=True
)

print(f"Áudio gerado com pausas ajustadas em {output_file}!")
