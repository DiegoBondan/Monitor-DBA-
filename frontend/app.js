const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const defaultHealthUrl = localHost ? "http://127.0.0.1:8000/api/health" : "https://monitor-dba.onrender.com/api/health";
const healthUrl = new URLSearchParams(window.location.search).get("api") || defaultHealthUrl;
const apiBase = healthUrl.replace(/\/health(?:\?.*)?$/, "");
const metricsUrl = `${apiBase}/metrics`;
const usersUrl = `${apiBase}/users/activity`;
const refreshIntervalMs = 10_000;
const elements = Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => [element.id, element]));
elements.endpoint.textContent = healthUrl;

function formatStatus(status) { return ({ online: "Online", offline: "Offline", degraded: "Degradado", not_configured: "Não configurado" })[status] || "Indisponível"; }
function setState(status, data = {}) {
  document.body.className = status === "online" ? "is-online" : status === "degraded" ? "is-degraded" : "is-offline";
  elements.connectionStatus.lastElementChild.textContent = formatStatus(status); elements.serviceStatus.textContent = formatStatus(status); elements.statusBadge.textContent = formatStatus(status);
  elements.serviceName.textContent = data.service || "supabase"; elements.latency.textContent = data.latency_ms == null ? "—" : `${data.latency_ms} ms`;
  elements.databaseStatus.textContent = data.database_status === "online" ? "🟢 OK" : data.database_status === "offline" ? "🔴 Indisponível" : "⚪ Não configurado";
  elements.serviceDescription.textContent = status === "online" ? "O serviço está respondendo normalmente." : data.error || "Não foi possível consultar o serviço.";
  elements.latencyDescription.textContent = data.latency_ms == null ? "Sem medição disponível" : "Tempo da última consulta";
  elements.message.textContent = data.error || (status === "online" ? "Conexão concluída com sucesso." : "Verificação finalizada.");
}
function renderHistory(history) {
  elements.historyChart.replaceChildren(); if (!history.length) { elements.historyChart.textContent = "O histórico aparecerá após a primeira verificação configurada."; return; }
  const points = history.slice(-60), maxLatency = Math.max(...points.map((point) => point.latency_ms || 0), 1);
  points.forEach((point) => { const bar = document.createElement("span"); bar.className = `history-bar ${point.status}`; bar.style.height = `${Math.max(16, Math.round(((point.latency_ms || 0) / maxLatency) * 100))}%`; bar.title = `${new Date(point.checked_at).toLocaleString("pt-BR")}: ${formatStatus(point.status)}${point.latency_ms == null ? "" : `, ${point.latency_ms} ms`}`; elements.historyChart.append(bar); });
}
function renderMetrics(data) {
  elements.availability.textContent = `${data.availability_percent.toFixed(2)}%`; elements.requests.textContent = data.total_requests; elements.errors.textContent = data.error_count;
  elements.requestsDescription.textContent = `${data.successful_requests} concluídas com sucesso`; elements.errorsDescription.textContent = data.error_count ? "Falhas ou respostas degradadas" : "Nenhuma falha registrada";
  elements.averageLatency.textContent = `Latência média: ${data.average_latency_ms == null ? "—" : `${data.average_latency_ms} ms`}`; elements.httpStatus.textContent = `HTTP: ${data.http_status ?? "—"}`; elements.historyCount.textContent = `${data.history.length} verificações`; renderHistory(data.history);
  elements.lastChecked.textContent = data.last_checked_at ? new Date(data.last_checked_at).toLocaleTimeString("pt-BR") : "—";
}
function escapeHtml(value) { const element = document.createElement("span"); element.textContent = value; return element.innerHTML; }
function renderUsers(data) {
  elements.activeUsers.textContent = data.active_count; elements.inactiveUsers.textContent = data.inactive_count; elements.totalUsers.textContent = data.users.length; elements.connections.textContent = `${data.active_count} / ${data.max_connections}`; elements.connectionsDescription.textContent = data.error || "Sessões ativas nos últimos 5 min";
  elements.usersList.replaceChildren(); elements.usersMessage.textContent = data.error || (data.users.length ? "" : "Nenhum perfil ou sessão foi encontrado.");
  data.users.forEach((user) => { const row = document.createElement("article"), name = user.name || "Usuário sem nome"; row.className = "user-row"; row.innerHTML = `<div class="user-avatar">${escapeHtml(name.trim().charAt(0).toUpperCase())}</div><div class="user-info"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(user.role)}</span></div><span class="user-state ${user.active ? "active" : "inactive"}">${user.active ? "Ativo" : "Inativo"}</span>`; elements.usersList.append(row); });
}
async function getJson(url) { const response = await fetch(url, { headers: { Accept: "application/json" } }); if (!response.ok) throw new Error(`A API respondeu com HTTP ${response.status}.`); return response.json(); }
async function refreshDashboard() {
  elements.refreshButton.disabled = true; elements.refreshButton.textContent = "Atualizando...";
  try { const health = await getJson(healthUrl); setState(health.status, health); const [metrics, users] = await Promise.all([getJson(metricsUrl), getJson(usersUrl).catch((error) => ({ active_count: 0, inactive_count: 0, users: [], error: error.message }))]); renderMetrics(metrics); renderUsers(users); elements.usersUpdated.textContent = "Atualizado agora"; elements.updatedAt.textContent = `Atualizado às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())}`; } catch (error) { setState("offline", { error: error.message }); elements.updatedAt.textContent = "Falha ao atualizar"; } finally { elements.refreshButton.disabled = false; elements.refreshButton.textContent = "↻ Atualizar"; }
}
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => { document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("is-selected", item === tab)); document.querySelectorAll("#overviewPanel, #usersPanel").forEach((panel) => { panel.hidden = panel.id !== tab.dataset.panel; }); }));
elements.refreshButton.addEventListener("click", refreshDashboard); refreshDashboard(); window.setInterval(refreshDashboard, refreshIntervalMs);
