const form = document.getElementById('form-texto');
const textoInput = document.getElementById('texto-input');
const btnSalvar = document.getElementById('btn-salvar');
const btnAtualizar = document.getElementById('btn-atualizar');
const listaTextos = document.getElementById('lista-textos');
const audioPlayer = document.getElementById('audio-player');
const playerLabel = document.getElementById('player-label');

const modal = document.getElementById('modal-confirmacao');
const modalMensagem = document.getElementById('modal-mensagem');
const btnModalCancelar = document.getElementById('btn-modal-cancelar');
const btnModalConfirmar = document.getElementById('btn-modal-confirmar');

let idEmReproducao = null;
let idParaExcluir = null;

async function carregarTextos() {
  listaTextos.innerHTML = '<li style="color: var(--text-muted);">Chargement...</li>';
  try {
    const res = await fetch('/api/textos');
    const dados = await res.json();
    renderizarLista(dados);
  } catch (err) {
    listaTextos.innerHTML = '<li style="color: #ef4444;">Erreur de connexion avec le serveur.</li>';
  }
}

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
      <button class="btn-deletar" title="Supprimer" onclick="abrirModalExclusao('${id}')">&times;</button>
      <div class="item-cabecalho">
        <span class="item-id">#ID ${id}</span>
      </div>
      <div class="item-corpo">${escapeHtml(texto)}</div>
      <button class="btn-tocar" onclick="tocarAudio('${id}', this)">▶ Écouter</button>
    `;

    listaTextos.appendChild(li);
  });
}

async function tocarAudio(id, btnElement) {
  const textoOriginal = btnElement.innerText;
  btnElement.innerText = '⏳ Génération...';
  btnElement.disabled = true;

  idEmReproducao = id;
  playerLabel.innerText = `Lecture du texte #${id}...`;
  audioPlayer.src = `/api/tocar?id=${id}`;

  try {
    await audioPlayer.play();
  } catch (e) {
    console.error("Lecture bloquée ou échouée :", e);
  } finally {
    btnElement.innerText = textoOriginal;
    btnElement.disabled = false;
  }
}

function abrirModalExclusao(id) {
  idParaExcluir = id;
  modalMensagem.innerText = `Voulez-vous vraiment supprimer le texte #${id} ? Le fichier audio généré sur le serveur sera également détruit.`;
  modal.showModal();
}

function fecharModal() {
  idParaExcluir = null;
  modal.close();
}

async function confirmarExclusao() {
  if (!idParaExcluir) return;

  const id = idParaExcluir;
  btnModalConfirmar.disabled = true;
  btnModalConfirmar.innerText = 'Suppression...';

  try {
    const res = await fetch(`/api/textos?id=${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      if (idEmReproducao === id) {
        audioPlayer.pause();
        audioPlayer.src = '';
        playerLabel.innerText = 'Sélectionnez un texte ci-dessous :';
        idEmReproducao = null;
      }
      fecharModal();
      await carregarTextos();
    } else {
      alert('Erreur lors de la suppression.');
    }
  } catch (err) {
    alert('Erreur de connexion avec le serveur.');
  } finally {
    btnModalConfirmar.disabled = false;
    btnModalConfirmar.innerText = 'Supprimer';
  }
}

btnModalCancelar.addEventListener('click', fecharModal);
btnModalConfirmar.addEventListener('click', confirmarExclusao);

modal.addEventListener('click', (e) => {
  const rect = modal.getBoundingClientRect();
  const foraDoDialog = (
    e.clientX < rect.left ||
    e.clientX > rect.right ||
    e.clientY < rect.top ||
    e.clientY > rect.bottom
  );
  if (foraDoDialog) {
    fecharModal();
  }
});

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

carregarTextos();
