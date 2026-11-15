const STORAGE_KEY = "ritmo-v1";

const DEFAULT_CATEGORIES = ["Personal", "Trabajo", "Casa", "Estudios"];

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("ritmo-data");

    if (!saved) {
      return {
        tasks: [],
        challenges: [],
        shared: [],
        categories: [...DEFAULT_CATEGORIES]
      };
    }

    const parsed = JSON.parse(saved);

    return {
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks.map(task => ({
            id: task.id || Date.now() + Math.random(),
            text: task.text || task.title || "",
            done: Boolean(task.done),
            category: task.category || "Personal",
            date: task.date || "",
            priority: task.priority || "Normal"
          }))
        : [],
      challenges: Array.isArray(parsed.challenges)
        ? parsed.challenges
        : [],
      shared: Array.isArray(parsed.shared)
        ? parsed.shared
        : [],
      categories: Array.isArray(parsed.categories)
        ? [...new Set([...DEFAULT_CATEGORIES, ...parsed.categories])]
        : [...DEFAULT_CATEGORIES]
    };
  } catch (error) {
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

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function updateNavigation() {
  document.querySelectorAll("[data-section]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.section === currentSection
    );
  });
}

function navigate(section) {
  currentSection = section;
  render();
}

function render() {
  updateNavigation();

  const titles = {
    organizacion: [
      "Mi organización",
      "Organiza tus tareas y pon orden a tu día."
    ],
    progreso: [
      "Mi progreso",
      "Mira todo lo que vas consiguiendo."
    ],
    retos: [
      "Mis retos",
      "Márcate objetivos y avanza a tu ritmo."
    ],
    compartidos: [
      "Retos compartidos",
      "Comparte tus objetivos e invita a otras personas."
    ]
  };

  const heading = titles[currentSection] || titles.organizacion;

  document.getElementById("page-title").textContent = heading[0];
  document.getElementById("page-description").textContent = heading[1];

  const root = document.getElementById("section-content");

  if (currentSection === "organizacion") {
    root.innerHTML = renderOrganization();
  } else if (currentSection === "progreso") {
    root.innerHTML = renderProgress();
  } else if (currentSection === "retos") {
    root.innerHTML = renderChallenges();
  } else {
    root.innerHTML = renderShared();
  }
}

function renderOrganization() {
  const tasks = data.tasks;

  const categories = data.categories.map(category =>
    `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
  ).join("");

  const taskList = tasks.length
    ? tasks.map(task => `
      <div class="task ${task.done ? "done" : ""}">
        <input
          class="task-check"
          type="checkbox"
          data-task-toggle="${escapeHTML(task.id)}"
          ${task.done ? "checked" : ""}
          aria-label="Completar tarea"
        >
        <div class="task-content">
          <div class="task-title">${escapeHTML(task.text)}</div>
          <div class="task-meta">
            <span class="category-chip">${escapeHTML(task.category)}</span>
            ${task.date ? `<span class="meta-chip">${escapeHTML(task.date)}</span>` : ""}
            ${task.priority === "Alta" ? `<span class="meta-chip">Prioridad alta</span>` : ""}
          </div>
        </div>
        <button class="delete-btn" data-task-delete="${escapeHTML(task.id)}" aria-label="Eliminar tarea">×</button>
      </div>
    `).join("")
    : `<div class="empty">Todavía no tienes tareas. Añade la primera cuando quieras.</div>`;

  return `
    <section class="panel">
      <div class="panel-heading">
        <h3>Añadir una tarea</h3>
      </div>

      <form id="task-form">
        <div class="task-form">
          <input
            class="task-input"
            type="text"
            id="task-text"
            placeholder="¿Qué tienes que hacer?"
            maxlength="120"
            required
          >
          <button class="primary-btn" type="submit">+ Añadir tarea</button>
        </div>

        <button class="details-toggle" type="button" id="details-toggle">
          + Añadir detalles
        </button>

        <div class="details-fields" id="details-fields" hidden>
          <div class="field">
            <label for="task-category">Categoría</label>
            <select id="task-category">${categories}</select>
          </div>
          <div class="field">
            <label for="task-date">Fecha</label>
            <input type="date" id="task-date">
          </div>
          <div class="field">
            <label for="task-priority">Prioridad</label>
            <select id="task-priority">
              <option value="Normal">Normal</option>
              <option value="Alta">Alta</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>
      </form>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <h3>Mis tareas</h3>
        <span class="muted">${tasks.length} en total</span>
      </div>
      <div class="task-list">${taskList}</div>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <h3>Mis categorías</h3>
      </div>
      <div class="task-meta">
        ${data.categories.map(category => `
          <span class="category-chip">
            ${escapeHTML(category)}
            ${DEFAULT_CATEGORIES.includes(category) ? "" : `
              <button
                type="button"
                class="delete-btn"
                data-category-delete="${escapeHTML(category)}"
                aria-label="Eliminar categoría ${escapeHTML(category)}"
              >×</button>
            `}
          </span>
        `).join("")}
      </div>
      <form id="category-form" class="challenge-form" style="margin-top:15px">
        <input
          class="challenge-input"
          type="text"
          id="category-name"
          placeholder="Nombre de nueva categoría"
          maxlength="30"
          required
        >
        <button class="secondary-btn" type="submit">+ Crear categoría</button>
      </form>
    </section>
  `;
}

function renderProgress() {
  const total = data.tasks.length;
  const completed = data.tasks.filter(task => task.done).length;
  const pending = total - completed;
  const percentage = total ? Math.round(completed / total * 100) : 0;

  const challengeTotal = data.challenges.length;
  const challengeDone = data.challenges.filter(challenge => challenge.done).length;

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <strong>${total}</strong>
        <span>Tareas creadas</span>
      </div>
      <div class="stat-card">
        <strong>${completed}</strong>
        <span>Tareas completadas</span>
      </div>
      <div class="stat-card">
        <strong>${pending}</strong>
        <span>Tareas pendientes</span>
      </div>
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
      <div class="stat-card">
        <strong>${challengeTotal}</strong>
        <span>Retos creados</span>
      </div>
      <div class="stat-card">
        <strong>${challengeDone}</strong>
        <span>Retos completados</span>
      </div>
      <div class="stat-card">
        <strong>${data.shared.length}</strong>
        <span>Retos compartidos</span>
      </div>
    </div>
  `;
}

function renderChallenges() {
  const list = data.challenges.length
    ? data.challenges.map(challenge => `
      <div class="challenge ${challenge.done ? "done" : ""}">
        <input
          class="task-check"
          type="checkbox"
          data-challenge-toggle="${escapeHTML(challenge.id)}"
          ${challenge.done ? "checked" : ""}
          aria-label="Completar reto"
        >
        <div class="task-content">
          <div class="task-title">${escapeHTML(challenge.text)}</div>
          <span class="muted">${challenge.done ? "Reto completado" : "Reto activo"}</span>
        </div>
        <button class="delete-btn" data-challenge-delete="${escapeHTML(challenge.id)}" aria-label="Eliminar reto">×</button>
      </div>
    `).join("")
    : `<div class="empty">Todavía no tienes retos activos. ¡Crea el primero!</div>`;

  return `
    <section class="panel">
      <div class="panel-heading">
        <h3>Crear un reto</h3>
      </div>
      <form id="challenge-form" class="challenge-form">
        <input
          class="challenge-input"
          id="challenge-text"
          type="text"
          placeholder="Ej. Leer 10 minutos al día"
          maxlength="120"
          required
        >
        <button class="primary-btn" type="submit">+ Crear reto</button>
      </form>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <h3>Mis retos</h3>
        <span class="muted">${data.challenges.length} en total</span>
      </div>
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
          <span class="muted">Invitación preparada</span>
        </div>
        <button class="secondary-btn" data-share="${escapeHTML(challenge.id)}">Compartir</button>
        <button class="delete-btn" data-shared-delete="${escapeHTML(challenge.id)}" aria-label="Eliminar reto">×</button>
      </div>
    `).join("")
    : `<div class="empty">Aquí aparecerán los retos que quieras compartir.</div>`;

  return `
    <section class="panel">
      <div class="panel-heading">
        <h3>Crear un reto compartido</h3>
      </div>
      <form id="shared-form" class="challenge-form">
        <input
          class="challenge-input"
          id="shared-text"
          type="text"
          placeholder="Ej. Caminar 20 minutos cada día"
          maxlength="120"
          required
        >
        <button class="primary-btn" type="submit">+ Crear reto</button>
      </form>
      <p class="muted">Podrás compartir una invitación mediante las aplicaciones de tu dispositivo.</p>
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

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

document.addEventListener("click", async event => {
  const sectionButton = event.target.closest("[data-section]");
  if (sectionButton) {
    navigate(sectionButton.dataset.section);
    return;
  }

  if (event.target.closest("#details-toggle")) {
    const details = document.getElementById("details-fields");
    details.hidden = !details.hidden;
    event.target.closest("#details-toggle").textContent =
      details.hidden ? "+ Añadir detalles" : "− Ocultar detalles";
    return;
  }

  const taskToggle = event.target.closest("[data-task-toggle]");
  if (taskToggle) {
    const task = data.tasks.find(item => String(item.id) === taskToggle.dataset.taskToggle);
    if (task) {
      task.done = taskToggle.checked;
      saveData();
      render();
    }
    return;
  }

  const taskDelete = event.target.closest("[data-task-delete]");
  if (taskDelete) {
    data.tasks = data.tasks.filter(item => String(item.id) !== taskDelete.dataset.taskDelete);
    saveData();
    render();
    return;
  }

  const categoryDelete = event.target.closest("[data-category-delete]");
  if (categoryDelete) {
    const category = categoryDelete.dataset.categoryDelete;
    data.categories = data.categories.filter(item => item !== category);
    data.tasks.forEach(task => {
      if (task.category === category) task.category = "Personal";
    });
    saveData();
    render();
    return;
  }

  const challengeToggle = event.target.closest("[data-challenge-toggle]");
  if (challengeToggle) {
    const challenge = data.challenges.find(item => String(item.id) === challengeToggle.dataset.challengeToggle);
    if (challenge) {
      challenge.done = challengeToggle.checked;
      saveData();
      render();
    }
    return;
  }

  const challengeDelete = event.target.closest("[data-challenge-delete]");
  if (challengeDelete) {
    data.challenges = data.challenges.filter(item => String(item.id) !== challengeDelete.dataset.challengeDelete);
    saveData();
    render();
    return;
  }

  const sharedDelete = event.target.closest("[data-shared-delete]");
  if (sharedDelete) {
    data.shared = data.shared.filter(item => String(item.id) !== sharedDelete.dataset.sharedDelete);
    saveData();
    render();
    return;
  }

  const shareButton = event.target.closest("[data-share]");
  if (shareButton) {
    const challenge = data.shared.find(item => String(item.id) === shareButton.dataset.share);
    if (challenge) {
      const message = `¡Te invito a este reto en RITMO!\n\n${challenge.text}\n\nTu vida, en movimiento.`;
      try {
        if (navigator.share) {
          await navigator.share({ title: "Reto compartido RITMO", text: message });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          alert("Invitación copiada. Ya puedes enviarla.");
        } else {
          alert(message);
        }
      } catch (error) {
        if (error.name !== "AbortError") alert("No se ha podido compartir la invitación.");
      }
    }
  }
});

document.addEventListener("submit", event => {
  if (event.target.id === "task-form") {
    event.preventDefault();

    const text = document.getElementById("task-text").value.trim();
    if (!text) return;

    data.tasks.unshift({
      id: makeId(),
      text,
      done: false,
      category: document.getElementById("task-category").value,
      date: document.getElementById("task-date").value,
      priority: document.getElementById("task-priority").value
    });

    saveData();
    render();
    return;
  }

  if (event.target.id === "category-form") {
    event.preventDefault();

    const input = document.getElementById("category-name");
    const category = input.value.trim();

    if (!category) return;

    if (data.categories.some(item => item.toLowerCase() === category.toLowerCase())) {
      alert("Esa categoría ya existe.");
      return;
    }

    data.categories.push(category);
    saveData();
    render();
    return;
  }

  if (event.target.id === "challenge-form") {
    event.preventDefault();

    const text = document.getElementById("challenge-text").value.trim();
    if (!text) return;

    data.challenges.unshift({
      id: makeId(),
      text,
      done: false
    });

    saveData();
    render();
    return;
  }

  if (event.target.id === "shared-form") {
    event.preventDefault();

    const text = document.getElementById("shared-text").value.trim();
    if (!text) return;

    data.shared.unshift({
      id: makeId(),
      text
    });

    saveData();
    render();
  }
});

const today = document.getElementById("today");
today.textContent = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
}).format(new Date());

render();
