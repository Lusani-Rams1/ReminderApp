(() => {
  const API_BASE_URL = "https://reminderapp-production-36c1.up.railway.app";
  const charts = {};

  const number = value => Number(value || 0).toLocaleString();
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const showError = message => {
    const toast = document.getElementById("dashboardError");
    toast.textContent = message;
    toast.classList.add("show");
  };
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json"
  });

  async function getJson(path) {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("login.html");
      throw new Error("Your session has expired. Please log in again.");
    }
    if (response.status === 403) {
      window.location.replace("dashboard.html");
      throw new Error("Administrator access is required.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }

  function renderChart(id, type, labels, datasets, options = {}) {
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === "undefined") return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(canvas, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: type === "doughnut" ? "bottom" : "top", labels: { usePointStyle: true, boxWidth: 8 } } },
        scales: type === "doughnut" ? {} : {
          x: { grid: { display: false }, ticks: { color: "#8992a5" } },
          y: { beginAtZero: true, ticks: { precision: 0, color: "#8992a5" }, grid: { color: "rgba(130,140,160,.14)" } }
        },
        ...options
      }
    });
  }

  async function loadOverview() {
    const data = await getJson("/api/admin/overview");
    setText("totalStudents", number(data.users.totalStudents));
    setText("totalTasks", number(data.tasks.total));
    setText("completedTasks", number(data.tasks.completed));
    setText("overdueTasks", number(data.tasks.overdue));
    setText("sentReminders", number(data.reminders.sent));
    setText("totalNotifications", number(data.notifications.total));
    setText("reminderSentDetail", number(data.reminders.sent));
    setText("reminderPendingDetail", number(data.reminders.pending));
    setText("reminderCancelledDetail", number(data.reminders.cancelled));
    setText("unreadNotifications", number(data.notifications.unread));

    renderChart("taskStatusChart", "doughnut",
      ["Completed", "Pending", "In progress"],
      [{ data: [data.tasks.completed, data.tasks.pending, data.tasks.inProgress],
         backgroundColor: ["#35a675", "#e5a443", "#6488df"], borderWidth: 0 }]
    );
  }

  async function loadTrends() {
    const data = await getJson("/api/admin/trends");
    const registrations = new Map(data.registrations.map(row => [row.month, Number(row.total)]));
    const taskCounts = new Map(data.tasksCreated.map(row => [row.month, Number(row.total)]));
    const months = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - 5);
    for (let i = 0; i < 6; i++) {
      months.push(cursor.toISOString().slice(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const labels = months.map(month => new Date(month + "-01T00:00:00").toLocaleDateString(undefined, { month: "short", year: "2-digit" }));
    renderChart("registrationsChart", "line", labels, [{
      label: "New students", data: months.map(month => registrations.get(month) || 0),
      borderColor: "#7466df", backgroundColor: "rgba(116,102,223,.12)", fill: true, tension: .35
    }]);
    renderChart("tasksChart", "bar", labels, [{
      label: "Tasks created", data: months.map(month => taskCounts.get(month) || 0),
      backgroundColor: "#6689df", borderRadius: 6
    }]);
  }

  async function loadHealth() {
    try {
      const data = await getJson("/api/admin/health");
      setText("apiStatus", "Online");
      setText("dbStatus", data.database === "connected" ? "Connected" : "Unavailable");
      document.getElementById("apiDot").className = "health-dot ok";
      document.getElementById("dbDot").className = data.database === "connected" ? "health-dot ok" : "health-dot bad";
      setText("healthChecked", data.checkedAt ? "Checked " + new Date(data.checkedAt).toLocaleTimeString() : "");
    } catch (error) {
      setText("apiStatus", "Unable to check");
      setText("dbStatus", "Unavailable");
      document.getElementById("apiDot").className = "health-dot bad";
      document.getElementById("dbDot").className = "health-dot bad";
      throw error;
    }
  }

  async function refreshDashboard() {
    const button = document.getElementById("refreshBtn");
    button.disabled = true;
    button.textContent = "Refreshing…";
    try {
      await Promise.all([loadOverview(), loadTrends(), loadHealth()]);
      setText("lastUpdated", "Updated " + new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Admin dashboard:", error);
      showError(error.message || "Unable to load dashboard data.");
    } finally {
      button.disabled = false;
      button.textContent = "↻ Refresh data";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("refreshBtn").addEventListener("click", refreshDashboard);
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("login.html");
    });
  });

  window.addEventListener("admin-authenticated", refreshDashboard);
})();
