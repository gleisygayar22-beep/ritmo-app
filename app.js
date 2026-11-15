
const STORAGE_KEY = "ritmo-v1";

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {
  tasks: [],
  challenges: [],
  shared: []
};

let currentSection = "organizacion";

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const sections = {
  organizacion: {
    title: "Mi organización",
    description: "Organiza tus tareas y dale espacio a lo importante."
  },
  progreso: {
    title: "Mi progreso",
    description: "Mira todo lo que vas consiguiendo, paso a paso."
  },
  retos: {
    title: "Mis retos",
    description: "Ponte objetivos y avanza a tu propio ritmo."
  },
  compartidos: {
    title: "Retos compartidos",
    description: "Comparte objetivos y motívate con otras personas."
  }
};

const root = document.getElementById("section-content");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
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
  if (!sections[section]) return;

  currentSection = section;
  document.getElementById("page-title").textContent = sections[section].title;
  document.getElementById("page-description").textContent = sections[section].description;

  updateNavigation();
  render();
}

function render() {
  if (currentSection === "organizacion") renderOrganization();
  if (currentSection === "progreso") renderProgress();
  if (currentSection === "retos") renderChallenges();
  if (currentSection === "compartidos") renderShared();
}

function renderOrganization() {
  const pending = data.tasks.filter(task => !task.done);
  const completed = data.tasks.filter(task => task.done);

  root.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <span>Tareas pendientes</span>
        <strong>${pending.length}</strong>
      </div>
      <div class="stat-card">
        <span>Tareas completadas</span>
        <strong>${completed.length}</strong>
      </div>
      <div class="stat-card">
        <span>Retos activos</span>
        <strong>${data.challenges.filter(c => !c.done).length}</strong>
      </div>
    </div>

    <section class="panel">
      <div class="panel-heading">
        <h2>Mis tareas</h2>
        <span class="muted">${data.tasks.length} en total</span>
      </div>

      <form class="task-form" id="task-form">
        <input id="task-input" type="text" maxlength="100"
          placeholder="¿Qué necesitas hacer?" required>
        <button class="primary-btn" type="submit">Añadir tarea</button>
      </form>

      <div class="task-list">
        ${data.tasks.length ? data.tasks.map(task => `
          <div class="task ${task.done ? "done" : ""}">
            <input type="checkbox" data-task="${task.id}"
              ${task.done ? "checked" : ""}>
            <span>${escapeHTML(task.text)}</span>
            <button class="delete-task" data-delete-task="${task.id}"
              aria-label="Eliminar tarea">×</button>
          </div>
        `).join("") : `
          <p class="empty">Todavía no tienes tareas. Añade la primera.</p>
        `}
      </div>
    </section>
  `;

  document.getElementById("task-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = document.getElementById("task-input");
    const text = input.value.trim();

    if (!text) return;

    data.tasks.push({
      id: Date.now(),
      text,
      done: false
    });

    save();
    renderOrganization();
  });

  root.querySelectorAll("[data-task]").forEach(input => {
    input.addEventListener("change", () => {
      const task = data.tasks.find(t => t.id === Number(input.dataset.task));
      if (task) task.done = input.checked;
      save();
      renderOrganization();
    });
  });

  root.querySelectorAll("[data-delete-task]").forEach(button => {
    button.addEventListener("click", () => {
      data.tasks = data.tasks.filter(
        t => t.id !== Number(button.dataset.deleteTask)
      );
      save();
      renderOrganization();
    });
  });
}

function renderProgress() {
  const total = data.tasks.length;
  const completed = data.tasks.filter(t => t.done).length;
  const percentage = total ? Math.round(completed / total * 100) : 0;

  const challengesDone = data.challenges.filter(c => c.done).length;

  root.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <span>Tareas completadas</span>
        <strong>${completed}</strong>
      </div>
      <div class="stat-card">
        <span>Retos conseguidos</span>
        <strong>${challengesDone}</strong>
      </div>
      <div class="stat-card">
        <span>Tu progreso</span>
        <strong>${percentage}%</strong>
      </div>
    </div>

    <section class="panel">
      <h2>Tu organización</h2>
      <p class="muted">${completed} de ${total} tareas completadas</p>
      <div class="progress-track">
        <div class="progress-fill" style="width:${percentage}%"></div>
      </div>
      <p class="muted">${percentage === 100 && total ? "¡Has completado todas tus tareas!" : "Cada pequeño paso cuenta. Sigue a tu ritmo."}</p>
    </section>

    <section class="panel">
      <h2>Tus retos conseguidos</h2>
      <p class="muted">${challengesDone} retos completados hasta ahora.</p>
    </section>
  `;
}

function renderChallenges() {
  root.innerHTML = `
    <section class="panel">
      <div class="panel-heading">
        <h2>Mis retos personales</h2>
      </div>

      <form id="challenge-form">
        <input class="field" id="challenge-input" maxlength="100"
          placeholder="Ej. Leer 15 minutos al día" required>
        <div style="height:12px"></div>
        <button class="primary-btn" type="submit">Crear reto</button>
      </form>
    </section>

    <section class="panel">
      <h2>Mis objetivos</h2>
      ${data.challenges.length ? data.challenges.map(challenge => `
        <div class="challenge">
          <strong>${escapeHTML(challenge.text)}</strong>
          <p>${challenge.done ? "Reto conseguido" : "En marcha"}</p>
          ${challenge.done ? "" : `
            <button class="secondary-btn" data-complete-challenge="${challenge.id}">
              Marcar como conseguido
            </button>
          `}
          <button class="delete-task" data-delete-challenge="${challenge.id}">
            Eliminar
          </button>
        </div>
      `).join("") : `<p class="empty">Todavía no has creado ningún reto.</p>`}
    </section>
  `;

  document.getElementById("challenge-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = document.getElementById("challenge-input");
    const text = input.value.trim();

    if (!text) return;

    data.challenges.push({
      id: Date.now(),
      text,
      done: false
    });

    save();
    renderChallenges();
  });

  root.querySelectorAll("[data-complete-challenge]").forEach(button => {
    button.addEventListener("click", () => {
      const challenge = data.challenges.find(
        c => c.id === Number(button.dataset.completeChallenge)
      );
      if (challenge) challenge.done = true;
      save();
      renderChallenges();
    });
  });

  root.querySelectorAll("[data-delete-challenge]").forEach(button => {
    button.addEventListener("click", () => {
      data.challenges = data.challenges.filter(
        c => c.id !== Number(button.dataset.deleteChallenge)
      );
      save();
      renderChallenges();
    });
  });
}

function renderShared() {
  root.innerHTML = `
    <section class="panel">
      <h2>Retos compartidos</h2>
      <p class="muted">
        Crea una propuesta de reto para compartirla con otras personas.
      </p>

      <form id="shared-form">
        <div style="height:15px"></div>
        <input class="field" id="shared-input" maxlength="100"
          placeholder="Ej. Caminar 20 minutos cada día" required>
        <div style="height:12px"></div>
        <button class="primary-btn" type="submit">Crear propuesta</button>
      </form>
    </section>

    <section class="panel">
      <h2>Mis propuestas</h2>
      ${data.shared.length ? data.shared.map(item => `
        <div class="challenge">
          <strong>${escapeHTML(item.text)}</strong>
          <p>Propuesta guardada en tu dispositivo</p>
          <button class="secondary-btn" data-share="${item.id}">
            Compartir
          </button>
          <button class="delete-task" data-delete-shared="${item.id}">
            Eliminar
          </button>
        </div>
      `).join("") : `<p class="empty">Todavía no tienes propuestas compartidas.</p>`}
    </section>
  `;

  document.getElementById("shared-form").addEventListener("submit", event => {
    event.preventDefault();
    const input = document.getElementById("shared-input");
    const text = input.value.trim();

    if (!text) return;

    data.shared.push({
      id: Date.now(),
      text
    });

    save();
    renderShared();
  });

  root.querySelectorAll("[data-share]").forEach(button => {
    button.addEventListener("click", async () => {
      const item = data.shared.find(
        s => s.id === Number(button.dataset.share)
      );
      if (!item) return;

      const shareData = {
        title: "RITMO - Reto compartido",
        text: `¿Te unes a este reto? ${item.text}`
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          if (error.name !== "AbortError") alert("No se pudo compartir.");
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.text);
        alert("Texto copiado. Ya puedes enviarlo.");
      } else {
        alert(shareData.text);
      }
    });
  });

  root.querySelectorAll("[data-delete-shared]").forEach(button => {
    button.addEventListener("click", () => {
      data.shared = data.shared.filter(
        s => s.id !== Number(button.dataset.deleteShared)
      );
      save();
      renderShared();
    });
  });
}

document.querySelectorAll("[data-section]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.section));
});

document.getElementById("today").textContent =
  new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

navigate("organizacion");
