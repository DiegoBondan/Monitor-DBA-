const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const defaultHealthUrl = localHost ? "http://127.0.0.1:8000/api/health" : "https://monitor-dba.onrender.com/api/health";
const healthUrl = new URLSearchParams(window.location.search).get("api") || defaultHealthUrl;
const apiBase = healthUrl.replace(/\/health(?:\?.*)?$/, "");
const metricsUrl = `${apiBase}/metrics`;
const usersUrl = `${apiBase}/users/activity`;
const dashboardApiKey = (() => {
  const params = new URLSearchParams(window.location.search);
  const keyFromUrl = params.get("key");
  if (!keyFromUrl) return localStorage.getItem("dashboardApiKey") || "";
  localStorage.setItem("dashboardApiKey", keyFromUrl);
  params.delete("key");
  window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`);
  return keyFromUrl;
})();
const refreshIntervalMs = 3_000;
const elements = Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => [element.id, element]));
elements.endpoint.textContent = healthUrl;

function formatStatus(status) { return ({ online: "Online", offline: "Offline", degraded: "Degradado", not_configured: "Não configurado" })[status] || "Indisponível"; }
function setState(status, data = {}) {
  document.body.className = status === "online" ? "is-online" : status === "degraded" ? "is-degraded" : "is-offline";
  elements.connectionStatus.lastElementChild.textContent = formatStatus(status); elements.serviceStatus.textContent = formatStatus(status); elements.statusBadge.textContent = formatStatus(status);
  elements.serviceName.textContent = data.service || "supabase"; elements.latency.textContent = data.latency_ms == null ? "—" : `${data.latency_ms} ms`;
  elements.databaseStatus.textContent = data.database_status === "online" ? "🟢 OK" : data.database_status === "offline" ? "🔴 Indisponível" : "⚪ Não configurado";
  const healthError = friendlyError(data.error);
  elements.serviceDescription.textContent = status === "online" ? "O serviço está respondendo normalmente." : healthError || "Não foi possível consultar o serviço.";
  elements.latencyDescription.textContent = data.latency_ms == null ? "Sem medição disponível" : "Tempo da última consulta";
  elements.message.textContent = healthError || (status === "online" ? "Conexão concluída com sucesso." : "Verificação finalizada.");
}
const statusColors = { online: "#34d399", degraded: "#fbbf24", offline: "#fb7185", not_configured: "#5b6980" };
const chartFont = { family: "JetBrains Mono", size: 10 };
let historyChartInstance = null;
let breakdownChartInstance = null;
function renderHistory(history) {
  elements.historyEmpty.hidden = history.length > 0;
  const points = history.slice(-90);
  const chartData = {
    labels: points.map((point) => new Date(point.checked_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })),
    datasets: [{
      data: points.map((point) => point.latency_ms),
      borderColor: "#38bdf8", backgroundColor: "#38bdf826",
      pointBackgroundColor: points.map((point) => statusColors[point.status] || statusColors.not_configured),
      pointBorderColor: points.map((point) => statusColors[point.status] || statusColors.not_configured),
      pointRadius: points.length > 40 ? 0 : 3, pointHoverRadius: 5,
      borderWidth: 2, tension: .3, fill: true, spanGaps: true,
    }],
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { intersect: false, mode: "nearest" },
    scales: {
      x: { ticks: { color: "#8793ab", font: chartFont, maxTicksLimit: 8 }, grid: { color: "#ffffff0f" } },
      y: { beginAtZero: true, ticks: { color: "#8793ab", font: chartFont, callback: (value) => `${value} ms` }, grid: { color: "#ffffff0f" } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => (context.parsed.y == null ? "Sem medição" : `${context.parsed.y} ms`) } },
    },
  };
  if (historyChartInstance) { historyChartInstance.data = chartData; historyChartInstance.options = chartOptions; historyChartInstance.update(); }
  else { historyChartInstance = new Chart(elements.historyChart.getContext("2d"), { type: "line", data: chartData, options: chartOptions }); }
}
function renderBreakdown(history) {
  const counts = { online: 0, degraded: 0, offline: 0 };
  history.forEach((point) => { if (counts[point.status] !== undefined) counts[point.status] += 1; });
  const total = counts.online + counts.degraded + counts.offline;
  elements.breakdownEmpty.hidden = total > 0;
  const chartData = {
    labels: ["Online", "Degradado", "Offline"],
    datasets: [{ data: [counts.online, counts.degraded, counts.offline], backgroundColor: [statusColors.online, statusColors.degraded, statusColors.offline], borderColor: "#0b0c10", borderWidth: 2 }],
  };
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, animation: false, cutout: "62%",
    plugins: {
      legend: { position: "bottom", labels: { color: "#8793ab", font: { family: "JetBrains Mono", size: 11 }, padding: 14, boxWidth: 10, boxHeight: 10 } },
      tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed} (${total ? Math.round((context.parsed / total) * 100) : 0}%)` } },
    },
  };
  if (breakdownChartInstance) { breakdownChartInstance.data = chartData; breakdownChartInstance.options = chartOptions; breakdownChartInstance.update(); }
  else { breakdownChartInstance = new Chart(elements.statusPie.getContext("2d"), { type: "doughnut", data: chartData, options: chartOptions }); }
}
function renderMetrics(data) {
  const metricsError = friendlyError(data.error);
  elements.availability.textContent = `${data.availability_percent.toFixed(2)}%`; elements.requests.textContent = data.total_requests; elements.errors.textContent = data.error_count;
  elements.requestsDescription.textContent = metricsError || `${data.successful_requests} concluídas com sucesso`; elements.errorsDescription.textContent = data.error_count ? "Falhas ou respostas degradadas" : "Nenhuma falha registrada";
  elements.averageLatency.textContent = `Latência média: ${data.average_latency_ms == null ? "—" : `${data.average_latency_ms} ms`}`; elements.httpStatus.textContent = `HTTP: ${data.http_status ?? "—"}`; elements.historyCount.textContent = `${data.history.length} verificações`; renderHistory(data.history); renderBreakdown(data.history);
  elements.lastChecked.textContent = data.last_checked_at ? new Date(data.last_checked_at).toLocaleTimeString("pt-BR") : "—";
}
function escapeHtml(value) { const element = document.createElement("span"); element.textContent = value; return element.innerHTML; }
function friendlyError(message) {
  if (!message) return message;
  console.warn(message);
  return "Não foi possível carregar os dados no momento.";
}
let usersActivityChartInstance = null;
let usersRoleChartInstance = null;
function renderUsersCharts(data) {
  const hasUsers = data.active_count + data.inactive_count > 0;
  elements.usersActivityEmpty.hidden = hasUsers;
  const activityData = {
    labels: ["Ativos", "Inativos"],
    datasets: [{ data: [data.active_count, data.inactive_count], backgroundColor: [statusColors.online, statusColors.offline], borderColor: "#0b0c10", borderWidth: 2 }],
  };
  const activityOptions = {
    responsive: true, maintainAspectRatio: false, animation: false, cutout: "62%",
    plugins: {
      legend: { position: "bottom", labels: { color: "#8793ab", font: { family: "JetBrains Mono", size: 11 }, padding: 14, boxWidth: 10, boxHeight: 10 } },
      tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed}` } },
    },
  };
  if (usersActivityChartInstance) { usersActivityChartInstance.data = activityData; usersActivityChartInstance.options = activityOptions; usersActivityChartInstance.update(); }
  else { usersActivityChartInstance = new Chart(elements.usersActivityPie.getContext("2d"), { type: "doughnut", data: activityData, options: activityOptions }); }

  const roleCounts = {};
  data.users.forEach((user) => { const role = user.role || "Sem papel"; roleCounts[role] = (roleCounts[role] || 0) + 1; });
  const roleLabels = Object.keys(roleCounts);
  elements.usersRoleEmpty.hidden = roleLabels.length > 0;
  const roleData = {
    labels: roleLabels,
    datasets: [{ data: roleLabels.map((role) => roleCounts[role]), backgroundColor: "#38bdf8", borderRadius: 6, maxBarThickness: 34 }],
  };
  const roleOptions = {
    responsive: true, maintainAspectRatio: false, animation: false, indexAxis: "y",
    scales: {
      x: { beginAtZero: true, ticks: { color: "#8793ab", font: chartFont, precision: 0 }, grid: { color: "#ffffff0f" } },
      y: { ticks: { color: "#8793ab", font: chartFont }, grid: { display: false } },
    },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.parsed.x} usuário(s)` } } },
  };
  if (usersRoleChartInstance) { usersRoleChartInstance.data = roleData; usersRoleChartInstance.options = roleOptions; usersRoleChartInstance.update(); }
  else { usersRoleChartInstance = new Chart(elements.usersRoleChart.getContext("2d"), { type: "bar", data: roleData, options: roleOptions }); }
}
function renderUsers(data) {
  const userError = friendlyError(data.error);
  elements.activeUsers.textContent = data.active_count; elements.inactiveUsers.textContent = data.inactive_count; elements.totalUsers.textContent = data.users.length; elements.connections.textContent = `${data.active_count} / ${data.max_connections}`; elements.connectionsDescription.textContent = userError || "Sessões ativas nos últimos 5 min";
  elements.usersList.replaceChildren(); elements.usersMessage.textContent = userError || (data.users.length ? "" : "Nenhum perfil ou sessão foi encontrado.");
  data.users.forEach((user) => { const row = document.createElement("article"), name = user.name || "Usuário sem nome"; row.className = "user-row"; row.innerHTML = `<div class="user-avatar">${escapeHtml(name.trim().charAt(0).toUpperCase())}</div><div class="user-info"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(user.role)}</span></div><span class="user-state ${user.active ? "active" : "inactive"}">${user.active ? "Ativo" : "Inativo"}</span>`; elements.usersList.append(row); });
  renderUsersCharts(data);
}
async function getJson(url, extraHeaders = {}) { const response = await fetch(url, { headers: { Accept: "application/json", ...extraHeaders } }); if (!response.ok) throw new Error(`A API respondeu com HTTP ${response.status}.`); return response.json(); }
let secondsUntilNextCheck = refreshIntervalMs / 1000;
function tickCountdown() {
  secondsUntilNextCheck = Math.max(0, secondsUntilNextCheck - 1);
  elements.nextCheckLabel.textContent = `Próxima verificação em ${secondsUntilNextCheck}s`;
}
async function refreshDashboard() {
  const authHeaders = { "X-API-Key": dashboardApiKey };
  try {
    const health = await getJson(healthUrl); setState(health.status, health);
    const emptyMetrics = { availability_percent: 0, total_requests: 0, successful_requests: 0, error_count: 0, average_latency_ms: null, http_status: null, history: [], last_checked_at: null };
    const [metrics, users] = await Promise.all([
      getJson(metricsUrl, authHeaders).catch((error) => ({ ...emptyMetrics, error: error.message })),
      getJson(usersUrl, authHeaders).catch((error) => ({ active_count: 0, inactive_count: 0, users: [], max_connections: 0, error: error.message })),
    ]);
    renderMetrics(metrics); renderUsers(users);
    elements.usersUpdated.textContent = "Atualizado agora"; elements.updatedAt.textContent = `Atualizado às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())}`;
  } catch (error) { setState("offline", { error: error.message }); elements.updatedAt.textContent = "Falha ao atualizar"; } finally { secondsUntilNextCheck = refreshIntervalMs / 1000; elements.nextCheckLabel.textContent = `Próxima verificação em ${secondsUntilNextCheck}s`; }
}
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => { document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("is-selected", item === tab)); document.querySelectorAll("#overviewPanel, #usersPanel").forEach((panel) => { panel.hidden = panel.id !== tab.dataset.panel; }); }));
refreshDashboard(); window.setInterval(refreshDashboard, refreshIntervalMs); window.setInterval(tickCountdown, 1000);
