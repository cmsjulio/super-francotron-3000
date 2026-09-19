// Substitua pelas credenciais públicas do seu projeto Supabase
const SUPABASE_URL = "https://ascbykhqzteferxdjpvr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzY2J5a2hxenRlZmVyeGRqcHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NjUyOTAsImV4cCI6MjEwNTM0MTI5MH0.rp9iyKlyk3Zwv6RSIbLnskg8Qwkd_JFQSIZ8nuEFwKo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements: Autenticação
const secaoLogin = document.getElementById('secao-login');
const formLogin = document.getElementById('form-login');
const loginEmail = document.getElementById('login-email');
const loginSenha = document.getElementById('login-senha');

const authInfo = document.getElementById('auth-info');
const userEmailSpan = document.getElementById('user-email');
const userBadge = document.getElementById('user-badge');
const btnLogout = document.getElementById('btn-logout');
const appPainel = document.getElementById('app-painel');

// DOM Elements: Abas
const botoesAbas = document.querySelectorAll('.tab-btn');
const conteudosAbas = document.querySelectorAll('.conteudo-aba');

// DOM Elements: Biblioteca (Aba 1)
const secaoAdmin = document.getElementById('secao-admin');
const formTexto = document.getElementById('form-texto');
const textoInput = document.getElementById('texto-input');
const btnSalvar = document.getElementById('btn-salvar');
const listaTextos = document.getElementById('lista-textos');
const audioPlayer = document.getElementById('audio-player');
const playerLabel = document.getElementById('player-label');

// DOM Elements: Exercícios (Aba 2)
const listaExercicioTextos = document.getElementById('lista-exercicio-textos');
const exercicioIdBadge = document.getElementById('exercicio-id-badge');
const exercicioTextoDisplay = document.getElementById('exercicio-texto-display');
const btnOuvirTtsExercicio = document.getElementById('btn-ouvir-tts-exercicio');
const btnGravar = document.getElementById('btn-gravar');
const btnGravarLabel = document.getElementById('btn-gravar-label');
const gravadorTimer = document.getElementById('gravador-timer');
const gravadorStatus = document.getElementById('gravador-status');
const listaMinhasGravacoes = document.getElementById('lista-minhas-gravacoes');
const contadorGravacoes = document.getElementById('contador-gravacoes');

// DOM Elements: Modal
const modal = document.getElementById('modal-confirmacao');
const modalMensagem = document.getElementById('modal-mensagem');
const btnModalCancelar = document.getElementById('btn-modal-cancelar');
const btnModalConfirmar = document.getElementById('btn-modal-confirmar');

// Estado da Aplicação
let sessaoAtual = null;
let perfilAtual = 'USER';
let textosMemoria = [];
let textoAtivoExercicio = null;
let textosJaCarregados = false;

// Estado do Gravador (MediaRecorder)
let mediaRecorder = null;
let audioChunks = [];
let gravando = false;
let timerInterval = null;
let segundosGravados = 0;

// Estado de Exclusão no Modal
let acaoExclusaoPendente = null;

// --- INICIALIZAÇÃO DE SESSÃO ---

async function verificarSessao() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    await aplicarSessao(data.session);
  } else {
    exibirLogin();
  }
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    textosJaCarregados = false;
    exibirLogin();
    return;
  }

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

// --- GERENCIAMENTO DE ABAS ---

botoesAbas.forEach(btn => {
  btn.addEventListener('click', () => {
    const alvo = btn.getAttribute('data-tab');
    botoesAbas.forEach(b => b.classList.remove('active'));
    conteudosAbas.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(alvo).classList.add('active');

    if (alvo === 'aba-exercicios' && textosMemoria.length > 0 && !textoAtivoExercicio) {
      selecionarTextoParaExercicio(textosMemoria[0].id);
    }
  });
});

// --- CARREGAMENTO DE TEXTOS ---

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
      listaTextos.innerHTML = `<li style="color: #ef4444;">Erreur: ${errJson.detail || 'Non autorisé.'}</li>`;
      return;
    }

    const dados = await res.json();
    perfilAtual = dados.user_role || 'USER';
    textosMemoria = dados.textos || [];

    if (perfilAtual === 'ADMIN') {
      userBadge.innerText = 'ADMINISTRATEUR';
      userBadge.classList.add('admin');
      secaoAdmin.classList.remove('hidden');
    } else {
      userBadge.innerText = 'ÉLÈVE';
      userBadge.classList.remove('admin');
      secaoAdmin.classList.add('hidden');
    }

    renderizarBiblioteca(textosMemoria);
    renderizarMenuExercicios(textosMemoria);
    textosJaCarregados = true;
  } catch (err) {
    if (!textosJaCarregados) {
      listaTextos.innerHTML = '<li style="color: #ef4444;">Erreur de connexion avec le serveur.</li>';
    }
  }
}

function renderizarBiblioteca(itens) {
  listaTextos.innerHTML = '';

  if (itens.length === 0) {
    listaTextos.innerHTML = '<li style="color: var(--text-muted);">Aucun texte enregistré.</li>';
    return;
  }

  itens.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'item-texto';

    const botaoDeleteHtml = perfilAtual === 'ADMIN' 
      ? `<button class="btn-deletar" title="Supprimer" onclick="solicitarExclusaoTexto('${item.id}')">&times;</button>`
      : '';

    li.innerHTML = `
      ${botaoDeleteHtml}
      <div class="item-cabecalho">
        <span class="item-id">#ID ${item.id}</span>
      </div>
      <div class="item-corpo">${escapeHtml(item.texto)}</div>
      <button class="btn-tocar" onclick="tocarAudioBiblioteca('${item.id}', this)">▶ Écouter</button>
    `;

    listaTextos.appendChild(li);
  });
}

function renderizarMenuExercicios(itens) {
  listaExercicioTextos.innerHTML = '';

  if (itens.length === 0) {
    listaExercicioTextos.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem;">Aucun texte.</li>';
    return;
  }

  itens.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'item-exercicio-nav';
    if (textoAtivoExercicio && textoAtivoExercicio.id === item.id) {
      li.classList.add('active');
    }

    li.onclick = () => selecionarTextoParaExercicio(item.id);
    li.innerHTML = `
      <span class="nav-id">#ID ${item.id}</span>
      <p class="nav-snippet">${escapeHtml(item.texto)}</p>
    `;

    listaExercicioTextos.appendChild(li);
  });
}

async function selecionarTextoParaExercicio(id) {
  const item = textosMemoria.find(t => String(t.id) === String(id));
  if (!item) return;

  textoAtivoExercicio = item;
  exercicioIdBadge.innerText = `#ID ${item.id}`;
  exercicioTextoDisplay.innerText = item.texto;
  btnOuvirTtsExercicio.disabled = false;
  btnGravar.disabled = false;

  document.querySelectorAll('.item-exercicio-nav').forEach(el => {
    el.classList.toggle('active', el.querySelector('.nav-id').innerText === `#ID ${item.id}`);
  });

  await carregarGravacoesUsuario(item.id);
}

btnOuvirTtsExercicio.addEventListener('click', async () => {
  if (!textoAtivoExercicio || !sessaoAtual) return;
  const original = btnOuvirTtsExercicio.innerText;
  btnOuvirTtsExercicio.innerText = "⏳ Génération...";
  btnOuvirTtsExercicio.disabled = true;

  try {
    const res = await fetch(`/api/tocar?id=${textoAtivoExercicio.id}`, {
      headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
    });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    await audioPlayer.play();
  } catch (e) {
    alert("Impossible de lire l'audio de référence.");
  } finally {
    btnOuvirTtsExercicio.innerText = original;
    btnOuvirTtsExercicio.disabled = false;
  }
});

async function tocarAudioBiblioteca(id, btnElement) {
  if (!sessaoAtual) return;

  const original = btnElement.innerText;
  btnElement.innerText = '⏳ Génération...';
  btnElement.disabled = true;

  playerLabel.innerText = `Lecture du texte #${id}...`;

  try {
    const res = await fetch(`/api/tocar?id=${id}`, {
      headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
    });

    if (!res.ok) throw new Error();

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    await audioPlayer.play();
  } catch (e) {
    alert("Impossible de lire l'audio.");
  } finally {
    btnElement.innerText = original;
    btnElement.disabled = false;
  }
}

// --- GRAVADOR DE VOZ (MICROFONE) ---

btnGravar.addEventListener('click', async () => {
  if (!gravando) {
    await iniciarGravacao();
  } else {
    pararGravacao();
  }
});

async function iniciarGravacao() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Votre navigateur ne supporte pas l'enregistrement audio direct.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await enviarGravacaoAoServidor(audioBlob);
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    gravando = true;
    segundosGravados = 0;
    gravadorTimer.innerText = "00:00";
    btnGravar.classList.add('gravando');
    btnGravarLabel.innerText = "Arrêter l'enregistrement";
    gravadorStatus.innerText = "Enregistrement en cours... Parlez clairement.";

    timerInterval = setInterval(() => {
      segundosGravados++;
      const min = String(Math.floor(segundosGravados / 60)).padStart(2, '0');
      const sec = String(segundosGravados % 60).padStart(2, '0');
      gravadorTimer.innerText = `${min}:${sec}`;
    }, 1000);

  } catch (err) {
    alert("Accès au microphone refusé ou non disponible.");
  }
}

function pararGravacao() {
  if (!mediaRecorder || !gravando) return;
  mediaRecorder.stop();
  gravando = false;
  clearInterval(timerInterval);
  btnGravar.classList.remove('gravando');
  btnGravarLabel.innerText = "Commencer l'enregistrement";
  gravadorStatus.innerText = "Envoi et traitement en cours...";
}

async function enviarGravacaoAoServidor(audioBlob) {
  if (!textoAtivoExercicio || !sessaoAtual) return;

  const formData = new FormData();
  formData.append('audio', audioBlob, `gravacao_${Date.now()}.webm`);

  try {
    const res = await fetch(`/api/exercicios/gravacoes?texto_id=${textoAtivoExercicio.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessaoAtual.access_token}`
      },
      body: formData
    });

    if (res.ok) {
      gravadorStatus.innerText = "Enregistrement sauvegardé avec succès !";
      await carregarGravacoesUsuario(textoAtivoExercicio.id);
    } else {
      gravadorStatus.innerText = "Erreur lors de l'enregistrement.";
    }
  } catch (e) {
    gravadorStatus.innerText = "Erreur réseau avec le serveur.";
  }
}

// --- HISTÓRICO DE GRAVAÇÕES DO USUÁRIO ---

async function carregarGravacoesUsuario(textoId) {
  if (!sessaoAtual) return;
  listaMinhasGravacoes.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem;">Chargement...</li>';

  try {
    const res = await fetch(`/api/exercicios/gravacoes?texto_id=${textoId}`, {
      headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
    });
    const dados = await res.json();
    const gravacoes = dados.gravacoes || [];
    contadorGravacoes.innerText = `${gravacoes.length} enregistrement(s)`;
    renderizarHistoricoGravacoes(gravacoes);
  } catch (e) {
    listaMinhasGravacoes.innerHTML = '<li style="color: #ef4444; font-size: 0.85rem;">Erreur de chargement.</li>';
  }
}

function renderizarHistoricoGravacoes(gravacoes) {
  listaMinhasGravacoes.innerHTML = '';

  if (gravacoes.length === 0) {
    listaMinhasGravacoes.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem;">Aucune tentative enregistrée pour ce texte.</li>';
    return;
  }

  gravacoes.forEach((g, index) => {
    const dataFormatada = new Date(g.created_at).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const li = document.createElement('li');
    li.className = 'item-gravacao';
    li.innerHTML = `
      <button class="btn-deletar" title="Supprimer" onclick="solicitarExclusaoGravacao('${g.id}')">&times;</button>
      <div class="item-gravacao-header">
        <span class="gravacao-badge">Tentative #${gravacoes.length - index}</span>
        <span class="gravacao-data">${dataFormatada}</span>
      </div>
      <audio controls preload="none" src="/api/exercicios/gravacoes/${g.id}/audio"></audio>
    `;

    const audioElement = li.querySelector('audio');
    audioElement.addEventListener('play', async (e) => {
      if (audioElement.dataset.loaded) return;
      e.preventDefault();
      try {
        const res = await fetch(`/api/exercicios/gravacoes/${g.id}/audio`, {
          headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
        });
        const blob = await res.blob();
        audioElement.src = URL.createObjectURL(blob);
        audioElement.dataset.loaded = "true";
        await audioElement.play();
      } catch (err) {
        alert("Impossible de lire votre enregistrement.");
      }
    });

    listaMinhasGravacoes.appendChild(li);
  });
}

// --- MODAL DE CONFIRMAÇÃO ---

function abrirModal(mensagem, callback) {
  modalMensagem.innerText = mensagem;
  acaoExclusaoPendente = callback;
  modal.showModal();
}

function fecharModal() {
  acaoExclusaoPendente = null;
  modal.close();
}

btnModalCancelar.addEventListener('click', fecharModal);

btnModalConfirmar.addEventListener('click', async () => {
  if (acaoExclusaoPendente) {
    btnModalConfirmar.disabled = true;
    btnModalConfirmar.innerText = "Suppression...";
    await acaoExclusaoPendente();
    btnModalConfirmar.disabled = false;
    btnModalConfirmar.innerText = "Supprimer";
    fecharModal();
  }
});

function solicitarExclusaoTexto(id) {
  abrirModal(`Voulez-vous supprimer définitivement le texte #${id} ? Les enregistrements associés seront également détruits.`, async () => {
    try {
      const res = await fetch(`/api/textos?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
      });
      if (res.ok) {
        textosJaCarregados = false;
        await carregarTextos();
        if (textoAtivoExercicio && String(textoAtivoExercicio.id) === String(id)) {
          textoAtivoExercicio = null;
          exercicioIdBadge.innerText = "#ID --";
          exercicioTextoDisplay.innerText = "Sélectionnez un texte pour commencer.";
          listaMinhasGravacoes.innerHTML = '';
          btnOuvirTtsExercicio.disabled = true;
          btnGravar.disabled = true;
        }
      }
    } catch (e) {
      alert("Erreur lors de la suppression.");
    }
  });
}

function solicitarExclusaoGravacao(gravacaoId) {
  abrirModal("Voulez-vous supprimer définitivement cet enregistrement audio ?", async () => {
    try {
      const res = await fetch(`/api/exercicios/gravacoes/${gravacaoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
      });
      if (res.ok && textoAtivoExercicio) {
        await carregarGravacoesUsuario(textoAtivoExercicio.id);
      }
    } catch (e) {
      alert("Erreur lors de la suppression de l'enregistrement.");
    }
  });
}

// Cadastro de Texto (ADMINISTRATEUR)
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
      textosJaCarregados = false;
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

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

verificarSessao();
