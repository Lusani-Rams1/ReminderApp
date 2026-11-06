


const iconByType = {
    task: "fa-clipboard-list",
    exam: "fa-graduation-cap",
    note: "fa-sticky-note",
    system: "fa-circle-info"
};

let notifications = [];
let activeFilter = "all";

async function loadNotifications() {
    try {
        const firebase = await window.CampusFirebase;
        await firebase.watchItems('notifications', records => {
            notifications = records.map(n => ({...n, notification_id: n.id, created_at: n.timestamp, read: Boolean(n.isRead), type: n.category === 'Assignment' ? 'task' : n.category === 'Exam' ? 'exam' : 'system'}));
            render();
        }, error => showNotificationError(firebase.friendlyError(error)));
    } catch (error) { showNotificationError(error.message); }
}

function showNotificationError(message) {
    const list = document.getElementById("notifList");
    const empty = document.getElementById("notifEmpty");

    if (list) list.replaceChildren();

    if (empty) {
        empty.textContent = message;
        empty.style.display = "block";
    }
}

function formatNotificationTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function render() {
    const list = document.getElementById("notifList");
    const empty = document.getElementById("notifEmpty");

    if (!list || !empty) {
        console.error("Notification list elements were not found.");
        return;
    }

    list.replaceChildren();

    const visible = notifications.filter(n => {
        if (activeFilter === "all") return true;
        if (activeFilter === "unread") return !n.read;
        return n.type === activeFilter;
    });

    empty.textContent = visible.length
        ? ""
        : "No notifications to show.";

    empty.style.display = visible.length ? "none" : "block";

    visible.forEach(n => {
        const card = document.createElement("div");
        card.className = "notif-card" + (n.read ? "" : " unread");
        card.dataset.id = n.notification_id;

        const icon = document.createElement("div");
        icon.className = `notif-icon type-${n.type}`;

        const iconElement = document.createElement("i");
        iconElement.className =
            `fas ${iconByType[n.type] || "fa-bell"}`;
        icon.appendChild(iconElement);

        const body = document.createElement("div");
        body.className = "notif-body";

        const topRow = document.createElement("div");
        topRow.className = "notif-top-row";

        const title = document.createElement("div");
        title.className = "notif-title";
        title.textContent = n.title || "CampusSync Notification";

        const time = document.createElement("div");
        time.className = "notif-time";
        time.textContent = formatNotificationTime(n.created_at);

        topRow.append(title, time);

        const message = document.createElement("div");
        message.className = "notif-message";
        message.textContent = n.message || "";

        body.append(topRow, message);
        card.append(icon, body);

        if (!n.read) {
            const dot = document.createElement("div");
            dot.className = "notif-dot";
            dot.title = "Unread";
            card.appendChild(dot);
        }

        card.addEventListener("click", async () => {
            if (!n.read) {
                await markAsRead(n.notification_id);
            }
        });

        list.appendChild(card);
    });

    // Update the bell's unread badge if the page has one.
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById("unreadCount");

    if (badge) {
        badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
        badge.style.display = unreadCount ? "inline-flex" : "none";
    }
}

async function markAsRead(notificationId) {
    try { await (await window.CampusFirebase).updateItem('notifications', notificationId, {isRead: true}); }
    catch (error) { alert(error.message); }
}

const markAllBtn = document.getElementById("markAllBtn");

if (markAllBtn) {
    markAllBtn.addEventListener("click", async () => {
        const unread = notifications.filter(n => !n.read);

        for (const notification of unread) {
            await markAsRead(notification.notification_id);
        }
    });
}

const clearAllBtn = document.getElementById("clearAllBtn");

if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
        if (!confirm('Delete all your saved notifications?')) return;
        try {
            const firebase = await window.CampusFirebase;
            for (const item of notifications) await firebase.removeItem('notifications', item.id);
        } catch (error) { alert(error.message); }
    });
}

document.querySelectorAll(".notif-filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".notif-filter-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
        activeFilter = button.dataset.filter;
        render();
    });
});

loadNotifications();
