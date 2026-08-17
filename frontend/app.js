const API_URL = new URLSearchParams(window.location.search).get("api") || "http://127.0.0.1:8000/api/health";
const USERS_API_URL = API_URL.replace(/\/health(?:\?.*)?$/, "/users/activity");
const REFRESH_INTERVAL_MS = 2_000;

const elements = {
  button: document.querySelector("#refreshButton"),
  updated: document.querySelector("#updatedAt"),
  connection: document.querySelector("#connectionStatus"),
  status: document.querySelector("#serviceStatus"),
  description: document.querySelector("#serviceDescription"),
  latency: document.querySelector("#latency"),
  latencyDescription: document.querySelector("#latencyDescription"),
  httpStatus: document.querySelector("#httpStatus"),
  httpDescription: document.querySelector("#httpDescription"),
  badge: document.querySelector("#statusBadge"),
  serviceName: document.querySelector("#serviceName"),
  endpoint: document.querySelector("#endpoint"),
  message: document.querySelector("#message"),
  activeUsers: document.querySelector("#activeUsers"),
  inactiveUsers: document.querySelector("#inactiveUsers"),
  totalUsers: document.querySelector("#totalUsers"),
  usersList: document.querySelector("#usersList"),
  usersMessage: document.querySelector("#usersMessage"),
  usersUpdated: document.querySelector("#usersUpdated"),
};

elements.endpoint.textContent = API_URL;

function formatStatus(status) {
  return ({ online: "Online", offline: "Offline", degraded: "Degradado", not_configured: "Não configurado" })[status] || "Indisponível";
}

function setState(status, data = {}) {
  const label = formatStatus(status);
  document.body.classList.remove("is-online", "is-offline", "is-degraded");
  document.body.classList.add(status === "online" ? "is-online" : status === "degraded" ? "is-degraded" : "is-offline");
  elements.connection.lastElementChild.textContent = label;
  elements.status.textContent = label;
  elements.badge.textContent = label;
  elements.serviceName.textContent = data.service || "supabase";
  elements.latency.innerHTML = data.latency_ms == null ? "— <small>ms</small>" : `${data.latency_ms} <small>ms</small>`;
  elements.httpStatus.textContent = data.http_status ?? "—";
  elements.description.textContent = status === "online" ? "O serviço está respondendo normalmente." : data.error || "Não foi possível consultar o serviço.";
  elements.latencyDescription.textContent = data.latency_ms == null ? "Sem medição disponível" : "Tempo de resposta da última consulta";
  elements.httpDescription.textContent = data.http_status ? "Código retornado pelo Supabase" : "Sem código de resposta";
  elements.message.textContent = data.error || (status === "online" ? "Conexão concluída com sucesso." : "Verificação finalizada.");
}

async function refreshHealth() {
  elements.button.disabled = true;
  elements.button.innerHTML = "<span aria-hidden=\"true\">↻</span> Atualizando...";
  try {
    const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`A API respondeu com HTTP ${response.status}.`);
    const data = await response.json();
    setState(data.status, data);
    elements.updated.textContent = `Atualizado às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())}`;
  } catch (error) {
    setState("offline", { error: error.message });
    elements.updated.textContent = "Falha ao atualizar";
  } finally {
    elements.button.disabled = false;
    elements.button.innerHTML = "<span aria-hidden=\"true\">↻</span> Atualizar";
  }
}

function formatLastSeen(value) {
  if (!value) return "Sem acesso registrado";
  return `Último acesso: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))}`;
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function renderUsers(data) {
  elements.activeUsers.textContent = data.active_count;
  elements.inactiveUsers.textContent = data.inactive_count;
  elements.totalUsers.textContent = data.users.length;
  elements.usersList.replaceChildren();
  elements.usersMessage.textContent = data.error || (data.users.length ? "" : "Nenhum perfil ou sessão foi encontrado.");
  data.users.forEach((user) => {
    const row = document.createElement("article");
    row.className = "user-row";
    const name = user.name || "Usuário sem nome";
    row.innerHTML = `<div class="user-avatar">${escapeHtml(name.trim().charAt(0).toUpperCase())}</div><div class="user-info"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(user.role)} · ${escapeHtml(formatLastSeen(user.last_seen))}</span></div><span class="user-state ${user.active ? "active" : "inactive"}">${user.active ? "Ativo" : "Inativo"}</span>`;
    elements.usersList.append(row);
  });
}

async function refreshUsers() {
  try {
    const response = await fetch(USERS_API_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`A API respondeu com HTTP ${response.status}.`);
    renderUsers(await response.json());
    elements.usersUpdated.textContent = "Atualizado agora";
  } catch (error) {
    renderUsers({ active_count: 0, inactive_count: 0, users: [], error: error.message });
    elements.usersUpdated.textContent = "Indisponível";
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("is-selected", item === tab));
    document.querySelectorAll("#overviewPanel, #usersPanel").forEach((panel) => { panel.hidden = panel.id !== tab.dataset.panel; });
    if (tab.dataset.panel === "usersPanel") refreshUsers();
  });
});

elements.button.addEventListener("click", refreshHealth);
refreshHealth();
refreshUsers();
window.setInterval(refreshHealth, REFRESH_INTERVAL_MS);
window.setInterval(refreshUsers, REFRESH_INTERVAL_MS);
