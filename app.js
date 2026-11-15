
const STORAGE_KEY = "ritmo-data";

const defaultData = {
  tasks: [],
  challenges: [],
  shared: [],
  categories: ["Personal", "Trabajo", "Casa", "Estudios"]
};

let data;

try {
  data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData;
} catch {
  data = defaultData;
}

data.tasks ||= [];
data.challenges ||= [];
data.shared ||= [];
data.categories ||= [...defaultData.categories];

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// NAVEGACIÓN
document.querySelectorAll(".nav-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".section").forEach(item => item.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(button.dataset.section).classList.add("active");
  });
});

// FECHA
const today = document.getElementById("today");
if (today) {
  today.textContent = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

// CATEGORÍAS
function renderCategories() {
  const select = document.getElementById("task-category");
  const list = document.getElementById("category-list");

  if (select) {
    const previous = select.value;
    select.innerHTML = data.categories.map(category =>
      `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
    ).join("");

    if (data.categories.includes(previous)) select.value = previous;
  }

  if (list) {
    list.innerHTML = `
      <p class="category-heading">Tus categorías</p>
      <div class="category-chips">
        ${data.categories.map(category => `
          <span class="category-chip">
            ${escapeHTML(category)}
            ${["Personal", "Trabajo", "Casa", "Estudios"].includes(category)
              ? ""
              : `<button type="button" class="delete-category" data-category="${escapeHTML(category)}" aria-label="Eliminar ${escapeHTML(category)}">×</button>`
            }
          </span>
        `).join("")}
      </div>
    `;
  }
}

document.getElementById("add-category")?.addEventListener("click", () => {
  const input = document.getElementById("new-category");
  const name = input.value.trim();

  if (!name) {
    alert("Escribe un nombre para la categoría.");
    return;
  }

  if (data.categories.some(category => category.toLowerCase() === name.toLowerCase())) {
    alert("Esa categoría ya existe.");
    return;
  }

  data.categories.push(name);
  saveData();
  renderCategories();
  document.getElementById("task-category").value = name;
  input.value = "";
});

document.getElementById("category-list")?.addEventListener("click", event => {
  const button = event.target.closest(".delete-category");
  if (!button) return;

  const category = button.dataset.category;
  const used = data.tasks.some(task => task.category === category);

  if (used && !confirm("Hay tareas con esta categoría. ¿Quieres eliminarla igualmente?")) return;

  data.categories = data.categories.filter(item => item !== category);
  data.tasks.forEach(task => {
    if (task.category === category) task.category = "Personal";
  });

  saveData();
  renderCategories();
  renderTasks();
});

// TAREAS
function renderTasks() {
  const list = document.getElementById("task-list");
  const pending = document.getElementById("pending-count");

  if (!list) return;

  const pendingTasks = data.tasks.filter(task => !task.completed);

  if (pending) {
    pending.textContent = `${pendingTasks.length} tareas pendientes`;
  }

  if (data.tasks.length === 0) {
    list.innerHTML = `<p class="empty-state">Todavía no tienes tareas. ¡Añade la primera!</p>`;
    renderProgress();
    return;
  }

  list.innerHTML = data.tasks.map(task => `
    <article class="task-item ${task.completed ? "completed" : ""}">
      <label class="task-main">
        <input type="checkbox" data-task-check="${task.id}" ${task.completed ? "checked" : ""}>
        <span>${escapeHTML(task.title)}</span>
      </label>
      <div class="task-details">
        <span class="task-tag">${escapeHTML(task.category || "Personal")}</span>
        <span class="task-tag priority-${(task.priority || "Media").toLowerCase()}">${escapeHTML(task.priority || "Media")}</span>
        ${task.date ? `<span class="task-tag">${escapeHTML(task.date)}</span>` : ""}
      </div>
      <button type="button" class="delete-task" data-task-delete="${task.id}">Eliminar</button>
    </article>
  `).join("");

  renderProgress();
}

document.getElementById("task-form")?.addEventListener("submit", event => {
  event.preventDefault();

  const title = document.getElementById("task-input").value.trim();
  if (!title) return;

  data.tasks.push({
    id: Date.now().toString(),
    title,
    date: document.getElementById("task-date").value,
    priority: document.getElementById("task-priority").value,
    category: document.getElementById("task-category").value || "Personal",
    completed: false
  });

  saveData();
  event.target.reset();
  renderTasks();
});

document.getElementById("task-list")?.addEventListener("change", event => {
  const id = event.target.dataset.taskCheck;
  if (!id) return;

  const task = data.tasks.find(item => item.id === id);
  if (task) task.completed = event.target.checked;

  saveData();
  renderTasks();
});

document.getElementById("task-list")?.addEventListener("click", event => {
  const id = event.target.dataset.taskDelete;
  if (!id) return;

  data.tasks = data.tasks.filter(task => task.id !== id);
  saveData();
  renderTasks();
});

// PROGRESO
function renderProgress() {
  const area = document.getElementById("progress-content");
  if (!area) return;

  const total = data.tasks.length;
  const completed = data.tasks.filter(task => task.completed).length;
  const percentage = total ? Math.round(completed / total * 100) : 0;

  area.innerHTML = `
    <div class="progress-card">
      <h3>Tus tareas completadas</h3>
      <strong>${percentage}%</strong>
      <p>${completed} de ${total} tareas completadas</p>
      <div class="progress-track">
        <div class="progress-fill" style="width:${percentage}%"></div>
      </div>
    </div>
  `;
}

// RETOS PERSONALES
function renderChallenges() {
  const list = document.getElementById("challenge-list");
  if (!list) return;

  list.innerHTML = data.challenges.length
    ? data.challenges.map(challenge => `
      <article class="task-item ${challenge.completed ? "completed" : ""}">
        <label class="task-main">
          <input type="checkbox" data-challenge-check="${challenge.id}" ${challenge.completed ? "checked" : ""}>
          <span>${escapeHTML(challenge.title)}</span>
        </label>
        <button type="button" data-challenge-delete="${challenge.id}">Eliminar</button>
      </article>
    `).join("")
    : `<p class="empty-state">Todavía no tienes retos.</p>`;
}

document.getElementById("challenge-form")?.addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("challenge-input");
  const title = input.value.trim();
  if (!title) return;

  data.challenges.push({
    id: Date.now().toString(),
    title,
    completed: false
  });

  saveData();
  input.value = "";
  renderChallenges();
});

document.getElementById("challenge-list")?.addEventListener("change", event => {
  const id = event.target.dataset.challengeCheck;
  if (!id) return;

  const challenge = data.challenges.find(item => item.id === id);
  if (challenge) challenge.completed = event.target.checked;

  saveData();
  renderChallenges();
});

document.getElementById("challenge-list")?.addEventListener("click", event => {
  const id = event.target.dataset.challengeDelete;
  if (!id) return;

  data.challenges = data.challenges.filter(item => item.id !== id);
  saveData();
  renderChallenges();
});

// RETOS COMPARTIDOS
function renderShared() {
  const list = document.getElementById("shared-list");
  if (!list) return;

  list.innerHTML = data.shared.length
    ? data.shared.map(item => `
      <article class="task-item">
        <span>${escapeHTML(item.title)}</span>
        <button type="button" data-shared-delete="${item.id}">Eliminar</button>
      </article>
    `).join("")
    : `<p class="empty-state">Todavía no has propuesto retos.</p>`;
}

document.getElementById("shared-form")?.addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("shared-input");
  const title = input.value.trim();
  if (!title) return;

  data.shared.push({
    id: Date.now().toString(),
    title
  });

  saveData();
  input.value = "";
  renderShared();
});

document.getElementById("shared-list")?.addEventListener("click", event => {
  const id = event.target.dataset.sharedDelete;
  if (!id) return;

  data.shared = data.shared.filter(item => item.id !== id);
  saveData();
  renderShared();
});

// INICIAR APLICACIÓN
renderCategories();
renderTasks();
renderChallenges();
renderShared();
  
