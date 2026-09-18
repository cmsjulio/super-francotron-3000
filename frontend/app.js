const form = document.getElementById('form-texto');
const textoInput = document.getElementById('texto-input');
const btnSalvar = document.getElementById('btn-salvar');
const btnAtualizar = document.getElementById('btn-atualizar');
const listaTextos = document.getElementById('lista-textos');
const audioPlayer = document.getElementById('audio-player');
const playerLabel = document.getElementById('player-label');

// Carregar lista de textos da API
async function carregarTextos() {
  listaTextos.innerHTML = '<li style="color: var(--text-muted);">Chargement...</li>';
  try {
    const res = await fetch('/api/textos');
    const dados = await res.json();
    renderizarLista(dados);
  } catch (err) {
    listaTextos.innerHTML = '<li style="color: red;">Erreur de connexion avec le serveur.</li>';
  }
}

// Renderiza a lista no HTML
function renderizarLista(itens) {
  listaTextos.innerHTML = '';
  const chaves = Object.keys(itens).sort((a, b) => Number(b) - Number(a));

  if (chaves.length === 0) {
    listaTextos.innerHTML = '<li style="color: var(--text-muted);">Aucun texte enregistré.</li>';
    return;
  }

  chaves.forEach((id) => {
    const texto = itens[id];
    const li = document.createElement('li');
    li.className = 'item-texto';

    li.innerHTML = `
      <div class="item-cabecalho">
        <span class="item-id">#ID ${id}</span>
      </div>
      <div class="item-corpo">${escapeHtml(texto)}</div>
      <button onclick="tocarAudio('${id}', this)">▶ Écouter</button>
    `;

    listaTextos.appendChild(li);
  });
}

// Reproduz o áudio solicitando ao endpoint do Piper
async function tocarAudio(id, btnElement) {
  const textoOriginal = btnElement.innerText;
  btnElement.innerText = '⏳ Génération...';
  btnElement.disabled = true;

  playerLabel.innerText = `Lecture de l'ID #${id}...`;
  audioPlayer.src = `/api/tocar?id=${id}`;

  try {
    await audioPlayer.play();
  } catch (e) {
    console.error("Lecture bloquée ou erreur :", e);
  } finally {
    btnElement.innerText = textoOriginal;
    btnElement.disabled = false;
  }
}

// Submeter novo texto
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const texto = textoInput.value.trim();
  if (!texto) return;

  btnSalvar.disabled = true;
  btnSalvar.innerText = 'Enregistrement...';

  try {
    const res = await fetch('/api/textos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    });

    if (res.ok) {
      textoInput.value = '';
      await carregarTextos();
    } else {
      alert('Erreur lors de la sauvegarde du texte.');
    }
  } catch (err) {
    alert('Erreur de connexion.');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerText = 'Ajouter à la bibliothèque';
  }
});

btnAtualizar.addEventListener('click', carregarTextos);

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Inicialização
carregarTextos();
