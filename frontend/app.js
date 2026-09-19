// Substitua pelas credenciais públicas do seu projeto Supabase
const SUPABASE_URL = "https://ascbykhqzteferxdjpvr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzY2J5a2hxenRlZmVyeGRqcHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NjUyOTAsImV4cCI6MjEwNTM0MTI5MH0.rp9iyKlyk3Zwv6RSIbLnskg8Qwkd_JFQSIZ8nuEFwKo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements: Autenticação
const secaoLogin = document.getElementById('secao-login');
const authFormTitle = document.getElementById('auth-form-title');
const btnLoginGoogle = document.getElementById('btn-login-google');
const formLogin = document.getElementById('form-login');
const loginEmail = document.getElementById('login-email');
const loginSenha = document.getElementById('login-senha');
const btnLogin = document.getElementById('btn-login');
const btnToggleAuth = document.getElementById('btn-toggle-auth');

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
const btnNotasExercicio = document.getElementById('btn-notas-exercicio');
const btnGravar = document.getElementById('btn-gravar');
const btnGravarLabel = document.getElementById('btn-gravar-label');
const gravadorTimer = document.getElementById('gravador-timer');
const gravadorStatus = document.getElementById('gravador-status');
const listaMinhasGravacoes = document.getElementById('lista-minhas-gravacoes');
const contadorGravacoes = document.getElementById('contador-gravacoes');

// DOM Elements: Modal de Confirmação de Exclusão
const modalConfirmacao = document.getElementById('modal-confirmacao');
const modalMensagem = document.getElementById('modal-mensagem');
const btnModalCancelar = document.getElementById('btn-modal-cancelar');
const btnModalConfirmar = document.getElementById('btn-modal-confirmar');

// DOM Elements: Modal Global de Alerta
const modalAlerta = document.getElementById('modal-alerta');
const modalAlertaIcone = document.getElementById('modal-alerta-icone');
const modalAlertaTitulo = document.getElementById('modal-alerta-titulo');
const modalAlertaMensagem = document.getElementById('modal-alerta-mensagem');
const btnModalAlertaFechar = document.getElementById('btn-modal-alerta-fechar');

// DOM Elements: Modal de Notas de Áudio
const modalNotas = document.getElementById('modal-notas');
const modalNotaId = document.getElementById('modal-nota-id');
const modalNotaTextoCompleto = document.getElementById('modal-nota-texto-completo');
const btnOuvirTtsModal = document.getElementById('btn-ouvir-tts-modal');
const btnFecharModalNotas = document.getElementById('btn-fechar-modal-notas');
const painelAdminGravarNota = document.getElementById('painel-admin-gravar-nota');
const btnGravarNota = document.getElementById('btn-gravar-nota');
const btnGravarNotaLabel = document.getElementById('btn-gravar-nota-label');
const timerNota = document.getElementById('timer-nota');
const statusGravacaoNota = document.getElementById('status-gravacao-nota');
const listaNotasAudio = document.getElementById('lista-notas-audio');

// Estado da Aplicação
let sessaoAtual = null;
let perfilAtual = 'USER';
let textosMemoria = [];
let textoAtivoExercicio = null;
let textoAtivoModalNotas = null;
let textosJaCarregados = false;
let modoCriacaoConta = false;

// Estado do Gravador (Exercícios)
let mediaRecorder = null;
let audioChunks = [];
let gravando = false;
let timerInterval = null;
let segundosGravados = 0;

// Estado do Gravador (Notas de Admin)
let mediaRecorderNota = null;
let audioChunksNota = [];
let gravandoNota = false;
let timerIntervalNota = null;
let segundosNota = 0;

// Callback de Exclusão
let acaoExclusaoPendente = null;

// --- MODAL DE ALERTA GLOBAL ---

function exibirAlerta(titulo, mensagem, tipo = 'info') {
  modalAlertaTitulo.innerText = titulo;
  modalAlertaMensagem.innerText = mensagem;
  modalAlertaIcone.className = 'modal-icone';

  if (tipo === 'sucesso') {
    modalAlertaIcone.classList.add('icone-sucesso');
    modalAlertaIcone.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `;
  } else if (tipo === 'erro') {
    modalAlertaIcone.classList.add('icone-perigo');
    modalAlertaIcone.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;
  } else {
    modalAlertaIcone.classList.add('icone-info');
    modalAlertaIcone.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
  }

  modalAlerta.showModal();
}

btnModalAlertaFechar.addEventListener('click', () => {
  modalAlerta.close();
});

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

// Login Social com Google OAuth
btnLoginGoogle.addEventListener('click', async () => {
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (err) {
    exibirAlerta("Erreur Google", err.message, "erro");
  }
});

// Alternância entre Login e Cadastro Manual
btnToggleAuth.addEventListener('click', () => {
  modoCriacaoConta = !modoCriacaoConta;
  if (modoCriacaoConta) {
    authFormTitle.innerText = "Créer un compte";
    btnLogin.innerText = "S'inscrire";
    btnToggleAuth.innerText = "Déjà un compte ? Se connecter";
  } else {
    authFormTitle.innerText = "Connexion";
    btnLogin.innerText = "Se connecter";
    btnToggleAuth.innerText = "Pas encore de compte ? S'inscrire";
  }
});

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginSenha.value;

  btnLogin.disabled = true;
  btnLogin.innerText = "Chargement...";

  try {
    if (modoCriacaoConta) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;

      if (data.session) {
        await aplicarSessao(data.session);
      } else {
        exibirAlerta(
          "Confirmation Requise",
          "Compte créé ! Vous avez reçu un message de Supabase Auth par email. Veuillez cliquer sur le lien de confirmation avant de pouvoir vous connecter au système.",
          "sucesso"
        );
        btnToggleAuth.click();
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          exibirAlerta(
            "Email Non Confirmé",
            "Votre compte n'est pas encore activé. Veuillez vérifier votre boîte de réception et confirmer le message envoyé par Supabase Auth.",
            "info"
          );
        } else if (error.message.includes("Invalid login credentials")) {
          exibirAlerta(
            "Erreur d'authentification",
            "Identifiants incorrects. Veuillez vérifier votre adresse email et votre mot de passe.",
            "erro"
          );
        } else {
          exibirAlerta("Erreur de connexion", error.message, "erro");
        }
      }
    }
  } catch (error) {
    exibirAlerta("Erreur", error.message, "erro");
  } finally {
    btnLogin.disabled = false;
    btnLogin.innerText = modoCriacaoConta ? "S'inscrire" : "Se connecter";
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
      <div class="item-acoes">
        <button class="btn-tocar" onclick="tocarAudioBiblioteca('${item.id}', this)">▶ Écouter</button>
        <button class="btn-secundario" onclick="abrirModalNotas('${item.id}')">💬 Notes</button>
      </div>
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
  btnNotasExercicio.disabled = false;
  btnGravar.disabled = false;

  document.querySelectorAll('.item-exercicio-nav').forEach(el => {
    el.classList.toggle('active', el.querySelector('.nav-id').innerText === `#ID ${item.id}`);
  });

  await carregarGravacoesUsuario(item.id);
}

btnNotasExercicio.addEventListener('click', () => {
  if (textoAtivoExercicio) {
    abrirModalNotas(textoAtivoExercicio.id);
  }
});

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
    exibirAlerta("Erreur", "Impossible de lire l'audio de référence.", "erro");
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
    exibirAlerta("Erreur", "Impossible de lire l'audio.", "erro");
  } finally {
    btnElement.innerText = original;
    btnElement.disabled = false;
  }
}

// --- MODAL DE NOTAS ---

async function abrirModalNotas(id) {
  const item = textosMemoria.find(t => String(t.id) === String(id));
  if (!item) return;

  textoAtivoModalNotas = item;
  modalNotaId.innerText = `#ID ${item.id}`;
  modalNotaTextoCompleto.innerText = item.texto;

  if (perfilAtual === 'ADMIN') {
    painelAdminGravarNota.classList.remove('hidden');
  } else {
    painelAdminGravarNota.classList.add('hidden');
  }

  await carregarNotasTexto(item.id);
  modalNotas.showModal();
}

btnOuvirTtsModal.addEventListener('click', async () => {
  if (!textoAtivoModalNotas || !sessaoAtual) return;
  const original = btnOuvirTtsModal.innerText;
  btnOuvirTtsModal.innerText = "⏳ Génération...";
  btnOuvirTtsModal.disabled = true;

  try {
    const res = await fetch(`/api/tocar?id=${textoAtivoModalNotas.id}`, {
      headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
    });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioPlayer.src = url;
    await audioPlayer.play();
  } catch (e) {
    exibirAlerta("Erreur", "Impossible de lire l'audio de référence.", "erro");
  } finally {
    btnOuvirTtsModal.innerText = original;
    btnOuvirTtsModal.disabled = false;
  }
});

function fecharModalNotas() {
  if (gravandoNota) pararGravacaoNota();
  modalNotas.close();
}

btnFecharModalNotas.addEventListener('click', fecharModalNotas);

async function carregarNotasTexto(textoId) {
  if (!sessaoAtual) return;
  listaNotasAudio.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem;">Chargement des notes...</li>';

  try {
    const res = await fetch(`/api/textos/${textoId}/notas`, {
      headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
    });
    const dados = await res.json();
    renderizarListaNotas(dados.notas || []);
  } catch (e) {
    listaNotasAudio.innerHTML = '<li style="color: #ef4444; font-size: 0.85rem;">Erreur de chargement des notes.</li>';
  }
}

function renderizarListaNotas(notas) {
  listaNotasAudio.innerHTML = '';

  if (notas.length === 0) {
    listaNotasAudio.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem;">Aucun commentaire pour ce texte.</li>';
    return;
  }

  notas.forEach((n, index) => {
    const dataFormatada = new Date(n.created_at).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const li = document.createElement('li');
    li.className = 'item-gravacao';

    const botaoDelete = perfilAtual === 'ADMIN'
      ? `<button class="btn-deletar" title="Supprimer la note" onclick="solicitarExclusaoNota('${n.id}')">&times;</button>`
      : '';

    li.innerHTML = `
      ${botaoDelete}
      <div class="item-gravacao-header">
        <span class="gravacao-badge">Commentaire #${notas.length - index}</span>
        <span class="gravacao-data">${dataFormatada}</span>
      </div>
      <audio controls preload="none" src="/api/textos/notas/${n.id}/audio"></audio>
    `;

    const audioElement = li.querySelector('audio');
    audioElement.addEventListener('play', async (e) => {
      if (audioElement.dataset.loaded) return;
      e.preventDefault();
      try {
        const res = await fetch(`/api/textos/notas/${n.id}/audio`, {
          headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
        });
        const blob = await res.blob();
        audioElement.src = URL.createObjectURL(blob);
        audioElement.dataset.loaded = "true";
        await audioElement.play();
      } catch (err) {
        exibirAlerta("Erreur", "Impossible de lire le commentaire audio.", "erro");
      }
    });

    listaNotasAudio.appendChild(li);
  });
}

btnGravarNota.addEventListener('click', async () => {
  if (!gravandoNota) {
    await iniciarGravacaoNota();
  } else {
    pararGravacaoNota();
  }
});

async function iniciarGravacaoNota() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    exibirAlerta("Erreur", "Microphone non disponible dans votre navigateur.", "erro");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderNota = new MediaRecorder(stream);
    audioChunksNota = [];

    mediaRecorderNota.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksNota.push(event.data);
    };

    mediaRecorderNota.onstop = async () => {
      const audioBlob = new Blob(audioChunksNota, { type: 'audio/webm' });
      await enviarNotaAoServidor(audioBlob);
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderNota.start();
    gravandoNota = true;
    segundosNota = 0;
    timerNota.innerText = "00:00";
    btnGravarNota.classList.add('gravando');
    btnGravarNotaLabel.innerText = "Arrêter la note";
    statusGravacaoNota.innerText = "Enregistrement du commentaire en cours...";

    timerIntervalNota = setInterval(() => {
      segundosNota++;
      const min = String(Math.floor(segundosNota / 60)).padStart(2, '0');
      const sec = String(segundosNota % 60).padStart(2, '0');
      timerNota.innerText = `${min}:${sec}`;
    }, 1000);

  } catch (err) {
    exibirAlerta("Erreur", "Accès au microphone refusé.", "erro");
  }
}

function pararGravacaoNota() {
  if (!mediaRecorderNota || !gravandoNota) return;
  mediaRecorderNota.stop();
  gravandoNota = false;
  clearInterval(timerIntervalNota);
  btnGravarNota.classList.remove('gravando');
  btnGravarNotaLabel.innerText = "Enregistrer une note";
  statusGravacaoNota.innerText = "Traitement et envoi de la note...";
}

async function enviarNotaAoServidor(audioBlob) {
  if (!textoAtivoModalNotas || !sessaoAtual) return;

  const formData = new FormData();
  formData.append('audio', audioBlob, `nota_${Date.now()}.webm`);

  try {
    const res = await fetch(`/api/textos/${textoAtivoModalNotas.id}/notas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessaoAtual.access_token}`
      },
      body: formData
    });

    if (res.ok) {
      statusGravacaoNota.innerText = "Note enregistrée avec succès !";
      await carregarNotasTexto(textoAtivoModalNotas.id);
    } else {
      statusGravacaoNota.innerText = "Erreur lors de l'enregistrement de la note.";
    }
  } catch (e) {
    statusGravacaoNota.innerText = "Erreur réseau avec le serveur.";
  }
}

function solicitarExclusaoNota(notaId) {
  abrirModalConfirmacao("Voulez-vous supprimer définitivement ce commentaire audio ?", async () => {
    try {
      const res = await fetch(`/api/textos/notas/${notaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
      });
      if (res.ok && textoAtivoModalNotas) {
        await carregarNotasTexto(textoAtivoModalNotas.id);
      }
    } catch (e) {
      exibirAlerta("Erreur", "Erreur lors de la suppression de la note.", "erro");
    }
  });
}

// --- GRAVADOR DE VOZ (PRATIQUE) ---

btnGravar.addEventListener('click', async () => {
  if (!gravando) {
    await iniciarGravacao();
  } else {
    pararGravacao();
  }
});

async function iniciarGravacao() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    exibirAlerta("Erreur", "Votre navigateur ne supporte pas l'enregistrement audio direct.", "erro");
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
    exibirAlerta("Erreur", "Accès au microphone refusé ou non disponible.", "erro");
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
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
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
        exibirAlerta("Erreur", "Impossible de lire votre enregistrement.", "erro");
      }
    });

    listaMinhasGravacoes.appendChild(li);
  });
}

// --- MODAL DE CONFIRMAÇÃO ---

function abrirModalConfirmacao(mensagem, callback) {
  modalMensagem.innerText = mensagem;
  acaoExclusaoPendente = callback;
  modalConfirmacao.showModal();
}

function fecharModalConfirmacao() {
  acaoExclusaoPendente = null;
  modalConfirmacao.close();
}

btnModalCancelar.addEventListener('click', fecharModalConfirmacao);

btnModalConfirmar.addEventListener('click', async () => {
  if (acaoExclusaoPendente) {
    btnModalConfirmar.disabled = true;
    btnModalConfirmar.innerText = "Suppression...";
    await acaoExclusaoPendente();
    btnModalConfirmar.disabled = false;
    btnModalConfirmar.innerText = "Supprimer";
    fecharModalConfirmacao();
  }
});

function solicitarExclusaoTexto(id) {
  abrirModalConfirmacao(`Voulez-vous supprimer définitivement le texte #${id} ? Les enregistrements et notes associés seront également détruits.`, async () => {
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
          btnNotasExercicio.disabled = true;
          btnGravar.disabled = true;
        }
      }
    } catch (e) {
      exibirAlerta("Erreur", "Erreur lors de la suppression.", "erro");
    }
  });
}

function solicitarExclusaoGravacao(gravacaoId) {
  abrirModalConfirmacao("Voulez-vous supprimer définitivement cet enregistrement audio ?", async () => {
    try {
      const res = await fetch(`/api/exercicios/gravacoes/${gravacaoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessaoAtual.access_token}` }
      });
      if (res.ok && textoAtivoExercicio) {
        await carregarGravacoesUsuario(textoAtivoExercicio.id);
      }
    } catch (e) {
      exibirAlerta("Erreur", "Erreur lors de la suppression de l'enregistrement.", "erro");
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
      exibirAlerta("Accès Refusé", "Seuls les administrateurs peuvent enregistrer des textes.", "erro");
    }
  } catch (err) {
    exibirAlerta("Erreur Réseau", "Erreur de connexion avec le serveur.", "erro");
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
