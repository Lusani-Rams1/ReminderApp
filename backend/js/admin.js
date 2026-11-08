
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
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
  };

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json"
  });

  async function getJson(path) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: authHeaders()
    });

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

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

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
        plugins: {
          legend: {
            position: type === "doughnut" ? "bottom" : "top",
            labels: {
              usePointStyle: true,
              boxWidth: 8
            }
          }
        },
        scales: type === "doughnut" ? {} : {
          x: {
            grid: { display: false },
            ticks: { color: "#8992a5" }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: "#8992a5"
            },
            grid: {
              color: "rgba(130,140,160,.14)"
            }
          }
        },
        ...options
      }
    });
  }

  // Load dashboard overview
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

    renderChart(
      "taskStatusChart",
      "doughnut",
      ["Completed", "Pending", "In progress"],
      [{
        data: [
          data.tasks.completed,
          data.tasks.pending,
          data.tasks.inProgress
        ],
        backgroundColor: ["#35a675", "#e5a443", "#6488df"],
        borderWidth: 0
      }]
    );
  }

  // Load dashboard trends
  async function loadTrends() {
    const data = await getJson("/api/admin/trends");

    const registrations = new Map(
      data.registrations.map(row => [row.month, Number(row.total)])
    );

    const taskCounts = new Map(
      data.tasksCreated.map(row => [row.month, Number(row.total)])
    );

    const months = [];
    const cursor = new Date();

    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - 5);

    for (let i = 0; i < 6; i++) {
      months.push(cursor.toISOString().slice(0, 7));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const labels = months.map(month =>
      new Date(month + "-01T00:00:00").toLocaleDateString(
        undefined,
        { month: "short", year: "2-digit" }
      )
    );

    renderChart("registrationsChart", "line", labels, [{
      label: "New students",
      data: months.map(month => registrations.get(month) || 0),
      borderColor: "#7466df",
      backgroundColor: "rgba(116,102,223,.12)",
      fill: true,
      tension: .35
    }]);

    renderChart("tasksChart", "bar", labels, [{
      label: "Tasks created",
      data: months.map(month => taskCounts.get(month) || 0),
      backgroundColor: "#6689df",
      borderRadius: 6
    }]);
  }

  // Check API and database health
  async function loadHealth() {
    try {
      const data = await getJson("/api/admin/health");

      setText("apiStatus", "Online");
      setText(
        "dbStatus",
        data.database === "connected" ? "Connected" : "Unavailable"
      );

      const apiDot = document.getElementById("apiDot");
      const dbDot = document.getElementById("dbDot");

      if (apiDot) apiDot.className = "health-dot ok";

      if (dbDot) {
        dbDot.className =
          data.database === "connected" ? "health-dot ok" : "health-dot bad";
      }

      setText(
        "healthChecked",
        data.checkedAt
          ? "Checked " + new Date(data.checkedAt).toLocaleTimeString()
          : ""
      );

    } catch (error) {
      setText("apiStatus", "Unable to check");
      setText("dbStatus", "Unavailable");

      const apiDot = document.getElementById("apiDot");
      const dbDot = document.getElementById("dbDot");

      if (apiDot) apiDot.className = "health-dot bad";
      if (dbDot) dbDot.className = "health-dot bad";

      throw error;
    }
  }

  // Load and display registered students
  async function loadStudents(search = "") {
    const tableBody = document.getElementById("studentsTableBody");
    const countElement = document.getElementById("studentCount");

    if (!tableBody) return;

    tableBody.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");

    loadingCell.colSpan = 4;
    loadingCell.textContent = "Loading student accounts...";

    loadingRow.appendChild(loadingCell);
    tableBody.appendChild(loadingRow);

    try {
      const data = await getJson(
        `/api/admin/students?search=${encodeURIComponent(search)}`
      );

      const students = Array.isArray(data.students)
        ? data.students
        : [];

      if (countElement) {
        countElement.textContent =
          `${data.total ?? students.length} students`;
      }

      tableBody.replaceChildren();

      if (students.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "No students found.";

        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
      }

      students.forEach(student => {
        const row = document.createElement("tr");

        const values = [
          student.fullName || "Not provided",
          student.studentNumber || "Not provided",
          student.email || "Not provided",
          student.createdAt
            ? new Date(student.createdAt).toLocaleDateString()
            : "Unknown"
        ];

        values.forEach(value => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });

        tableBody.appendChild(row);
      });

    } catch (error) {
      console.error("Student management error:", error);

      if (countElement) {
        countElement.textContent = "Unable to load students";
      }

      tableBody.replaceChildren();

      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 4;
      cell.textContent =
        error.message || "Unable to load student accounts.";

      row.appendChild(cell);
      tableBody.appendChild(row);
    }
  }

  // Load and display student activity
  async function loadActivity() {
    const tableBody = document.getElementById("activityTableBody");

    if (!tableBody) return;

    tableBody.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");

    loadingCell.colSpan = 4;
    loadingCell.textContent = "Loading student activity...";

    loadingRow.appendChild(loadingCell);
    tableBody.appendChild(loadingRow);

    try {
      const data = await getJson("/api/admin/activity");

      const stats = data.stats || {};

      setText("activeStudents", number(stats.activeStudents));
      setText("activityTasksCreated", number(stats.tasksCreated));
      setText("activityRemindersCreated", number(stats.remindersCreated));
      setText("activityNotifications", number(stats.notificationsReceived));

      const activities = Array.isArray(data.activities)
        ? data.activities
        : [];

      tableBody.replaceChildren();

      if (activities.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "No student activity recorded yet.";

        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
      }

      activities.forEach(activity => {
        const row = document.createElement("tr");

        const values = [
          activity.student || "Unknown student",
          activity.activityType || "Activity",
          activity.details || "No details",
          activity.activityDate
            ? new Date(activity.activityDate).toLocaleString()
            : "Unknown"
        ];

        values.forEach(value => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });

        tableBody.appendChild(row);
      });

    } catch (error) {
      console.error("Student activity error:", error);

      tableBody.replaceChildren();

      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 4;
      cell.textContent =
        error.message || "Unable to load student activity.";

      row.appendChild(cell);
      tableBody.appendChild(row);
    }
  }

  // Refresh all dashboard sections
  async function refreshDashboard() {
    const button = document.getElementById("refreshBtn");

    if (button) {
      button.disabled = true;
      button.textContent = "Refreshing…";
    }

    try {
      const studentSearch = document.getElementById("studentSearch");

      await Promise.all([
        loadOverview(),
        loadTrends(),
        loadHealth(),
        loadStudents(studentSearch ? studentSearch.value.trim() : ""),
        loadActivity()
      ]);

      setText(
        "lastUpdated",
        "Updated " + new Date().toLocaleTimeString()
      );

    } catch (error) {
      console.error("Admin dashboard:", error);
      showError(error.message || "Unable to load dashboard data.");

    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "↻ Refresh data";
      }
    }
  }

  // Set up dashboard event listeners
  document.addEventListener("DOMContentLoaded", () => {
    const studentSearch = document.getElementById("studentSearch");
    const studentSearchBtn = document.getElementById("studentSearchBtn");
    const refreshBtn = document.getElementById("refreshBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (studentSearchBtn && studentSearch) {
      studentSearchBtn.addEventListener("click", () => {
        loadStudents(studentSearch.value.trim());
      });

      studentSearch.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          loadStudents(studentSearch.value.trim());
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", refreshDashboard);
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.replace("login.html");
      });
    }
  });

  window.addEventListener("admin-authenticated", refreshDashboard);
})();
