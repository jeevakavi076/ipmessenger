
"use strict";

const $ = (selector) => document.querySelector(selector);

const demoUsers = [
  { id: "ADMIN001", name: "Office Admin", department: "Administration", title: "Administrator", role: "admin", online: true },
  { id: "EMP001", name: "Ananya Sharma", department: "IT", title: "Software Engineer", role: "employee", online: true },
  { id: "EMP002", name: "Rahul Kumar", department: "Finance", title: "Accountant", role: "employee", online: true },
  { id: "EMP003", name: "Priya Nair", department: "HR", title: "HR Executive", role: "employee", online: false },
  { id: "EMP004", name: "Arun Kumar", department: "Operations", title: "Team Lead", role: "employee", online: true }
];

const demoPasswords = {
  ADMIN001: "Admin123!",
  EMP001: "Demo123!",
  EMP002: "Demo123!",
  EMP003: "Demo123!",
  EMP004: "Demo123!"
};

let employees = demoUsers.map((user) => ({ ...user }));
let currentUser = null;
let selectedRole = "employee";
let activeEmployeeId = null;
let activeView = "messages";
let unread = {};
let nextMessageId = 1;
let toastTimeout;

const conversations = {
  EMP001: [
    { id: nextMessageId++, sender: "EMP001", text: "Hi! Good morning.", time: "09:30" },
    { id: nextMessageId++, sender: "EMP001", text: "Please share the project update when you get a chance.", time: "09:31" },
    { id: nextMessageId++, sender: "ADMIN001", text: "Good morning! I will send the update shortly.", time: "09:34" }
  ],
  EMP002: [
    { id: nextMessageId++, sender: "EMP002", text: "The monthly report is ready for review.", time: "10:05" }
  ],
  EMP003: [],
  EMP004: []
};

const groups = [
  { name: "Office Team", members: 5, description: "General office coordination" },
  { name: "Project Updates", members: 3, description: "Project discussion and status updates" },
  { name: "IT Support", members: 2, description: "Technical assistance and IT updates" }
];

const announcements = [
  {
    title: "Welcome to Office Messenger",
    body: "This is the frontend preview of the internal office messaging application. Real LAN delivery will be enabled in the backend phase.",
    author: "Office Admin",
    date: "Today"
  },
  {
    title: "Office communication",
    body: "Use this preview to explore the contacts list, chat interface, groups and administration screens.",
    author: "Office Admin",
    date: "Today"
  }
];

function makeElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function getEmployee(id) {
  return employees.find((employee) => employee.id === id);
}

function getConversation(id) {
  if (!conversations[id]) conversations[id] = [];
  return conversations[id];
}

function timeNow() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function setLoginRole(role) {
  selectedRole = role;
  document.querySelectorAll(".login-tab").forEach((button) => {
    button.classList.toggle("selected", button.dataset.role === role);
  });
  $("#loginError").textContent = "";
}

document.querySelectorAll(".login-tab").forEach((button) => {
  button.addEventListener("click", () => setLoginRole(button.dataset.role));
});

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const id = $("#employeeId").value.trim().toUpperCase();
  const password = $("#loginPassword").value;
  const user = getEmployee(id);

  if (!user || user.role !== selectedRole || demoPasswords[id] !== password) {
    $("#loginError").textContent =
      "Invalid ID, password, or login type. Check the demo credentials.";
    return;
  }

  currentUser = user;
  activeEmployeeId = null;
  activeView = "messages";
  $("#loginScreen").classList.add("hidden");
  $("#appScreen").classList.remove("hidden");
  $("#headerUser").textContent = user.name;
  $("#profileName").textContent = user.name;
  $("#profileRole").textContent = user.role === "admin" ? "Administrator" : user.title;
  $("#profileAvatar").textContent = initials(user.name);
  $("#adminNavBtn").classList.toggle("hidden", user.role !== "admin");
  $("#newAnnouncementBtn").classList.toggle("hidden", user.role !== "admin");
  $("#loginPassword").value = "";

  renderContacts();
  renderGroups();
  renderAnnouncements();
  renderAdmin();
  switchView("messages");
  showChatHome();
});

function logout() {
  currentUser = null;
  activeEmployeeId = null;
  $("#appScreen").classList.add("hidden");
  $("#loginScreen").classList.remove("hidden");
  $("#employeeId").value = "";
  $("#loginPassword").value = "";
  $("#loginError").textContent = "";
  $("#searchInput").value = "";
  setLoginRole("employee");
}

$("#logoutBtn").addEventListener("click", logout);

function renderContacts() {
  const list = $("#contactList");
  list.replaceChildren();

  const query = $("#searchInput").value.trim().toLowerCase();
  const contacts = employees.filter((employee) => {
    if (!currentUser || employee.id === currentUser.id) return false;
    const text = `${employee.id} ${employee.name} ${employee.department} ${employee.title}`.toLowerCase();
    return text.includes(query);
  });

  $("#contactCount").textContent = String(contacts.length);

  if (contacts.length === 0) {
    list.append(makeElement("div", "empty-contact", "No employees found"));
  }

  contacts.forEach((employee) => {
    const item = makeElement("div", "contact-item");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Open chat with ${employee.name}`);
    if (activeEmployeeId === employee.id && activeView === "messages") {
      item.classList.add("selected");
    }

    const avatar = makeElement("div", "avatar contact-avatar", initials(employee.name));
    const info = makeElement("div", "contact-info");
    info.append(
      makeElement("strong", "", employee.name),
      makeElement("small", "", `${employee.id} · ${employee.department}`)
    );

    const meta = makeElement("div", "contact-meta");
    const dot = makeElement("span", `presence-dot ${employee.online ? "online" : ""}`);
    dot.title = employee.online ? "Online (demo)" : "Offline (demo)";
    meta.append(dot);

    if (unread[employee.id]) {
      meta.append(makeElement("span", "unread-bubble", String(unread[employee.id])));
    }

    item.append(avatar, info, meta);
    item.addEventListener("click", () => openChat(employee.id));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openChat(employee.id);
      }
    });
    list.append(item);
  });

  const unreadTotal = Object.values(unread).reduce((sum, count) => sum + count, 0);
  $("#unreadTotal").textContent = String(unreadTotal);
  $("#unreadTotal").classList.toggle("hidden", unreadTotal === 0);
}

$("#searchInput").addEventListener("input", renderContacts);
$("#clearSearchBtn").addEventListener("click", () => {
  $("#searchInput").value = "";
  renderContacts();
  $("#searchInput").focus();
});

function showChatHome() {
  $("#emptyChat").classList.remove("hidden");
  $("#activeChat").classList.add("hidden");
}

function openChat(employeeId) {
  const employee = getEmployee(employeeId);
  if (!employee || !currentUser) return;

  activeEmployeeId = employeeId;
  activeView = "messages";
  unread[employeeId] = 0;
  switchView("messages");

  $("#emptyChat").classList.add("hidden");
  $("#activeChat").classList.remove("hidden");
  $("#chatAvatar").textContent = initials(employee.name);
  $("#chatName").textContent = employee.name;
  $("#chatStatus").textContent = employee.online ? "Online · demo status" : "Offline · demo status";
  $("#conversationLabel").textContent = `Private conversation · ${employee.id}`;
  $("#messageInput").value = "";
  updateCharacterCount();

  renderMessages();
  renderContacts();
  $("#messageInput").focus();
}

function renderMessages() {
  const area = $("#messages");
  area.replaceChildren();

  const divider = makeElement("div", "date-divider");
  divider.append(makeElement("span", "", "Today"));
  area.append(divider);

  const conversation = getConversation(activeEmployeeId);

  if (conversation.length === 0) {
    const empty = makeElement("div", "empty-chat");
    empty.style.minHeight = "180px";
    empty.append(
      makeElement("h2", "", "No messages yet"),
      makeElement("p", "", "Start the conversation by sending a message.")
    );
    area.append(empty);
    return;
  }

  conversation.forEach((message) => {
    const mine = message.sender === currentUser.id;
    const sender = getEmployee(message.sender);
    const row = makeElement("div", `message-row ${mine ? "mine" : ""}`);
    const block = makeElement("div", "message-block");

    if (!mine) block.append(makeElement("div", "message-author", sender?.name || message.sender));

    const bubble = makeElement("div", "message-bubble", message.text);
    const meta = makeElement("div", "message-meta");
    meta.append(makeElement("span", "", message.time));

    if (mine) meta.append(makeElement("span", "read-mark", "✓ Sent · demo"));

    block.append(bubble, meta);
    row.append(block);
    area.append(row);
  });

  area.scrollTop = area.scrollHeight;
}

function sendMessage() {
  if (!activeEmployeeId) {
    showToast("Select an employee first.");
    return;
  }

  const input = $("#messageInput");
  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  if (text.length > 5000) {
    showToast("Message must be 5000 characters or fewer.");
    return;
  }

  getConversation(activeEmployeeId).push({
    id: nextMessageId++,
    sender: currentUser.id,
    text,
    time: timeNow()
  });

  input.value = "";
  updateCharacterCount();
  renderMessages();
  renderContacts();
  $("#composeStatus").textContent = "Saved in this preview";
  $("#footerStatus").textContent = "Local demo message — not delivered over LAN";
}

$("#messageForm").addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

$("#messageInput").addEventListener("input", updateCharacterCount);
$("#messageInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

function updateCharacterCount() {
  $("#charCount").textContent = `${$("#messageInput").value.length} / 5000`;
}

$("#chatInfoBtn").addEventListener("click", () => {
  const employee = getEmployee(activeEmployeeId);
  if (employee) {
    showToast(`${employee.name} · ${employee.department} · ${employee.id}`);
  }
});

$("#attachBtn").addEventListener("click", () => {
  showToast("File transfer is not connected yet. It will be added in the backend phase.");
});

function switchView(view) {
  if (!currentUser) return;
  if (view === "admin" && currentUser.role !== "admin") {
    showToast("Administrator access required.");
    return;
  }

  activeView = view;
  const views = {
    messages: $("#chatView"),
    groups: $("#groupsView"),
    announcements: $("#announcementsView"),
    admin: $("#adminView")
  };

  Object.entries(views).forEach(([key, element]) => {
    element.classList.toggle("hidden", key !== view);
  });

  document.querySelectorAll(".side-action").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  $("#contactHeading").textContent = view === "groups" ? "GROUPS" : "CONTACTS";
  if (view === "messages" && activeEmployeeId) renderContacts();
}

document.querySelectorAll(".side-action").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

function renderGroups() {
  const list = $("#groupList");
  list.replaceChildren();

  groups.forEach((group) => {
    const card = makeElement("div", "group-card");
    card.append(
      makeElement("div", "group-symbol", "▤"),
      makeElement("div", "", "")
    );
    const detail = card.lastElementChild;
    detail.append(
      makeElement("strong", "", group.name),
      makeElement("small", "", `${group.members} members · ${group.description}`)
    );
    list.append(card);
  });

  $("#statGroups").textContent = String(groups.length);
}

$("#newGroupBtn").addEventListener("click", () => {
  showToast("Group creation will be enabled with the admin/backend features.");
});

function renderAnnouncements() {
  const list = $("#announcementList");
  list.replaceChildren();

  announcements.forEach((announcement) => {
    const card = makeElement("article", "announcement-card");
    card.append(
      makeElement("h3", "", announcement.title),
      makeElement("p", "", announcement.body),
      makeElement("small", "", `${announcement.author} · ${announcement.date}`)
    );
    list.append(card);
  });
}

$("#newAnnouncementBtn").addEventListener("click", () => {
  if (currentUser?.role !== "admin") {
    showToast("Administrator access required.");
    return;
  }

  const title = window.prompt("Announcement title:");
  if (title === null || !title.trim()) return;

  const body = window.prompt("Announcement message:");
  if (body === null || !body.trim()) return;

  announcements.unshift({
    title: title.trim(),
    body: body.trim(),
    author: currentUser.name,
    date: "Just now"
  });

  renderAnnouncements();
  showToast("Preview announcement added. It has not been sent to other computers.");
});

$("#employeeForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (currentUser?.role !== "admin") {
    showToast("Administrator access required.");
    return;
  }

  const id = $("#newEmployeeId").value.trim().toUpperCase();
  const name = $("#newEmployeeName").value.trim();
  const department = $("#newEmployeeDept").value.trim();
  const title = $("#newEmployeeTitle").value.trim() || "Employee";
  const message = $("#employeeFormMessage");

  if (!/^[A-Z0-9_-]{3,20}$/.test(id)) {
    message.textContent = "Use 3–20 letters, numbers, _ or - for the Employee ID.";
    message.style.color = "#b42318";
    return;
  }

  if (employees.some((employee) => employee.id === id)) {
    message.textContent = "That Employee ID already exists.";
    message.style.color = "#b42318";
    return;
  }

  employees.push({
    id, name, department, title, role: "employee", online: false
  });

  // Preview only: this account is not persisted and has no login password.
  message.textContent = `${name} added to this running preview. It will reset when the app closes.`;
  message.style.color = "#237b52";
  $("#employeeForm").reset();

  renderContacts();
  renderAdmin();
  showToast("Employee added to the current preview.");
});

function renderAdmin() {
  $("#statEmployees").textContent = String(employees.filter((employee) => employee.role === "employee").length);
  $("#statOnline").textContent = String(employees.filter((employee) => employee.online).length);

  const tbody = $("#employeeTableBody");
  tbody.replaceChildren();

  employees.forEach((employee) => {
    const row = document.createElement("tr");
    const id = makeElement("td", "", employee.id);
    const name = makeElement("td", "", employee.name);
    const dept = makeElement("td", "", employee.department);
    const status = makeElement("td", "table-status", employee.online ? "Online (demo)" : "Offline (demo)");
    row.append(id, name, dept, status);
    tbody.append(row);
  });
}

function initialize() {
  $("#loginScreen").classList.remove("hidden");
  $("#appScreen").classList.add("hidden");
  renderGroups();
  renderAnnouncements();
}

initialize();
