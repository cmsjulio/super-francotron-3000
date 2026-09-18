// Substitua pelas credenciais públicas do seu projeto Supabase
const SUPABASE_URL = "https://ascbykhqzteferxdjpvr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzY2J5a2hxenRlZmVyeGRqcHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NjUyOTAsImV4cCI6MjEwNTM0MTI5MH0.rp9iyKlyk3Zwv6RSIbLnskg8Qwkd_JFQSIZ8nuEFwKo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos DOM
const secaoLogin = document.getElementById('secao-login');
const formLogin = document.getElementById('form-login');
const loginEmail = document.getElementById('login-email');
const loginSenha = document.getElementById('login-senha');

const authInfo = document.getElementById('auth-info');
const userEmailSpan = document.getElementById('user-email');
const userBadge = document.getElementById('user-badge');
const btnLogout = document.getElementById('btn-logout');

const appPainel = document.getElementById('app-painel');
const secaoAdmin = document.getElementById('secao-admin');
const formTexto = document.getElementById('form-texto');
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

let sessaoAtual = null;
let perfilAtual = 'USER';
let idEmReproducao = null;
let idParaExcluir = null;
let textosJaCarregados = false;

// Inicialização de Sessão
async function verificarSessao() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await aplicarSessao(data.session);
  } else {
    exibirLogin();
  }
}

// Ouve mudanças de estado sem recarregar desnecessariamente no foco de abas
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    textosJaCarregados = false;
    exibirLogin();
    return;
  }

  // Se o usuário for diferente ou a lista ainda não tiver sido carregada
  const usuarioMudou = !sessaoAtual || sessaoAtual.user.id !== session.user.id;
  sessaoAtual = session;

  if (usuarioMudou || !textosJaCarregados) {
    await aplicarSessao(session);
  }
});

function exibirLogin() {
  sessaoAtual = null;
  textosJaCarregados = false;
  secaoLogin.classList.remove('hidden');
  appPainel.classList.add('hidden');
  authInfo.classList.add('hidden');
}

async function aplicarSessao(session) {
  sessaoAtual = session;
  secaoLogin.classList.add('hidden');
  appPainel.classList.remove('hidden');
  authInfo.classList.remove('hidden');
  userEmailSpan.innerText = session.user.email;

  await carregarTextos();
}

// Manipulação do Login
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginSenha.value;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert(`Erreur de connexion : ${error.message}`);
  }
});

btnLogout.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  audioPlayer.pause();
  audioPlayer.src = '';
  textosJaCarregados = false;
});

// Buscar Textos no Servidor
async function carregarTextos() {
  if (!sessaoAtual) return;
  
  if (!textosJaCarregados) {
    listaTextos.innerHTML = '<li style="color: var(--text-muted);">Chargement...</li>';
  }

  try {
    const res = await fetch('/api/textos', {
      headers: {
        'Authorization': `Bearer ${sessaoAtual.access_token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      listaTextos.innerHTML = `<li style="color: #ef4444;">Erreur ${res.status}: ${errJson.detail || 'Non autorisé.'}</li>`;
      return;
    }

    const dados = await res.json();
    perfilAtual = dados.user_role || 'USER';

    userBadge.innerText = perfilAtual;
    if (perfilAtual === 'ADMIN') {
      userBadge.classList.add('admin');
      secaoAdmin.classList.remove('hidden');
    } else {
      userBadge.classList.remove('admin');
      secaoAdmin.classList.add('hidden');
    }

    renderizarLista(dados.textos || []);
    textosJaCarregados = true;
  } catch (err) {
    if (!textosJaCarregados) {
      listaTextos.innerHTML = '<li style="color: #ef4444;">Erreur de connexion avec le serveur.</li>';
    }
  }
}

function renderizarLista(itens) {
  listaTextos.innerHTML = '';

  if (itens.length === 0) {
    listaTextos.innerHTML = '<li style="color: var(--text-muted);">Aucun texte enregistré.</li>';
    return;
  }

  itens.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'item-texto';

    const botaoDeleteHtml = perfilAtual === 'ADMIN' 
      ? `<button class="btn-deletar" title="Supprimer" onclick="abrirModalExclusao('${item.id}')">&times;</button>`
      : '';

    li.innerHTML = `
      ${botaoDeleteHtml}
      <div class="item-cabecalho">
        <span class="item-id">#ID ${item.id}</span>
      </div>
      <div class="item-corpo">${escapeHtml(item.texto)}</div>
      <button class="btn-tocar" onclick="tocarAudio('${item.id}', this)">▶ Écouter</button>
    `;

    listaTextos.appendChild(li);
  });
}

// Reprodução do Áudio
async function tocarAudio(id, btnElement) {
  if (!sessaoAtual) return;

  const textoOriginal = btnElement.innerText;
  btnElement.innerText = '⏳ Génération...';
  btnElement.disabled = true;

  idEmReproducao = id;
  playerLabel.innerText = `Lecture du texte #${id}...`;

  try {
    const res = await fetch(`/api/tocar?id=${id}`, {
      headers: {
        'Authorization': `Bearer ${sessaoAtual.access_token}`
      }
    });

    if (!res.ok) throw new Error("Erreur de synthèse.");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    await audioPlayer.play();
  } catch (e) {
    alert("Impossible de lire l'audio.");
  } finally {
    btnElement.innerText = textoOriginal;
    btnElement.disabled = false;
  }
}

// Modal e Exclusão (Admin)
function abrirModalExclusao(id) {
  idParaExcluir = id;
  modalMensagem.innerText = `Voulez-vous vraiment supprimer le texte #${id} ? L'audio en base sera également supprimé.`;
  modal.showModal();
}

function fecharModal() {
  idParaExcluir = null;
  modal.close();
}

async function confirmarExclusao() {
  if (!idParaExcluir || !sessaoAtual) return;

  const id = idParaExcluir;
  btnModalConfirmar.disabled = true;
  btnModalConfirmar.innerText = 'Suppression...';

  try {
    const res = await fetch(`/api/textos?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessaoAtual.access_token}`
      }
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
    alert('Erreur de connexion.');
  } finally {
    btnModalConfirmar.disabled = false;
    btnModalConfirmar.innerText = 'Supprimer';
  }
}

btnModalCancelar.addEventListener('click', fecharModal);
btnModalConfirmar.addEventListener('click', confirmarExclusao);

// Cadastro de Novo Texto (Admin)
formTexto.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!sessaoAtual) return;

  const texto = textoInput.value.trim();
  if (!texto) return;

  btnSalvar.disabled = true;
  btnSalvar.innerText = 'Enregistrement...';

  try {
    const res = await fetch('/api/textos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessaoAtual.access_token}`
      },
      body: JSON.stringify({ texto }),
    });

    if (res.ok) {
      textoInput.value = '';
      await carregarTextos();
    } else {
      alert('Erreur lors de la sauvegarde (Permission refusée).');
    }
  } catch (err) {
    alert('Erreur de connexion.');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerText = 'Ajouter à la bibliothèque';
  }
});

btnAtualizar.addEventListener('click', () => {
  textosJaCarregados = false;
  carregarTextos();
});

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

verificarSessao();
