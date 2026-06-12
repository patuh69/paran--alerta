const modal = document.querySelector("#journalist-modal");
const articleForm = document.querySelector("#article-form");
const newsGrid = document.querySelector("#news-grid");
const formStatus = document.querySelector(".form-status");
const loginView = document.querySelector(".login-view");
const registerView = document.querySelector(".register-view");
const newsroomView = document.querySelector(".newsroom-view");
const homePage = document.querySelector("#home-page");
const topicPage = document.querySelector("#topic-page");
const articlePage = document.querySelector("#article-page");
document.querySelector(".author-link").type = "button";
document.querySelector("#comment-form button").type = "submit";
let previousView = "inicio";
let currentImageData = "";
let pendingDeleteId = null;
let pendingArchiveId = null;
let currentArticle = null;
let editingArticleId = null;
let activeSearchFilter = "todas";
let currentAdImage = "";
let adminAds = [];

const topicData = {
  cidade: { title: "Cidade", description: "As decisões, histórias e mudanças que fazem parte do dia a dia dos moradores.", icon: "🏙️" },
  policia: { title: "Polícia", description: "Ocorrências, operações e informações de segurança pública com responsabilidade e rapidez.", icon: "🚔" },
  economia: { title: "Economia", description: "Empresas, empregos e os movimentos que fazem a economia da cidade girar.", icon: "📈" },
  eventos: { title: "Eventos", description: "Festas, encontros, competições e tudo o que anima a agenda da cidade.", icon: "🏎️" },
  cultura: { title: "Cultura", description: "Arte, música e histórias que dão personalidade e movimento à cidade.", icon: "🎤" },
  opiniao: { title: "Opinião", description: "Análises, crónicas e diferentes pontos de vista sobre os assuntos da cidade.", icon: "✍️" }
};

function showHome() {
  homePage.hidden = false;
  topicPage.classList.remove("active");
  articlePage.classList.remove("active");
  document.querySelectorAll(".static-page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".categories a").forEach(link => link.classList.toggle("active", link.dataset.section === "inicio"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showTopic(topic) {
  const data = topicData[topic];
  if (!data) return showHome();
  const categoryArticles = getPublishedArticles().filter(article => categoryToTopic(article.category) === topic);
  const featuredArticle = categoryArticles[0] || null;
  homePage.hidden = true;
  articlePage.classList.remove("active");
  document.querySelectorAll(".static-page").forEach(page => page.classList.remove("active"));
  topicPage.classList.add("active");
  document.querySelector(".topic-title").textContent = data.title;
  document.querySelector(".topic-description").textContent = data.description;
  const feature = document.querySelector(".topic-feature");
  if (featuredArticle) {
    const topicVisual = featuredArticle.image ? `<img class="news-photo" src="${featuredArticle.image}" alt="${escapeHtml(featuredArticle.title)}">` : (featuredArticle.icon || data.icon);
    feature.innerHTML = `<div class="topic-feature-image">${topicVisual}</div><div class="topic-feature-content"><span class="category">Novo destaque em ${data.title}</span><h2>${escapeHtml(featuredArticle.title)}</h2><p>${escapeHtml(featuredArticle.summary)}</p><div class="meta"><span>${escapeHtml(featuredArticle.author)}</span><time>agora</time></div></div>`;
    feature._article = featuredArticle;
  } else {
    feature.innerHTML = `<div class="empty-news"><strong>Nenhuma notícia em ${data.title}</strong><p>As publicações desta categoria aparecerão aqui.</p></div>`;
    feature._article = null;
  }
  document.querySelector(".topic-grid").innerHTML = categoryArticles.length ? "" : '<div class="empty-news">Ainda não existem publicações nesta categoria.</div>';
  categoryArticles.slice().reverse().forEach(article => createNewsCard(article, document.querySelector(".topic-grid")));
  document.querySelectorAll(".categories a").forEach(link => link.classList.toggle("active", link.dataset.section === topic));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showArticle(article, from = "inicio") {
  currentArticle = article;
  previousView = from;
  homePage.hidden = true;
  topicPage.classList.remove("active");
  document.querySelectorAll(".static-page").forEach(page => page.classList.remove("active"));
  articlePage.classList.add("active");
  document.querySelector(".article-category").textContent = article.category;
  document.querySelector(".article-title").textContent = article.title;
  document.querySelector(".article-deck").textContent = article.summary;
  document.querySelector(".article-author").textContent = article.author;
  const articleDate = article.publishedAt ? new Date(article.publishedAt) : new Date();
  document.querySelector(".article-byline time").textContent = `Publicado em ${articleDate.toLocaleDateString("pt-BR")} às ${articleDate.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}`;
  const articleHero = document.querySelector(".article-hero");
  articleHero.innerHTML = article.image ? `<img class="news-photo" src="${article.image}" alt="${escapeHtml(article.title)}">` : `<span class="article-icon">${article.icon || "📰"}</span>`;
  const contentArea = document.querySelector(".article-content");
  const content = article.content && article.content.trim() ? article.content.trim() : `${article.summary}\n\nO anúncio chamou a atenção de moradores e empresários, que acompanharam de perto as primeiras movimentações. Segundo os responsáveis, a iniciativa foi planeada para responder às necessidades atuais e criar novas oportunidades na cidade.\n\nNovas informações devem ser divulgadas ao longo dos próximos dias pelo Paraná Alerta.`;
  let paragraphs = content.split(/\n\s*\n/).filter(paragraph => paragraph.trim());
  if (paragraphs.length === 1 && content.length > 350) {
    const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [content];
    paragraphs = [];
    for (let index = 0; index < sentences.length; index += 3) paragraphs.push(sentences.slice(index, index + 3).join(" ").trim());
  }
  contentArea.innerHTML = paragraphs.map((paragraph, index) => `<p${index === 0 ? ' class="article-opening"' : ""}>${escapeHtml(paragraph)}</p>`).join("");
  updateArticleInteractions(article);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", function (event) {
  const clickable = event.target.closest(".lead-story, .small-story, .news-card, .topic-feature");
  if (!clickable) return;
  let article;
  if (clickable._article) article = clickable._article;
  else if (clickable.dataset.article) article = JSON.parse(clickable.dataset.article);
  else article = { title: clickable.querySelector("h1,h2,h3").textContent, summary: clickable.querySelector("p")?.textContent || "Acompanhe todos os detalhes desta notícia no Paraná Alerta.", category: clickable.querySelector(".category")?.textContent || "Cidade", author: clickable.querySelector(".meta span")?.textContent.replace("Por ", "") || "Redação Paraná Alerta", icon: clickable.querySelector(".scene-icon,.thumb span,.card-image span")?.textContent || "📰" };
  const currentTopic = document.querySelector(".categories a.active")?.dataset.section || "inicio";
  showArticle(article, currentTopic);
});

document.querySelector(".article-back").addEventListener("click", function () {
  previousView === "inicio" ? showHome() : showTopic(previousView);
});

document.querySelector('.share-bar button[title="Copiar link"]').addEventListener("click", async function () {
  try { await navigator.clipboard.writeText(location.href); this.textContent = "✓"; } catch (error) { this.textContent = "!"; }
});

function articleKey(article) {
  return article.id || article.title.toLowerCase().replace(/\W+/g, "-");
}

function updateCachedArticle(article) {
  const articles = getPublishedArticles();
  const index = articles.findIndex(item => item.id === article.id);
  if (index < 0) return;
  articles[index] = { ...articles[index], ...article };
  localStorage.setItem("parana-alerta-articles", JSON.stringify(articles));
}

async function syncArticleSocialData(article) {
  if (!article.id || !window.paranaData) return;
  try {
    const [comments, likes] = await Promise.all([
      window.paranaData.listComments(article.id),
      window.paranaData.countLikes(article.id)
    ]);
    const mappedComments = comments.map(comment => ({ name: comment.author_name, text: comment.content, date: comment.created_at }));
    localStorage.setItem(`parana-alerta-comments-${articleKey(article)}`, JSON.stringify(mappedComments));
    localStorage.setItem(`parana-alerta-likes-${articleKey(article)}`, String(likes));
    if (currentArticle?.id === article.id) {
      renderComments(article);
      document.querySelector(".like-count").textContent = likes;
    }
  } catch (error) {
    console.warn("Interações não sincronizadas:", error.message);
  }
}

function updateArticleInteractions(article) {
  const key = articleKey(article);
  const viewsKey = `parana-alerta-views-${key}`;
  const localViews = Number(localStorage.getItem(viewsKey) || 0) + 1;
  let views = localViews;
  localStorage.setItem(viewsKey, String(localViews));
  if (article.id && window.paranaData) {
    window.paranaData.incrementViews(article.id).catch(error => console.warn("Visualização não sincronizada:", error.message));
    article.viewsCount = Number(article.viewsCount || 0) + 1;
    views = article.viewsCount;
    updateCachedArticle(article);
    syncArticleSocialData(article);
  }
  document.querySelector(".view-count").textContent = `${views} visualizações`;
  renderMostRead();
  document.querySelector(".like-count").textContent = localStorage.getItem(`parana-alerta-likes-${key}`) || "0";
  renderComments(article);
  renderRelated(article);
  updateLiveStats();
}

function getArticleViews(article) {
  return article.id ? Number(article.viewsCount || 0) : Number(localStorage.getItem(`parana-alerta-views-${articleKey(article)}`) || 0);
}

function getTotalViews(articles = getPublishedArticles()) {
  return articles.reduce((total, article) => total + getArticleViews(article), 0);
}

function updateLiveStats() {
  const articles = getPublishedArticles();
  const totalViews = getTotalViews(articles);
  const dashboardCards = document.querySelectorAll(".dashboard-stats strong");
  if (dashboardCards[0]) dashboardCards[0].textContent = articles.length;
  if (dashboardCards[1]) dashboardCards[1].textContent = getDrafts().length;
  if (dashboardCards[2]) dashboardCards[2].textContent = totalViews.toLocaleString("pt-BR");
  const profileStats = document.querySelectorAll(".profile-stats strong");
  if (profileStats[0]) profileStats[0].textContent = articles.filter(item => item.author === "Bellinha").length;
  if (profileStats[1]) profileStats[1].textContent = getTotalViews(articles.filter(item => item.author === "Bellinha")).toLocaleString("pt-BR");
}

document.querySelector(".like-button").addEventListener("click", async function () {
  if (!currentArticle) return;
  const key = articleKey(currentArticle);
  const storageKey = `parana-alerta-likes-${key}`;
  try {
    let visitorId = localStorage.getItem("parana-alerta-visitor-id");
    if (!visitorId) {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
        const random = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
        return (character === "x" ? random : (random & 3) | 8).toString(16);
      });
      localStorage.setItem("parana-alerta-visitor-id", visitorId);
    }
    const likes = await window.paranaData.addLike(currentArticle.id, visitorId);
    localStorage.setItem(storageKey, String(likes));
    document.querySelector(".like-count").textContent = likes;
    this.textContent = "♥";
  } catch (error) {
    console.warn("Curtida não sincronizada:", error.message);
  }
});

function renderRelated(article) {
  const related = getPublishedArticles().filter(item => item.title !== article.title && item.category === article.category).slice(0, 2);
  document.querySelector(".related-grid").innerHTML = related.length ? related.map(item => `<article class="related-card" data-related-id="${item.id}"><span class="category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3></article>`).join("") : '<div class="search-empty">Não existem notícias relacionadas.</div>';
}

document.querySelector(".related-grid").addEventListener("click", function (event) {
  const card = event.target.closest(".related-card");
  if (!card) return;
  const found = getPublishedArticles().find(item => item.id === card.dataset.relatedId);
  if (found) showArticle(found, previousView);
});

function getComments(article) {
  try {
    const value = JSON.parse(localStorage.getItem(`parana-alerta-comments-${articleKey(article)}`) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}
function renderComments(article) {
  const comments = getComments(article);
  document.querySelector(".comment-list").innerHTML = comments.length ? comments.map(comment => `<article class="comment"><strong>${escapeHtml(comment.name)}</strong><p>${escapeHtml(comment.text)}</p></article>`).join("") : '<div class="search-empty">Ainda não existem comentários.</div>';
}

document.querySelector("#comment-form").addEventListener("submit", function (event) {
  event.preventDefault();
  publishCurrentComment();
});

document.querySelectorAll(".categories a").forEach(link => link.addEventListener("click", function (event) {
  event.preventDefault();
  const section = link.dataset.section;
  history.pushState(null, "", section === "inicio" ? "#inicio" : `#${section}`);
  section === "inicio" ? showHome() : showTopic(section);
}));

document.querySelector(".back-home").addEventListener("click", function () {
  history.pushState(null, "", "#inicio");
  showHome();
});

window.addEventListener("popstate", function () {
  const section = location.hash.slice(1) || "inicio";
  section === "inicio" ? showHome() : showTopic(section);
});

async function openModal() {
  let loggedIn = false;
  try {
    const session = await window.paranaData?.getSession();
    const profile = session ? await window.paranaData.getMyProfile() : null;
    loggedIn = Boolean(session && profile?.status === "active");
    if (loggedIn) applyJournalistProfile(profile);
    if (session && !loggedIn) await window.paranaData.signOut();
  } catch (error) { loggedIn = false; }
  loginView.hidden = loggedIn;
  registerView.hidden = true;
  newsroomView.hidden = !loggedIn;
  if (loggedIn) updateDashboard();
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function applyJournalistProfile(profile) {
  if (!profile) return;
  sessionStorage.setItem("parana-alerta-profile", JSON.stringify(profile));
  const name = profile.display_name || "Jornalista";
  document.querySelector(".newsroom-head h2").textContent = `Olá, ${name}.`;
  document.querySelector("#article-author").value = name;
  document.querySelectorAll(".admin-only").forEach(tab => { tab.hidden = profile.role !== "admin"; });
  if (profile.role === "admin") {
    refreshJournalistBadge();
    refreshMessageBadge();
  }
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelector(".login-button").addEventListener("click", openModal);
document.querySelector(".close-modal").addEventListener("click", closeModal);
modal.addEventListener("click", function (event) {
  if (event.target === modal) closeModal();
});

document.querySelector(".show-register").addEventListener("click", function () {
  loginView.hidden = true;
  registerView.hidden = false;
  document.querySelector(".register-status").textContent = "";
});

document.querySelector(".show-login").addEventListener("click", function () {
  registerView.hidden = true;
  loginView.hidden = false;
  document.querySelector(".login-status").textContent = "";
});

document.querySelector("#register-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const name = document.querySelector("#register-name").value.trim();
  const email = document.querySelector("#register-email").value.trim().toLowerCase();
  const password = document.querySelector("#register-password").value;
  const confirmation = document.querySelector("#register-password-confirm").value;
  const status = document.querySelector(".register-status");
  if (name.length < 2) {
    status.textContent = "Escreve um nome com pelo menos 2 caracteres.";
    return;
  }
  if (password.length < 6) {
    status.textContent = "A senha precisa ter pelo menos 6 caracteres.";
    return;
  }
  if (password !== confirmation) {
    status.textContent = "As duas senhas não são iguais.";
    return;
  }
  status.textContent = "A enviar candidatura...";
  try {
    await window.paranaData.signUp(email, password, name);
    this.reset();
    status.textContent = "Candidatura enviada. Confirma o e-mail, se receberes uma mensagem, e aguarda a aprovação do administrador.";
  } catch (error) {
    status.textContent = error.message || "Não foi possível criar a conta.";
  }
});

document.querySelector("#login-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const email = document.querySelector("#login-email").value.trim().toLowerCase();
  const password = document.querySelector("#login-password").value;
  const status = document.querySelector(".login-status");
  status.textContent = "A entrar...";
  try {
    await window.paranaData.signIn(email, password);
    const profile = await window.paranaData.getMyProfile();
    if (!profile || profile.status !== "active") {
      await window.paranaData.signOut();
      status.textContent = "Esta conta ainda não foi ativada pelo administrador.";
      return;
    }
    applyJournalistProfile(profile);
  } catch (error) {
    status.textContent = error.message || "E-mail ou senha incorretos.";
    return;
  }
  status.textContent = "";
  loginView.hidden = true;
  newsroomView.hidden = false;
  updateDashboard();
});

document.querySelector(".logout-button").addEventListener("click", async function () {
  try { await window.paranaData.signOut(); } catch (error) { console.warn(error); }
  sessionStorage.removeItem("parana-alerta-profile");
  newsroomView.hidden = true;
  loginView.hidden = false;
  registerView.hidden = true;
  document.querySelectorAll(".admin-only").forEach(tab => { tab.hidden = true; });
  document.querySelector("#login-form").reset();
});

document.querySelectorAll(".editor-tab").forEach(button => button.addEventListener("click", function () {
  document.querySelectorAll(".editor-tab").forEach(tab => tab.classList.toggle("active", tab === button));
  document.querySelectorAll(".editor-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.editorPanel === button.dataset.editorTab));
  if (button.dataset.editorTab === "drafts") renderDrafts();
  if (button.dataset.editorTab === "published") renderPublished();
  if (button.dataset.editorTab === "ads") renderAdsAdmin();
  if (button.dataset.editorTab === "messages") renderContactMessages();
  if (button.dataset.editorTab === "journalists") renderJournalists();
  if (button.dataset.editorTab === "settings") loadSettings();
}));

function journalistStatusLabel(status) {
  return { pending: "Aguardando aprovação", active: "Ativo", suspended: "Suspenso", rejected: "Recusado", archived: "Arquivado" }[status] || status;
}

function journalistRoleLabel(role) {
  return { journalist: "Jornalista", editor: "Editor", admin: "Administrador" }[role] || role;
}

function contactMessageStatusLabel(status) {
  return { new: "Nova", read: "Lida", resolved: "Resolvida" }[status] || status;
}

function isAdCurrentlyActive(ad) {
  const now = Date.now();
  const starts = ad.starts_at ? new Date(ad.starts_at).getTime() : null;
  const ends = ad.ends_at ? new Date(ad.ends_at).getTime() : null;
  return ad.is_active && (!starts || starts <= now) && (!ends || ends >= now);
}

function renderPublicAd(ad = null) {
  const strip = document.querySelector(".ad-strip");
  const visual = strip.querySelector(".ad-visual");
  const copy = strip.querySelector(".ad-copy");
  const button = strip.querySelector("button");
  if (!ad) {
    visual.hidden = true;
    visual.innerHTML = "";
    copy.innerHTML = "<strong>ANUNCIE AQUI</strong><p>Leve a tua empresa até toda a cidade.</p>";
    button.textContent = "Conhecer planos";
    button.dataset.adUrl = "";
    return;
  }
  visual.hidden = !ad.image_url;
  visual.innerHTML = ad.image_url ? `<img src="${ad.image_url}" alt="${escapeHtml(ad.advertiser)}">` : "";
  copy.innerHTML = `<strong>${escapeHtml(ad.title)}</strong><p>${escapeHtml(ad.description)} · ${escapeHtml(ad.advertiser)}</p>`;
  button.textContent = ad.button_text;
  button.dataset.adUrl = ad.target_url;
}

async function loadPublicAd() {
  try {
    const ads = await window.paranaData.listAds(false);
    renderPublicAd(ads.find(isAdCurrentlyActive) || null);
  } catch (error) {
    console.warn("Não foi possível carregar publicidade:", error.message);
  }
}

function updateAdImagePreview() {
  const preview = document.querySelector(".ad-image-preview");
  preview.hidden = !currentAdImage;
  if (currentAdImage) preview.querySelector("img").src = currentAdImage;
}

function resetAdForm() {
  document.querySelector("#ad-form").reset();
  document.querySelector("#ad-id").value = "";
  document.querySelector("#ad-button-text").value = "Saiba mais";
  document.querySelector("#ad-active").checked = true;
  currentAdImage = "";
  updateAdImagePreview();
  document.querySelector("#ad-form").hidden = true;
  document.querySelector(".ad-form-status").textContent = "";
}

function datetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

async function renderAdsAdmin() {
  const list = document.querySelector(".ad-list");
  const status = document.querySelector(".ad-panel-status");
  list.innerHTML = '<div class="empty-drafts">A carregar anúncios...</div>';
  status.textContent = "";
  try {
    adminAds = await window.paranaData.listAds(true);
    list.innerHTML = adminAds.length ? adminAds.map(ad => {
      const state = isAdCurrentlyActive(ad) ? "Em exibição" : ad.is_active ? "Agendado ou encerrado" : "Desativado";
      return `<article class="ad-admin-card"><div><span class="status-pill">${state}</span><h3>${escapeHtml(ad.title)}</h3><p>${escapeHtml(ad.advertiser)} · ${escapeHtml(ad.description)}</p></div><div class="ad-admin-actions"><button data-edit-ad-id="${ad.id}">Editar</button><button data-toggle-ad-id="${ad.id}" data-toggle-value="${!ad.is_active}">${ad.is_active ? "Desativar" : "Ativar"}</button><button class="delete-ad" data-delete-ad-id="${ad.id}">Excluir</button></div></article>`;
    }).join("") : '<div class="empty-drafts">Ainda não existem anúncios.</div>';
  } catch (error) {
    list.innerHTML = '<div class="empty-drafts">Não foi possível carregar os anúncios.</div>';
    status.textContent = error.message;
  }
}

document.querySelector(".new-ad-button").addEventListener("click", function () {
  resetAdForm();
  document.querySelector("#ad-form").hidden = false;
  document.querySelector("#ad-advertiser").focus();
});

document.querySelector(".cancel-ad").addEventListener("click", resetAdForm);
document.querySelector(".remove-ad-image").addEventListener("click", function () {
  currentAdImage = "";
  document.querySelector("#ad-image").value = "";
  updateAdImagePreview();
});

document.querySelector("#ad-image").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;
  const status = document.querySelector(".ad-form-status");
  status.textContent = "A preparar imagem...";
  try {
    currentAdImage = await compressImage(file);
    updateAdImagePreview();
    status.textContent = "Imagem pronta.";
  } catch (error) {
    status.textContent = "Não foi possível carregar esta imagem.";
  }
});

document.querySelector("#ad-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const status = document.querySelector(".ad-form-status");
  const id = document.querySelector("#ad-id").value || null;
  const ad = {
    advertiser: document.querySelector("#ad-advertiser").value.trim(),
    title: document.querySelector("#ad-title").value.trim(),
    description: document.querySelector("#ad-description").value.trim(),
    buttonText: document.querySelector("#ad-button-text").value.trim(),
    targetUrl: document.querySelector("#ad-target-url").value.trim(),
    image: currentAdImage,
    startsAt: document.querySelector("#ad-starts-at").value ? new Date(document.querySelector("#ad-starts-at").value).toISOString() : null,
    endsAt: document.querySelector("#ad-ends-at").value ? new Date(document.querySelector("#ad-ends-at").value).toISOString() : null,
    isActive: document.querySelector("#ad-active").checked
  };
  if (ad.endsAt && ad.startsAt && new Date(ad.endsAt) <= new Date(ad.startsAt)) {
    status.textContent = "A data final precisa ser posterior à data inicial.";
    return;
  }
  status.textContent = "A guardar anúncio...";
  try {
    const session = await window.paranaData.getSession();
    if (!session?.user) throw new Error("A sessão expirou.");
    if (ad.image?.startsWith("data:")) {
      status.textContent = "A enviar imagem...";
      ad.image = await window.paranaData.uploadImage(ad.image, session.user.id);
    }
    await window.paranaData.saveAd(ad, id, session.user.id);
    resetAdForm();
    await renderAdsAdmin();
    await loadPublicAd();
    document.querySelector(".ad-panel-status").textContent = id ? "Anúncio atualizado." : "Anúncio criado.";
  } catch (error) {
    status.textContent = error.message || "Não foi possível guardar o anúncio.";
  }
});

document.querySelector(".ad-list").addEventListener("click", async function (event) {
  const editButton = event.target.closest("[data-edit-ad-id]");
  const toggleButton = event.target.closest("[data-toggle-ad-id]");
  const deleteButton = event.target.closest("[data-delete-ad-id]");
  const status = document.querySelector(".ad-panel-status");
  if (editButton) {
    const ad = adminAds.find(item => item.id === editButton.dataset.editAdId);
    if (!ad) return;
    document.querySelector("#ad-id").value = ad.id;
    document.querySelector("#ad-advertiser").value = ad.advertiser;
    document.querySelector("#ad-title").value = ad.title;
    document.querySelector("#ad-description").value = ad.description;
    document.querySelector("#ad-button-text").value = ad.button_text;
    document.querySelector("#ad-target-url").value = ad.target_url;
    document.querySelector("#ad-starts-at").value = datetimeLocalValue(ad.starts_at);
    document.querySelector("#ad-ends-at").value = datetimeLocalValue(ad.ends_at);
    document.querySelector("#ad-active").checked = ad.is_active;
    currentAdImage = ad.image_url || "";
    updateAdImagePreview();
    document.querySelector("#ad-form").hidden = false;
    return;
  }
  try {
    if (toggleButton) {
      const ad = adminAds.find(item => item.id === toggleButton.dataset.toggleAdId);
      await window.paranaData.saveAd({ advertiser: ad.advertiser, title: ad.title, description: ad.description, buttonText: ad.button_text, targetUrl: ad.target_url, image: ad.image_url, startsAt: ad.starts_at, endsAt: ad.ends_at, isActive: toggleButton.dataset.toggleValue === "true" }, ad.id);
      status.textContent = "Estado do anúncio atualizado.";
    }
    if (deleteButton) {
      if (!window.confirm("Excluir este anúncio definitivamente?")) return;
      await window.paranaData.deleteAd(deleteButton.dataset.deleteAdId);
      status.textContent = "Anúncio excluído.";
    }
    await renderAdsAdmin();
    await loadPublicAd();
  } catch (error) {
    status.textContent = error.message || "Não foi possível atualizar o anúncio.";
  }
});

async function refreshMessageBadge() {
  try {
    const messages = await window.paranaData.listContactMessages();
    const unread = messages.filter(message => message.status === "new").length;
    const badge = document.querySelector(".message-badge");
    badge.textContent = unread;
    badge.hidden = unread === 0;
  } catch (error) {
    console.warn("Não foi possível contar mensagens:", error.message);
  }
}

async function renderContactMessages() {
  const list = document.querySelector(".message-list");
  const panelStatus = document.querySelector(".message-panel-status");
  list.innerHTML = '<div class="empty-drafts">A carregar mensagens...</div>';
  panelStatus.textContent = "";
  try {
    const messages = await window.paranaData.listContactMessages();
    list.innerHTML = messages.length ? messages.map(message => {
      const date = new Date(message.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const nextAction = message.status === "new" ? `<button data-message-status="read" data-message-id="${message.id}">Marcar como lida</button>` : message.status !== "resolved" ? `<button data-message-status="resolved" data-message-id="${message.id}">Marcar como resolvida</button>` : "";
      return `<article class="message-card${message.status === "new" ? " is-new" : ""}"><div class="message-card-head"><div><span class="status-pill">${contactMessageStatusLabel(message.status)}</span><h3>${escapeHtml(message.subject)}</h3><p class="message-contact">${escapeHtml(message.sender_name)} · <a href="mailto:${escapeHtml(message.sender_email)}">${escapeHtml(message.sender_email)}</a></p></div><time>${date}</time></div><p class="message-body">${escapeHtml(message.message)}</p><div class="message-actions">${nextAction}<button class="delete-message" data-delete-message-id="${message.id}">Excluir</button></div></article>`;
    }).join("") : '<div class="empty-drafts">Ainda não existem mensagens.</div>';
    refreshMessageBadge();
  } catch (error) {
    list.innerHTML = '<div class="empty-drafts">Não foi possível carregar as mensagens.</div>';
    panelStatus.textContent = error.message;
  }
}

document.querySelector(".refresh-messages").addEventListener("click", renderContactMessages);

document.querySelector(".message-list").addEventListener("click", async function (event) {
  const statusButton = event.target.closest("[data-message-status]");
  const deleteButton = event.target.closest("[data-delete-message-id]");
  if (!statusButton && !deleteButton) return;
  const panelStatus = document.querySelector(".message-panel-status");
  try {
    if (statusButton) {
      statusButton.disabled = true;
      await window.paranaData.updateContactMessage(statusButton.dataset.messageId, statusButton.dataset.messageStatus);
      panelStatus.textContent = "Mensagem atualizada.";
    }
    if (deleteButton) {
      if (!window.confirm("Excluir esta mensagem definitivamente?")) return;
      deleteButton.disabled = true;
      await window.paranaData.deleteContactMessage(deleteButton.dataset.deleteMessageId);
      panelStatus.textContent = "Mensagem excluída.";
    }
    await renderContactMessages();
  } catch (error) {
    panelStatus.textContent = error.message || "Não foi possível atualizar a mensagem.";
    if (statusButton) statusButton.disabled = false;
    if (deleteButton) deleteButton.disabled = false;
  }
});

function openArchiveModal(id, name) {
  pendingArchiveId = id;
  document.querySelector(".archive-journalist-name").textContent = name;
  document.querySelector(".archive-modal").classList.add("open");
  document.querySelector(".archive-modal").setAttribute("aria-hidden", "false");
}

function closeArchiveModal() {
  pendingArchiveId = null;
  document.querySelector(".archive-modal").classList.remove("open");
  document.querySelector(".archive-modal").setAttribute("aria-hidden", "true");
}

async function archiveJournalist(id) {
  const status = document.querySelector(".journalist-status");
  status.textContent = "A retirar do painel...";
  try {
    await window.paranaData.updateJournalist(id, { status: "archived", role: "journalist" });
    status.textContent = "Conta retirada do painel.";
    await renderJournalists();
  } catch (error) {
    status.textContent = error.message || "Não foi possível retirar a conta do painel.";
  }
}

async function refreshJournalistBadge() {
  try {
    const journalists = await window.paranaData.listJournalists();
    const pending = journalists.filter(profile => profile.status === "pending").length;
    const badge = document.querySelector(".pending-badge");
    badge.textContent = pending;
    badge.hidden = pending === 0;
  } catch (error) {
    console.warn("Não foi possível contar candidaturas:", error.message);
  }
}

async function renderJournalists() {
  const list = document.querySelector(".journalist-list");
  const status = document.querySelector(".journalist-status");
  list.innerHTML = '<div class="empty-drafts">A carregar a equipe...</div>';
  status.textContent = "";
  try {
    const profiles = await window.paranaData.listJournalists();
    list.innerHTML = profiles.length ? profiles.map(profile => {
      const created = new Date(profile.created_at).toLocaleDateString("pt-BR");
      const isAdmin = profile.role === "admin";
      const roleControl = isAdmin ? `<strong>${journalistRoleLabel(profile.role)}</strong>` : `<select data-role-id="${profile.id}" aria-label="Função de ${escapeHtml(profile.display_name)}"><option value="journalist"${profile.role === "journalist" ? " selected" : ""}>Jornalista</option><option value="editor"${profile.role === "editor" ? " selected" : ""}>Editor</option></select>`;
      let action = "";
      if (!isAdmin && profile.status === "pending") action = `<button data-approve-id="${profile.id}">Aprovar</button><button class="reject-journalist" data-reject-id="${profile.id}">Negar</button>`;
      if (!isAdmin && profile.status === "active") action = `<button class="suspend-journalist" data-suspend-id="${profile.id}">Suspender</button>`;
      if (!isAdmin && profile.status === "suspended") action = `<button data-approve-id="${profile.id}">Reativar</button><button class="archive-journalist" data-archive-id="${profile.id}">Retirar do painel</button>`;
      if (!isAdmin && profile.status === "rejected") action = `<button data-approve-id="${profile.id}">Reconsiderar e aprovar</button><button class="archive-journalist" data-archive-id="${profile.id}">Retirar do painel</button>`;
      return `<article class="journalist-card"><div><h3>${escapeHtml(profile.display_name)}</h3><p>Candidatura em ${created}</p><span class="status-pill">${journalistStatusLabel(profile.status)}</span></div><div class="journalist-actions">${roleControl}${action}</div></article>`;
    }).join("") : '<div class="empty-drafts">Nenhum jornalista cadastrado.</div>';
    refreshJournalistBadge();
  } catch (error) {
    list.innerHTML = '<div class="empty-drafts">Não foi possível carregar a equipe.</div>';
    status.textContent = error.message;
  }
}

document.querySelector(".refresh-journalists").addEventListener("click", renderJournalists);

document.querySelector(".journalist-list").addEventListener("click", async function (event) {
  const approveButton = event.target.closest("[data-approve-id]");
  const suspendButton = event.target.closest("[data-suspend-id]");
  const rejectButton = event.target.closest("[data-reject-id]");
  const archiveButton = event.target.closest("[data-archive-id]");
  const button = approveButton || suspendButton || rejectButton || archiveButton;
  if (!button) return;
  const id = approveButton?.dataset.approveId || suspendButton?.dataset.suspendId || rejectButton?.dataset.rejectId || archiveButton.dataset.archiveId;
  if (rejectButton && !window.confirm("Negar esta candidatura? A conta continuará no histórico como recusada.")) return;
  if (archiveButton) {
    const card = archiveButton.closest(".journalist-card");
    openArchiveModal(id, card.querySelector("h3").textContent);
    return;
  }
  const roleSelect = this.querySelector(`[data-role-id="${id}"]`);
  const nextStatus = approveButton ? "active" : rejectButton ? "rejected" : "suspended";
  const changes = { status: nextStatus, role: roleSelect?.value || "journalist" };
  const status = document.querySelector(".journalist-status");
  button.disabled = true;
  status.textContent = approveButton ? "A atualizar acesso..." : rejectButton ? "A negar candidatura..." : "A suspender acesso...";
  try {
    await window.paranaData.updateJournalist(id, changes);
    status.textContent = approveButton ? "Acesso atualizado com sucesso." : rejectButton ? "Candidatura recusada." : "Acesso suspenso.";
    await renderJournalists();
  } catch (error) {
    button.disabled = false;
    status.textContent = error.message || "Não foi possível atualizar o jornalista.";
  }
});

function getDrafts() {
  return JSON.parse(localStorage.getItem("parana-alerta-drafts") || "[]").map(draft => ({
    ...draft,
    author: draft.author === "Marina Costa" || draft.author === "Marina" ? "Bellinha" : draft.author
  }));
}

function updateDashboard() {
  updateLiveStats();
}

function renderDrafts() {
  const drafts = getDrafts();
  const list = document.querySelector(".draft-list");
  list.innerHTML = drafts.length ? drafts.map((draft, index) => `<article class="draft-item"><div><h3>${escapeHtml(draft.title || "Sem título")}</h3><p>${escapeHtml(draft.category)} · ${escapeHtml(draft.author || "Sem autor")}</p></div><button data-draft-index="${index}">Continuar</button></article>`).join("") : '<div class="empty-drafts">Ainda não existem rascunhos.</div>';
}

function renderPublished() {
  const articles = getPublishedArticles();
  const list = document.querySelector(".published-list");
  list.innerHTML = articles.length ? articles.map(article => {
    const views = getArticleViews(article);
    const likes = Number(localStorage.getItem(`parana-alerta-likes-${articleKey(article)}`) || 0);
    const comments = getComments(article).length;
    return `<article class="draft-item"><div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.category)} · ${escapeHtml(article.author)} · ${views} visualizações · ${likes} curtidas · ${comments} comentários</p></div><div class="published-actions"><button data-view-id="${article.id}">Ver</button><button data-edit-id="${article.id}">Editar</button><button class="delete-article" data-delete-id="${article.id}">Apagar</button></div></article>`;
  }).join("") : '<div class="empty-drafts">Ainda não existem notícias publicadas.</div>';
}

function openDeleteModal(article) {
  pendingDeleteId = article.id;
  document.querySelector(".delete-article-title").textContent = `“${article.title}”`;
  document.querySelector(".delete-modal").classList.add("open");
  document.querySelector(".delete-modal").setAttribute("aria-hidden", "false");
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.querySelector(".delete-modal").classList.remove("open");
  document.querySelector(".delete-modal").setAttribute("aria-hidden", "true");
}

async function deletePublishedArticle(id) {
  const articles = getPublishedArticles();
  const row = document.querySelector(`[data-delete-id="${id}"]`)?.closest(".draft-item");
  if (row) row.classList.add("removing");
  await new Promise(resolve => setTimeout(resolve, 250));
  try {
    await window.paranaData.deleteArticle(id);
  } catch (error) {
    renderPublished();
    formStatus.textContent = error.message || "Não foi possível apagar a notícia.";
    return;
  }
  const remaining = articles.filter(item => item.id !== id);
  localStorage.setItem("parana-alerta-articles", JSON.stringify(remaining));
  localStorage.setItem("parana-alerta-published-count", String(remaining.length));
  renderHomeArticles();
  remaining.length ? setLeadStory(remaining[0]) : resetLeadStory();
  renderMostRead();
  renderPublished();
  updateDashboard();
}

function escapeHtml(text) {
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}

function updateImagePreview() {
  const preview = document.querySelector(".image-preview");
  preview.hidden = !currentImageData;
  if (currentImageData) preview.querySelector("img").src = currentImageData;
}

function clearImagePreview() {
  currentImageData = "";
  document.querySelector("#article-image").value = "";
  updateImagePreview();
}

function compressImage(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = function () {
      const image = new Image();
      image.onerror = reject;
      image.onload = function () {
        const maxWidth = 900;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.62));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

document.querySelector("#article-image").addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return clearImagePreview();
  formStatus.textContent = "A preparar a imagem...";
  try {
    currentImageData = await compressImage(file);
    updateImagePreview();
    formStatus.textContent = "Imagem pronta para publicar.";
  } catch (error) {
    clearImagePreview();
    formStatus.textContent = "Não foi possível carregar esta imagem.";
  }
});

document.querySelector(".remove-image").addEventListener("click", clearImagePreview);

function createNewsCard(article, target = newsGrid) {
  target.querySelectorAll(".empty-news").forEach(empty => empty.remove());
  const card = document.createElement("article");
  card.className = "news-card";
  card.dataset.published = "true";
  card._article = { ...article, icon: article.icon || "📰" };
  const publishedTime = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const timeLabel = publishedTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  card.innerHTML = `
    ${target === newsGrid ? '<span class="recent-badge">Recente</span>' : ""}
    <div class="card-image purple-scene">${article.image ? `<img class="news-photo" src="${article.image}" alt="${escapeHtml(article.title)}">` : "<span>📰</span>"}</div>
    <div class="card-body">
      <span class="category">${escapeHtml(article.category)}</span>
      <h3>${escapeHtml(article.title)}</h3>
      <p>${escapeHtml(article.summary)}</p>
      <div class="meta"><span>${escapeHtml(article.author)}</span><time>${timeLabel}</time></div>
    </div>`;
  target.prepend(card);
}

function renderHomeArticles() {
  newsGrid.innerHTML = "";
  const articles = getPublishedArticles().slice(0, 6);
  if (!articles.length) {
    newsGrid.innerHTML = '<div class="empty-news">Ainda não existem notícias publicadas.</div>';
    return;
  }
  articles.slice().reverse().forEach(article => createNewsCard(article));
}

function renderMostRead() {
  const articles = getPublishedArticles().map(article => ({ ...article, views: Number(localStorage.getItem(`parana-alerta-views-${articleKey(article)}`) || 0) })).sort((a, b) => b.views - a.views).slice(0, 3);
  const ranking = document.querySelector(".ranking-list");
  ranking.innerHTML = articles.length ? articles.map((article, index) => `<article data-ranking-id="${article.id}"><strong>0${index + 1}</strong><div><span class="category">${escapeHtml(article.category)}</span><h3>${escapeHtml(article.title)}</h3><small>${article.views} leituras</small></div></article>`).join("") : '<div class="empty-ranking">O ranking será criado conforme as notícias receberem leituras.</div>';
}

function setLeadStory(article) {
  const lead = document.querySelector(".lead-story");
  const icon = article.icon || "📰";
  lead._article = { ...article, icon };
  lead.innerHTML = `
    <div class="story-image purple-scene"><span class="live-tag">● Novo</span>${article.image ? `<img class="news-photo" src="${article.image}" alt="${escapeHtml(article.title)}">` : `<span class="scene-icon">${icon}</span>`}</div>
    <div class="lead-content"><span class="category">${escapeHtml(article.category)}</span><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.summary)}</p><div class="meta"><span>Por <strong>${escapeHtml(article.author)}</strong></span><time>agora</time></div></div>`;
}

function resetLeadStory() {
  const lead = document.querySelector(".lead-story");
  lead._article = null;
  lead.innerHTML = `<div class="empty-lead"><span>PARANÁ ALERTA</span><h1>A redação está pronta.</h1><p>As notícias publicadas pela equipa aparecerão aqui em destaque.</p><button class="empty-login">Acessar redação</button></div>`;
}

function categoryToTopic(category) {
  return String(category).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getPublishedArticles() {
  const stored = JSON.parse(localStorage.getItem("parana-alerta-articles") || "[]");
  let changed = false;
  const articles = stored.map((article, index) => {
    if (!article.id) changed = true;
    return {
    ...article,
    id: article.id || `legacy-${article.publishedAt || Date.now()}-${index}`,
    author: article.author === "Marina Costa" || article.author === "Marina" ? "Bellinha" : article.author
    };
  });
  if (changed) localStorage.setItem("parana-alerta-articles", JSON.stringify(articles));
  return articles;
}

function mapSupabaseArticle(article) {
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    content: article.content,
    category: article.category,
    author: article.profiles?.display_name || "Redação Paraná Alerta",
    authorId: article.author_id,
    image: article.image_url || "",
    viewsCount: Number(article.views_count || 0),
    publishedAt: article.published_at || article.created_at,
    icon: "📰"
  };
}

async function syncArticlesFromSupabase() {
  if (!window.paranaData) return getPublishedArticles();
  try {
    const remote = await window.paranaData.listArticles(false);
    const mapped = remote.map(mapSupabaseArticle);
    localStorage.setItem("parana-alerta-articles", JSON.stringify(mapped));
    return mapped;
  } catch (error) {
    console.warn("Não foi possível sincronizar notícias:", error.message);
    return getPublishedArticles();
  }
}

function savePublishedArticle(article) {
  const articles = getPublishedArticles();
  if (editingArticleId) {
    const index = articles.findIndex(item => item.id === editingArticleId);
    if (index >= 0) articles[index] = { ...articles[index], ...article };
  } else {
    articles.unshift({ ...article, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), icon: "📰", publishedAt: new Date().toISOString() });
  }
  localStorage.setItem("parana-alerta-articles", JSON.stringify(articles));
  return articles;
}

function restorePublishedArticles() {
  const articles = getPublishedArticles();
  renderHomeArticles();
  if (articles.length) setLeadStory(articles[0]);
  renderMostRead();
}

articleForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  const article = {
    title: document.querySelector("#article-title").value.trim(),
    category: document.querySelector("#article-category").value,
    summary: document.querySelector("#article-summary").value.trim(),
    content: document.querySelector("#article-content").value.trim(),
    author: document.querySelector("#article-author").value.trim(),
    image: currentImageData
  };

  if (article.title.length < 5) {
    formStatus.textContent = "O título precisa ter pelo menos 5 caracteres.";
    document.querySelector("#article-title").focus();
    return;
  }
  if (article.summary.length < 10) {
    formStatus.textContent = "Escreve um resumo com pelo menos 10 caracteres.";
    document.querySelector("#article-summary").focus();
    return;
  }
  if (article.content.length < 20) {
    formStatus.textContent = "O texto completo precisa ter pelo menos 20 caracteres.";
    document.querySelector("#article-content").focus();
    return;
  }
  if (!article.author) {
    formStatus.textContent = "Preenche o nome da jornalista.";
    document.querySelector("#article-author").focus();
    return;
  }

  formStatus.textContent = "A publicar no Supabase...";
  try {
    const session = await window.paranaData.getSession();
    if (!session?.user) throw new Error("A sessão expirou. Entra novamente na redação.");
    if (article.image?.startsWith("data:")) {
      formStatus.textContent = "A enviar a imagem...";
      article.image = await window.paranaData.uploadImage(article.image, session.user.id);
    }
    await window.paranaData.saveArticle(article, editingArticleId, session.user.id);
    await syncArticlesFromSupabase();
  } catch (error) {
    formStatus.textContent = error.message || "Não foi possível publicar a notícia.";
    return;
  }
  try {
    const savedArticles = getPublishedArticles();
    renderHomeArticles();
    if (savedArticles.length) setLeadStory(savedArticles[0]);
    renderMostRead();
    localStorage.setItem("parana-alerta-published-count", String(savedArticles.length));
  } catch (visualError) {
    formStatus.textContent = "Notícia guardada. Atualiza a página para vê-la na capa.";
  }

  const successMessage = editingArticleId ? "Alterações guardadas." : `Notícia publicada na capa e em ${article.category}.`;
  editingArticleId = null;
  articleForm.reset();
  clearImagePreview();
  const savedProfile = JSON.parse(sessionStorage.getItem("parana-alerta-profile") || "null");
  document.querySelector("#article-author").value = savedProfile?.display_name || "Bellinha";
  formStatus.textContent = successMessage;
  updateDashboard();
  setTimeout(function () {
    closeModal();
    history.pushState(null, "", "#inicio");
    showHome();
    setTimeout(function () {
      document.querySelector(".lead-story").scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  }, 700);
});

document.querySelector(".draft-button").addEventListener("click", function () {
  const draft = {
    title: document.querySelector("#article-title").value,
    category: document.querySelector("#article-category").value,
    summary: document.querySelector("#article-summary").value,
    content: document.querySelector("#article-content").value,
    author: document.querySelector("#article-author").value,
    image: currentImageData
  };
  if (!draft.title.trim()) {
    formStatus.textContent = "Escreve pelo menos um título para guardar.";
    return;
  }
  const drafts = getDrafts();
  drafts.unshift(draft);
  localStorage.setItem("parana-alerta-drafts", JSON.stringify(drafts));
  formStatus.textContent = "Rascunho guardado neste navegador.";
  updateDashboard();
});

document.querySelector(".draft-list").addEventListener("click", function (event) {
  const button = event.target.closest("[data-draft-index]");
  if (!button) return;
  const drafts = getDrafts();
  const draft = drafts[Number(button.dataset.draftIndex)];
  if (!draft) return;
  document.querySelector("#article-title").value = draft.title || "";
  document.querySelector("#article-category").value = draft.category || "Cidade";
  document.querySelector("#article-summary").value = draft.summary || "";
  document.querySelector("#article-content").value = draft.content || "";
  document.querySelector("#article-author").value = draft.author || "Bellinha";
  currentImageData = draft.image || "";
  updateImagePreview();
  drafts.splice(Number(button.dataset.draftIndex), 1);
  localStorage.setItem("parana-alerta-drafts", JSON.stringify(drafts));
  document.querySelector('[data-editor-tab="write"]').click();
  updateDashboard();
});

document.querySelector(".preview-button").addEventListener("click", function () {
  const preview = {
    title: document.querySelector("#article-title").value.trim() || "Notícia sem título",
    category: document.querySelector("#article-category").value,
    summary: document.querySelector("#article-summary").value.trim() || "Resumo ainda não preenchido.",
    content: document.querySelector("#article-content").value.trim(),
    author: document.querySelector("#article-author").value.trim() || "Bellinha",
    image: currentImageData,
    icon: "📰"
  };
  closeModal();
  showArticle(preview, "inicio");
});

document.querySelector(".published-list").addEventListener("click", function (event) {
  const viewButton = event.target.closest("[data-view-id]");
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");
  const articles = getPublishedArticles();

  if (viewButton) {
    const article = articles.find(item => item.id === viewButton.dataset.viewId);
    if (!article) return;
    closeModal();
    showArticle(article, "inicio");
    return;
  }

  if (editButton) {
    const article = articles.find(item => item.id === editButton.dataset.editId);
    if (!article) return;
    editingArticleId = article.id;
    document.querySelector("#article-title").value = article.title;
    document.querySelector("#article-category").value = article.category;
    document.querySelector("#article-summary").value = article.summary;
    document.querySelector("#article-content").value = article.content || "";
    document.querySelector("#article-author").value = article.author;
    currentImageData = article.image || "";
    updateImagePreview();
    document.querySelector('[data-editor-tab="write"]').click();
    formStatus.textContent = "A editar notícia publicada.";
    return;
  }

  if (deleteButton) {
    const article = articles.find(item => item.id === deleteButton.dataset.deleteId);
    if (!article) return;
    openDeleteModal(article);
  }
});

document.querySelector(".cancel-delete").addEventListener("click", closeDeleteModal);
document.querySelector(".confirm-delete").addEventListener("click", function () {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  closeDeleteModal();
  deletePublishedArticle(id);
});
document.querySelector(".delete-modal").addEventListener("click", function (event) {
  if (event.target === this) closeDeleteModal();
});

document.querySelector(".cancel-archive").addEventListener("click", closeArchiveModal);
document.querySelector(".confirm-archive").addEventListener("click", function () {
  if (!pendingArchiveId) return;
  const id = pendingArchiveId;
  closeArchiveModal();
  archiveJournalist(id);
});
document.querySelector(".archive-modal").addEventListener("click", function (event) {
  if (event.target === this) closeArchiveModal();
});

document.querySelector("#newsletter-form").addEventListener("submit", function (event) {
  event.preventDefault();
  document.querySelector("#newsletter-status").textContent = "Inscrição realizada. Bem-vindo ao Paraná Alerta!";
  event.target.reset();
});

const mobileMenu = document.querySelector(".mobile-menu");
document.querySelector(".menu-button").addEventListener("click", function () { mobileMenu.classList.add("open"); mobileMenu.setAttribute("aria-hidden", "false"); });
document.querySelector(".close-mobile").addEventListener("click", function () { mobileMenu.classList.remove("open"); mobileMenu.setAttribute("aria-hidden", "true"); });
document.querySelectorAll("[data-go]").forEach(link => link.addEventListener("click", function (event) { event.preventDefault(); mobileMenu.classList.remove("open"); const section = this.dataset.go; section === "inicio" ? showHome() : showTopic(section); }));

function showStaticPage(name) {
  homePage.hidden = true;
  topicPage.classList.remove("active");
  articlePage.classList.remove("active");
  document.querySelectorAll(".static-page").forEach(page => {
    page.classList.remove("active");
    page.style.display = "none";
  });
  const pageIds = { sobre:"about-page", contato:"contact-page", profile:"profile-page" };
  const target = document.querySelector(`#${pageIds[name] || `${name}-page`}`);
  if (target) {
    target.classList.add("active");
    target.style.display = "block";
  }
  if (name === "profile") updateLiveStats();
  window.scrollTo({ top:0, behavior:"smooth" });
}

document.querySelectorAll("[data-static]").forEach(link => link.addEventListener("click", function (event) { event.preventDefault(); mobileMenu.classList.remove("open"); showStaticPage(this.dataset.static); }));
document.querySelectorAll(".static-back").forEach(button => button.addEventListener("click", showHome));
document.addEventListener("click", function (event) {
  const authorButton = event.target.closest(".author-link");
  if (!authorButton) return;
  event.preventDefault();
  event.stopPropagation();
  showStaticPage("profile");
});
document.querySelector(".contact-ad").addEventListener("click", function () {
  if (this.dataset.adUrl) window.open(this.dataset.adUrl, "_blank", "noopener");
  else showStaticPage("contact");
});
document.querySelector("#contact-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const status = document.querySelector(".contact-status");
  const submitButton = this.querySelector("button");
  const message = {
    name: document.querySelector("#contact-name").value.trim(),
    email: document.querySelector("#contact-email").value.trim().toLowerCase(),
    subject: document.querySelector("#contact-subject").value,
    message: document.querySelector("#contact-message").value.trim()
  };
  if (message.name.length < 2 || message.message.length < 10) {
    status.textContent = "Preenche o nome e escreve uma mensagem com pelo menos 10 caracteres.";
    return;
  }
  submitButton.disabled = true;
  status.textContent = "A enviar mensagem...";
  try {
    await window.paranaData.sendContactMessage(message);
    this.reset();
    status.textContent = "Mensagem enviada para a administração do jornal.";
  } catch (error) {
    status.textContent = error.message || "Não foi possível enviar a mensagem.";
  } finally {
    submitButton.disabled = false;
  }
});

const searchOverlay = document.querySelector(".search-overlay");
document.querySelector(".search-button").addEventListener("click", function () { searchOverlay.classList.add("open"); searchOverlay.setAttribute("aria-hidden", "false"); document.querySelector("#site-search").focus(); renderSearchResults(); });
document.querySelector(".close-search").addEventListener("click", function () { searchOverlay.classList.remove("open"); searchOverlay.setAttribute("aria-hidden", "true"); });
document.querySelectorAll("[data-search-filter]").forEach(button => button.addEventListener("click", function () { activeSearchFilter = this.dataset.searchFilter; document.querySelectorAll("[data-search-filter]").forEach(item => item.classList.toggle("active", item === this)); renderSearchResults(); }));
document.querySelector("#site-search").addEventListener("input", renderSearchResults);

function getSearchArticles() {
  return getPublishedArticles();
}

function renderSearchResults() {
  const query = document.querySelector("#site-search").value.trim().toLowerCase();
  const results = getSearchArticles().filter(article => (activeSearchFilter === "todas" || categoryToTopic(article.category) === activeSearchFilter) && (!query || `${article.title} ${article.summary} ${article.category} ${article.author}`.toLowerCase().includes(query))).slice(0, 12);
  document.querySelector(".search-results").innerHTML = results.length ? results.map((article,index) => `<article class="search-result" data-search-index="${index}"><div><span class="category">${escapeHtml(article.category)}</span><h3>${escapeHtml(article.title)}</h3></div><span>→</span></article>`).join("") : '<div class="search-empty">Nenhuma notícia encontrada.</div>';
  document.querySelector(".search-results")._articles = results;
}

document.querySelector(".search-results").addEventListener("click", function (event) { const row = event.target.closest("[data-search-index]"); if (!row) return; const article = this._articles[Number(row.dataset.searchIndex)]; searchOverlay.classList.remove("open"); showArticle(article, "inicio"); });

document.querySelector(".ranking-list").addEventListener("click", function (event) { const row = event.target.closest("[data-ranking-id]"); if (!row) return; const article = getPublishedArticles().find(entry => entry.id === row.dataset.rankingId); if (article) showArticle(article,"inicio"); });

document.addEventListener("click", function (event) { if (event.target.closest(".empty-login")) openModal(); });

function loadSettings() {
  document.querySelector("#breaking-input").value = localStorage.getItem("parana-alerta-breaking") || document.querySelector(".breaking span").textContent;
  document.querySelector("#discord-input").value = localStorage.getItem("parana-alerta-discord") || "";
  document.querySelector("#instagram-input").value = localStorage.getItem("parana-alerta-instagram") || "";
}

document.querySelector("#settings-form").addEventListener("submit", function (event) { event.preventDefault(); const breaking = document.querySelector("#breaking-input").value.trim(); localStorage.setItem("parana-alerta-breaking", breaking); localStorage.setItem("parana-alerta-discord", document.querySelector("#discord-input").value.trim()); localStorage.setItem("parana-alerta-instagram", document.querySelector("#instagram-input").value.trim()); document.querySelector(".breaking span").textContent = breaking; document.querySelector(".settings-status").textContent = "Configurações guardadas."; });

const savedBreaking = localStorage.getItem("parana-alerta-breaking");
if (savedBreaking) document.querySelector(".breaking span").textContent = savedBreaking;
updateLiveStats();

async function publishCurrentComment() {
  const form = document.querySelector("#comment-form");
  let status = form.querySelector(".comment-status");
  if (!status) {
    status = document.createElement("span");
    status.className = "comment-status";
    form.appendChild(status);
  }

  const name = document.querySelector("#comment-name").value.trim();
  const text = document.querySelector("#comment-text").value.trim();
  if (!currentArticle) {
    status.textContent = "Não foi possível identificar esta notícia. Volta à capa e abre-a novamente.";
    return;
  }
  if (!name || text.length < 3) {
    status.textContent = "Preenche o nome e escreve pelo menos 3 caracteres.";
    return;
  }

  if (!currentArticle.id) {
    status.textContent = "Esta notícia ainda não está sincronizada com o Supabase.";
    return;
  }
  try {
    const comment = await window.paranaData.addComment(currentArticle.id, name, text);
    const comments = getComments(currentArticle);
    comments.push({ name: comment.author_name, text: comment.content, date: comment.created_at });
    localStorage.setItem(`parana-alerta-comments-${articleKey(currentArticle)}`, JSON.stringify(comments));
    form.reset();
    renderComments(currentArticle);
    status.textContent = "Comentário publicado.";
  } catch (error) {
    status.textContent = error.message || "Não foi possível publicar o comentário.";
  }
}

const commentButton = document.querySelector("#comment-form button");
commentButton.type = "submit";

const journalistButton = document.querySelector(".author-link");
journalistButton.type = "button";
journalistButton.onclick = function () {
  showStaticPage("profile");
};

const initialSection = location.hash.slice(1) || "inicio";
(async function initializeSupabaseSite() {
  await Promise.all([syncArticlesFromSupabase(), loadPublicAd()]);
  restorePublishedArticles();
  if (initialSection !== "inicio") showTopic(initialSection);
})();
