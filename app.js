
const STORAGE_KEY = "ritmo-v1";
const DEFAULT_CATEGORIES = ["Personal", "Trabajo", "Casa", "Estudios"];

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("ritmo-data");
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(t => ({
        id: t.id || Date.now() + Math.random(),
        text: t.text || t.title || "",
        done: Boolean(t.done),
        category: t.category || "Personal",
        date: t.date || "",
        priority: t.priority || "Normal",
        recurrence: t.recurrence || "",
        customIntervalDays: t.customIntervalDays || 0
      })) : [],
      challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
      shared: Array.isArray(parsed.shared) ? parsed.shared : [],
      categories: [...new Set([
        ...DEFAULT_CATEGORIES,
        ...(Array.isArray(parsed.categories) ? parsed.categories : [])
      ])]
    };
  } catch {
    return {
      tasks: [],
      challenges: [],
      shared: [],
      categories: [...DEFAULT_CATEGORIES]
    };
  }
}

let data = loadData();
let currentSection = "organizacion";
let pendingTaskText = "";
let pendingCategory = "Personal";

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#039;"
  })[c]);
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = new Date(dateString + "T12:00:00");
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function addMonths(dateString, months) {
  const [year, month, day] = dateString.split("-").map(Number);
  const result = new Date(year, month - 1 + months, 1, 12);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return localDate(result);
}

function nextTaskDate(task) {
  const base = task.date || localDate();

  if (task.recurrence === "daily") return addDays(base, 1);
  if (task.recurrence === "weekly") return addDays(base, 7);
  if (task.recurrence === "fortnightly") return addDays(base, 15);
  if (task.recurrence === "monthly") return addMonths(base, 1);
  if (task.recurrence === "custom" && task.customIntervalDays) {
    return addDays(base, task.customIntervalDays);
  }

  return "";
}

function navigate(section) {
  currentSection = section;
  render();
}

function updateNavigation() {
  document.querySelectorAll("[data-section]").forEach(button => {
    button.classList.toggle("active", button.dataset.section === currentSection);
  });
}

function render() {
  updateNavigation();

  const titles = {
    organizacion: ["Mi organización", "Organiza tus tareas y pon orden a tu día."],
    progreso: ["Mi progreso", "Mira todo lo que vas consiguiendo."],
    retos: ["Mis retos", "Márcate objetivos y avanza a tu ritmo."],
    compartidos: ["Retos compartidos", "Crea invitaciones y comparte retos."]
  };

  const heading = titles[currentSection] || titles.organizacion;
  document.getElementById("page-title").textContent = heading[0];
  document.getElementById("page-description").textContent = heading[1];

  const root = document.getElementById("section-content");
  if (currentSection === "organizacion") root.innerHTML = renderOrganization();
  else if (currentSection === "progreso") root.innerHTML = renderProgress();
  else if (currentSection === "retos") root.innerHTML = renderChallenges();
  else root.innerHTML = renderShared();
}

function renderOrganization() {
  const categories = data.categories.map(category =>
    `<option value="${escapeHTML(category)}" ${category === pendingCategory ? "selected" : ""}>${escapeHTML(category)}</option>`
  ).join("");

  const taskList = data.tasks.length
    ? data.tasks.map(task => `
      <div class="task ${task.done ? "done" : ""}">
        <input class="task-check" type="checkbox"
          data-task-toggle="${escapeHTML(task.id)}"
          ${task.done ? "checked" : ""}>
        <div class="task-content">
          <div class="task-title">${escapeHTML(task.text)}</div>
          <div class="task-meta">
            <span class="category-chip">${escapeHTML(task.category)}</span>
            ${task.date ? `<span class="meta-chip">Para: ${escapeHTML(task.date)}</span>` : ""}
            ${task.recurrence ? `<span class="meta-chip">↻ ${({
              daily: "Todos los días",
              weekly: "Cada semana",
              fortnightly: "Cada quince días",
              monthly: "Cada mes",
              custom: "Personalizado"
            })[task.recurrence] || ""}</span>` : ""}
            ${task.priority === "Alta" ? `<span class="meta-chip">Prioridad alta</span>` : ""}
          </div>
        </div>
        <button class="delete-btn" data-task-delete="${escapeHTML(task.id)}">×</button>
      </div>
    `).join("")
    : `<div class="empty">Todavía no tienes tareas. Añade la primera cuando quieras.</div>`;

  const creationStep = pendingTaskText
    ? `
      <div class="panel-heading"><h3>Detalles de tu tarea</h3></div>
      <p class="task-title">${escapeHTML(pendingTaskText)}</p>
      <form id="task-details-form">
        <div class="field">
          <label for="task-recurrence">¿Cuándo se repite?</label>
          <select id="task-recurrence" required>
            <option value="daily">Todos los días</option>
            <option value="weekly">Cada semana</option>
            <option value="fortnightly">Cada quince días</option>
            <option value="monthly">Cada mes</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        <div class="field" id="custom-date-field" hidden>
          <label for="custom-date">Calendario</label>
          <input type="date" id="custom-date" min="${localDate()}">
        </div>
        <div class="field">
          <label for="task-category">Categoría</label>
          <select id="task-category">${categories}</select>
        </div>
        <div class="field">
          <label for="category-name">Crear una categoría nueva</label>
          <div class="challenge-form">
            <input class="challenge-input" id="category-name"
              type="text" placeholder="Ej. Gimnasio" maxlength="30">
            <button class="secondary-btn" type="button" id="add-category">+ Crear</button>
          </div>
        </div>
        <div class="task-form">
          <button class="primary-btn" type="submit">Guardar tarea</button>
          <button class="secondary-btn" type="button" id="cancel-task">Cancelar</button>
        </div>
      </form>
    `
    : `
      <div class="panel-heading"><h3>Añadir una tarea</h3></div>
      <form id="task-form">
        <div class="task-form">
          <input class="task-input" type="text" id="task-text"
            placeholder="¿Qué tienes que hacer?" maxlength="120" required>
          <button class="primary-btn" type="submit">Crear tarea</button>
        </div>
      </form>
    `;

  return `
    <section class="panel">
      ${creationStep}
    </section>
    <section class="panel">
      <div class="panel-heading">
        <h3>Mis tareas</h3>
        <span class="muted">${data.tasks.length} en total</span>
      </div>
      <div class="task-list">${taskList}</div>
    </section>
  `;
}

function renderProgress() {
  const total = data.tasks.length;
  const completed = data.tasks.filter(t => t.done).length;
  const pending = total - completed;
  const percentage = total ? Math.round(completed / total * 100) : 0;

  return `
    <div class="stats-grid">
      <div class="stat-card"><strong>${total}</strong><span>Tareas creadas</span></div>
      <div class="stat-card"><strong>${completed}</strong><span>Tareas completadas</span></div>
      <div class="stat-card"><strong>${pending}</strong><span>Tareas pendientes</span></div>
    </div>
    <section class="panel">
      <div class="panel-heading">
        <h3>Progreso de tus tareas</h3>
        <strong>${percentage}%</strong>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${percentage}%"></div>
      </div>
      <p class="muted">${completed} de ${total} tareas completadas.</p>
    </section>
    <div class="stats-grid">
      <div class="stat-card"><strong>${data.challenges.length}</strong><span>Retos creados</span></div>
      <div class="stat-card"><strong>${data.challenges.filter(c => c.done).length}</strong><span>Retos completados</span></div>
      <div class="stat-card"><strong>${data.shared.length}</strong><span>Retos compartidos</span></div>
    </div>
  `;
}

function renderChallenges() {
  const list = data.challenges.length
    ? data.challenges.map(challenge => `
      <div class="challenge ${challenge.done ? "done" : ""}">
        <input class="task-check" type="checkbox"
          data-challenge-toggle="${escapeHTML(challenge.id)}"
          ${challenge.done ? "checked" : ""}>
        <div class="task-content">
          <div class="task-title">${escapeHTML(challenge.text)}</div>
          <span class="muted">${challenge.done ? "Reto completado" : "Reto activo"}</span>
        </div>
        <button class="delete-btn" data-challenge-delete="${escapeHTML(challenge.id)}">×</button>
      </div>
    `).join("")
    : `<div class="empty">Todavía no tienes retos activos. ¡Crea el primero!</div>`;

  return `
    <section class="panel">
      <div class="panel-heading"><h3>Crear un reto</h3></div>
      <form id="challenge-form" class="challenge-form">
        <input class="challenge-input" id="challenge-text"
          placeholder="Ej. Leer 10 minutos al día" maxlength="120" required>
        <button class="primary-btn" type="submit">+ Crear reto</button>
      </form>
    </section>
    <section class="panel">
      <div class="panel-heading"><h3>Mis retos</h3></div>
      <div class="task-list">${list}</div>
    </section>
  `;
}

function renderShared() {
  const list = data.shared.length
    ? data.shared.map(challenge => `
      <div class="challenge">
        <div class="task-content">
          <div class="task-title">${escapeHTML(challenge.text)}</div>
          <span class="muted">Invitación creada</span>
        </div>
        <button class="secondary-btn" data-share="${escapeHTML(challenge.id)}">
          Compartir invitación
        </button>
        <button class="delete-btn" data-shared-delete="${escapeHTML(challenge.id)}">×</button>
      </div>
    `).join("")
    : `<div class="empty">Todavía no has creado invitaciones.</div>`;

  return `
    <section class="panel">
      <div class="panel-heading"><h3>Crear una invitación</h3></div>
      <form id="shared-form" class="challenge-form">
        <input class="challenge-input" id="shared-text"
          placeholder="¿Qué reto quieres compartir?" maxlength="120" required>
        <button class="primary-btn" type="submit">+ Crear invitación</button>
      </form>
      <p class="muted">Después podrás compartirla con otra persona desde tu dispositivo.</p>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <h3>Mis invitaciones</h3>
        <span class="muted">${data.shared.length} en total</span>
      </div>
      <div class="task-list">${list}</div>
    </section>
  `;
}

document.addEventListener("change", event => {
  if (event.target.id === "task-recurrence") {
    document.getElementById("custom-date-field").hidden =
      event.target.value !== "custom";
  }
});

document.addEventListener("click", async event => {
  const sectionButton = event.target.closest("[data-section]");
  if (sectionButton) {
    navigate(sectionButton.dataset.section);
    return;
  }

  if (event.target.closest("#add-category")) {
    const input = document.getElementById("category-name");
    const name = input.value.trim();

    if (!name) {
      alert("Escribe el nombre de la categoría.");
      return;
    }

    if (data.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert("Esa categoría ya existe.");
      return;
    }

    data.categories.push(name);
    pendingCategory = name;
    saveData();
    render();
    return;
  }

  if (event.target.closest("#cancel-task")) {
    pendingTaskText = "";
    pendingCategory = "Personal";
    render();
    return;
  }

  const taskToggle = event.target.closest("[data-task-toggle]");
  if (taskToggle) {
    const task = data.tasks.find(t => String(t.id) === taskToggle.dataset.taskToggle);

    if (task && taskToggle.checked && !task.done) {
      task.done = true;

      const nextDate = nextTaskDate(task);
      if (nextDate) {
        data.tasks.unshift({
          id: makeId(),
          text: task.text,
          done: false,
          category: task.category,
          date: nextDate,
          recurrence: task.recurrence,
          customIntervalDays: task.customIntervalDays || 0,
          priority: task.priority || "Normal"
        });
      }
    } else if (task) {
      task.done = taskToggle.checked;
    }

    saveData();
    render();
    return;
  }

  const taskDelete = event.target.closest("[data-task-delete]");
  if (taskDelete) {
    data.tasks = data.tasks.filter(t => String(t.id) !== taskDelete.dataset.taskDelete);
    saveData();
    render();
    return;
  }

  const challengeToggle = event.target.closest("[data-challenge-toggle]");
  if (challengeToggle) {
    const challenge = data.challenges.find(c => String(c.id) === challengeToggle.dataset.challengeToggle);
    if (challenge) challenge.done = challengeToggle.checked;
    saveData();
    render();
    return;
  }

  const challengeDelete = event.target.closest("[data-challenge-delete]");
  if (challengeDelete) {
    data.challenges = data.challenges.filter(c => String(c.id) !== challengeDelete.dataset.challengeDelete);
    saveData();
    render();
    return;
  }

  const sharedDelete = event.target.closest("[data-shared-delete]");
  if (sharedDelete) {
    data.shared = data.shared.filter(c => String(c.id) !== sharedDelete.dataset.sharedDelete);
    saveData();
    render();
    return;
  }

  const shareButton = event.target.closest("[data-share]");
  if (shareButton) {
    const challenge = data.shared.find(c => c.id === shareButton.dataset.share);
    if (!challenge) return;

    const message = `¡Te invito a participar en este reto conmigo!\n\n${challenge.text}\n\nRITMO · Tu vida, en movimiento.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Invitación a un reto RITMO", text: message });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        alert("Invitación copiada. Ya puedes pegarla y enviarla.");
      } else {
        alert(message);
      }
    } catch (error) {
      if (error.name !== "AbortError") alert("No se ha podido compartir.");
    }
  }
});

document.addEventListener("submit", event => {
  if (event.target.id === "task-form") {
    event.preventDefault();
    const text = document.getElementById("task-text").value.trim();
    if (!text) return;

    pendingTaskText = text;
    pendingCategory = "Personal";
    render();
    return;
  }

  if (event.target.id === "task-details-form") {
    event.preventDefault();

    const recurrence = document.getElementById("task-recurrence").value;
    const category = document.getElementById("task-category").value;
    let customIntervalDays = 0;

    if (recurrence === "custom") {
      const selectedDate = document.getElementById("custom-date").value;
      if (!selectedDate || selectedDate <= localDate()) {
        alert("Elige una fecha posterior a hoy en el calendario.");
        return;
      }

      const today = new Date(localDate() + "T12:00:00");
      const chosen = new Date(selectedDate + "T12:00:00");
      customIntervalDays = Math.round((chosen - today) / 86400000);
    }

    data.tasks.unshift({
      id: makeId(),
      text: pendingTaskText,
      done: false,
      category,
      date: "",
      priority: "Normal",
      recurrence,
      customIntervalDays
    });

    pendingTaskText = "";
    pendingCategory = "Personal";
    saveData();
    render();
    return;
  }

  if (event.target.id === "challenge-form") {
    event.preventDefault();
    const text = document.getElementById("challenge-text").value.trim();
    if (!text) return;

    data.challenges.unshift({ id: makeId(), text, done: false });
    saveData();
    render();
  }

  if (event.target.id === "shared-form") {
    event.preventDefault();
    const text = document.getElementById("shared-text").value.trim();
    if (!text) return;

    data.shared.unshift({ id: makeId(), text });
    saveData();
    render();
  }
});

document.getElementById("today").textContent =
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());

render();
