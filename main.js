const STORAGE_KEYS = {
  tasks: 'taskflow-tasks',
  theme: 'taskflow-theme',
};

const STATUSES = [
  { id: 'todo', label: 'To Do', icon: 'bi-inbox', accent: 'amber' },
  { id: 'in-progress', label: 'In Progress', icon: 'bi-stars', accent: 'teal' },
  { id: 'done', label: 'Done', icon: 'bi-check-lg', accent: 'slate' },
];

const PRIORITIES = {
  low: { label: 'Low', color: 'priority-low' },
  medium: { label: 'Medium', color: 'priority-medium' },
  high: { label: 'High', color: 'priority-high' },
};

const STARTER_TASKS = [
  {
    id: 'task-orbit-brief',
    title: 'Shape the launch brief',
    description: 'Distill the narrative into one page the whole team can rally around.',
    priority: 'high',
    dueDate: '2025-02-21',
    status: 'todo',
    createdAt: '2025-02-17T08:30:00.000Z',
  },
  {
    id: 'task-signal-review',
    title: 'Review signal dashboard',
    description: 'Check the latest activation pattern and pull out the three useful signals.',
    priority: 'medium',
    dueDate: '2025-02-24',
    status: 'todo',
    createdAt: '2025-02-17T09:15:00.000Z',
  },
  {
    id: 'task-customer-note',
    title: 'Write customer follow-up',
    description: 'Close the loop with the early access group while the conversation is fresh.',
    priority: 'medium',
    dueDate: '2025-02-19',
    status: 'in-progress',
    createdAt: '2025-02-16T12:00:00.000Z',
  },
  {
    id: 'task-cleanup',
    title: 'Tidy the component library',
    description: 'Remove the unused states and document the patterns the team actually uses.',
    priority: 'low',
    dueDate: '',
    status: 'in-progress',
    createdAt: '2025-02-15T14:20:00.000Z',
  },
  {
    id: 'task-research',
    title: 'Map the onboarding journey',
    description: 'Capture the friction points from first click to first completed action.',
    priority: 'high',
    dueDate: '2025-02-14',
    status: 'done',
    createdAt: '2025-02-13T10:40:00.000Z',
  },
];

const state = {
  tasks: readStorage(STORAGE_KEYS.tasks, STARTER_TASKS),
  theme: readStorage(STORAGE_KEYS.theme, 'light'),
  search: '',
  priorityFilter: 'all',
  isHydrating: true,
  editingTaskId: null,
  modalStatus: 'todo',
  deleteTargetId: null,
  draggedId: null,
};

const app = document.querySelector('#app');

function readStorage(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function persistTasks() {
  window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(state.tasks));
}

function persistTheme() {
  window.localStorage.setItem(STORAGE_KEYS.theme, state.theme);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function makeTaskId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDueDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function isOverdue(task) {
  if (!task.dueDate || task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.dueDate}T12:00:00`) < today;
}

function getProgress() {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.status === 'done').length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

function getVisibleTasks() {
  const query = state.search.trim().toLowerCase();
  return state.tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(query);
    const matchesPriority = state.priorityFilter === 'all' || task.priority === state.priorityFilter;
    return matchesSearch && matchesPriority;
  });
}

function renderShell() {
  app.innerHTML = `
    <div class="taskflow-app">
      <aside class="app-sidebar">
        <div class="brand-lockup">
          <span class="brand-mark"><span></span></span>
          <span class="brand-name">task<span>flow</span></span>
        </div>
        <div class="sidebar-section-label">Workspace</div>
        <nav class="sidebar-nav" aria-label="Workspace navigation">
          <button type="button" class="sidebar-nav-item sidebar-nav-item-active" data-testid="button-nav-board">
            <span class="nav-item-icon"><i class="bi bi-kanban"></i></span>
            <span>My board</span>
            <span class="nav-item-count" id="sidebar-task-count">${state.tasks.length}</span>
          </button>
        </nav>
        <div class="sidebar-note">
          <span class="sidebar-note-kicker">A small reminder</span>
          <p>Progress is a direction, not a destination.</p>
          <span class="sidebar-note-line"></span>
        </div>
        <div class="sidebar-bottom">
          <div class="sidebar-profile">
            <span class="profile-avatar">AR</span>
            <span><strong>Alex Rivera</strong><small>Personal workspace</small></span>
            <span class="profile-status"></span>
          </div>
        </div>
      </aside>
      <main class="app-main">
        <header class="mobile-header">
          <div class="brand-lockup">
            <span class="brand-mark"><span></span></span>
            <span class="brand-name">task<span>flow</span></span>
          </div>
          <button type="button" class="theme-toggle" data-action="toggle-theme" aria-label="Switch theme" data-testid="button-theme-toggle-mobile">
            <span class="theme-toggle-thumb"><i class="bi bi-sun-fill"></i></span>
          </button>
        </header>
        <header class="app-header">
          <div>
            <span class="page-kicker">${new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}</span>
            <h1>Good morning, Alex <span aria-hidden="true">✦</span></h1>
            <p>Keep the important work moving.</p>
          </div>
          <div class="header-actions">
            <div class="header-status"><span class="status-pulse"></span> All changes saved</div>
            <button type="button" class="theme-toggle" data-action="toggle-theme" aria-label="Switch theme" data-testid="button-theme-toggle">
              <span class="theme-toggle-thumb"><i class="bi bi-sun-fill"></i></span>
            </button>
            <span class="header-avatar">AR</span>
          </div>
        </header>
        <section id="board-region" aria-live="polite"></section>
        <footer class="app-footer"><span>TaskFlow / Personal board</span><span>Built for the work in front of you.</span></footer>
      </main>
    </div>
    <div id="modal-root"></div>
  `;
  renderModals();
  updateTheme();
}

function renderSkeleton() {
  document.querySelector('#board-region').innerHTML = `
    <div class="board-skeleton" aria-label="Loading your board" role="status" data-testid="board-skeleton">
      <div class="skeleton-progress"><span class="skeleton-line skeleton-progress-label"></span><span class="skeleton-line skeleton-progress-track"></span><span class="skeleton-line skeleton-progress-percent"></span></div>
      <div class="skeleton-toolbar"><span class="skeleton-line skeleton-search"></span><span class="skeleton-line skeleton-filter"></span><span class="skeleton-line skeleton-action"></span></div>
      <div class="skeleton-columns">
        ${STATUSES.map((status) => `
          <section class="skeleton-column skeleton-column-${status.accent}">
            <div class="skeleton-column-heading"><span class="skeleton-icon"></span><span class="skeleton-line skeleton-column-title"></span><span class="skeleton-count"></span></div>
            <span class="skeleton-divider"></span>
            <div class="skeleton-column-cards">${Array.from({ length: status.id === 'done' ? 1 : 2 }, () => `
              <div class="skeleton-task">
                <div class="skeleton-task-topline"><span class="skeleton-dot"></span><span class="skeleton-line skeleton-priority"></span><span class="skeleton-line skeleton-grip"></span></div>
                <span class="skeleton-line skeleton-task-title"></span><span class="skeleton-line skeleton-task-copy"></span><span class="skeleton-divider"></span><span class="skeleton-line skeleton-task-date"></span>
              </div>`).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    </div>
  `;
}

function renderBoard() {
  const visibleTasks = getVisibleTasks();
  const progress = getProgress();
  const boardRegion = document.querySelector('#board-region');
  document.querySelector('#sidebar-task-count').textContent = state.tasks.length;
  boardRegion.innerHTML = `
    <div class="progress-strip">
      <div class="progress-copy"><strong>Board progress</strong><span>${progress.done} of ${progress.total} tasks complete</span></div>
      <div class="progress-track"><span style="width: ${progress.percent}%"></span></div>
      <strong class="progress-percent">${progress.percent}%</strong>
    </div>
    <div class="board-toolbar">
      <div class="board-toolbar-left">
        <label class="search-field" for="task-search">
          <i class="bi bi-search"></i>
          <input id="task-search" type="search" value="${escapeHtml(state.search)}" placeholder="Search your board" aria-label="Search tasks" data-testid="input-search-tasks">
          <kbd>⌘ K</kbd>
        </label>
        <div class="filter-control"><i class="bi bi-sliders2"></i><span>Filter</span>
          <select id="priority-filter" class="form-select form-select-sm" aria-label="Filter by priority" data-testid="select-priority-filter">
            <option value="all" ${state.priorityFilter === 'all' ? 'selected' : ''}>All</option>
            <option value="low" ${state.priorityFilter === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${state.priorityFilter === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${state.priorityFilter === 'high' ? 'selected' : ''}>High</option>
          </select>
        </div>
      </div>
      <div class="board-toolbar-right">
        <button type="button" class="toolbar-reset btn btn-link" data-action="reset-board" aria-label="Reset board" data-testid="button-reset-board"><i class="bi bi-arrow-counterclockwise"></i> Reset</button>
        <button type="button" class="button button-primary btn" data-action="add-task" data-testid="button-add-task"><i class="bi bi-plus-lg"></i> Add task</button>
      </div>
    </div>
    <div class="board-meta">
      <div class="board-meta-title"><i class="bi bi-grid-3x3-gap"></i><span>Active board</span><span class="meta-divider"></span><span>${state.tasks.length} total ${state.tasks.length === 1 ? 'task' : 'tasks'}</span></div>
      <span class="board-tip">Drag cards to move them between stages</span>
    </div>
    <div class="kanban-board">
      ${STATUSES.map((status) => renderColumn(status, visibleTasks)).join('')}
    </div>
  `;
  bindDragAndDrop();
}

function renderColumn(status, visibleTasks) {
  const columnTasks = visibleTasks.filter((task) => task.status === status.id);
  const totalCount = state.tasks.filter((task) => task.status === status.id).length;
  const emptyCopy = status.id === 'done'
    ? ['Nothing finished yet', 'Complete a task and it will land here.']
    : status.id === 'in-progress'
      ? ['Your focus lane is open', 'Add a task or drop one here.']
      : ['Start with one clear next step', 'Add a task or drop one here.'];
  return `
    <section class="kanban-column kanban-column-${status.accent}" data-status="${status.id}" data-testid="column-${status.id}">
      <header class="column-header">
        <div class="column-heading"><span class="column-symbol column-symbol-${status.accent}"><i class="bi ${status.icon}"></i></span><h2>${status.label}</h2><span class="column-count" data-testid="text-count-${status.id}">${totalCount}</span></div>
        <button type="button" class="icon-button" data-action="add-task" data-status="${status.id}" aria-label="Add task to ${status.label}" data-testid="button-add-${status.id}"><i class="bi bi-plus-lg"></i></button>
      </header>
      <div class="column-rule"></div>
      <div class="column-tasks" data-status="${status.id}">
        ${columnTasks.length ? columnTasks.map(renderTaskCard).join('') : `
          <button type="button" class="empty-column" data-action="add-task" data-status="${status.id}" data-testid="button-empty-${status.id}">
            <span class="empty-plus empty-plus-${status.accent}"><i class="bi bi-plus-lg"></i></span>
            <strong>${emptyCopy[0]}</strong><span>${emptyCopy[1]}</span>
          </button>
        `}
      </div>
      ${columnTasks.length ? `<button type="button" class="column-add-task" data-action="add-task" data-status="${status.id}" data-testid="button-add-task-${status.id}"><i class="bi bi-plus-lg"></i> Add task</button>` : ''}
    </section>
  `;
}

function renderTaskCard(task) {
  const priority = PRIORITIES[task.priority];
  const overdue = isOverdue(task);
  const shortId = task.id.split('-').pop()?.slice(0, 4).toUpperCase();
  const nextStatus = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo';
  return `
    <article class="task-card-shell" draggable="true" data-task-id="${escapeHtml(task.id)}" data-testid="card-task-${escapeHtml(task.id)}">
      <div class="task-card ${task.status === 'done' ? 'task-card-complete' : ''}">
        <div class="task-card-topline">
          <button type="button" class="status-dot status-dot-${task.status}" data-action="cycle-status" data-task-id="${escapeHtml(task.id)}" aria-label="Move ${escapeHtml(task.title)} to ${nextStatus}" data-testid="button-status-${escapeHtml(task.id)}">${task.status === 'done' ? '<i class="bi bi-check-lg"></i>' : ''}</button>
          <span class="priority-mark ${priority.color}"></span><span class="priority-name">${priority.label}</span>
          <span class="drag-grip" aria-label="Drag ${escapeHtml(task.title)}" role="button" tabindex="0"><i class="bi bi-grip-vertical"></i></span>
          <div class="task-menu-wrap">
            <button type="button" class="icon-button task-menu-button" data-action="toggle-menu" data-task-id="${escapeHtml(task.id)}" aria-label="Task actions for ${escapeHtml(task.title)}" data-testid="button-menu-${escapeHtml(task.id)}"><i class="bi bi-three-dots"></i></button>
            <div class="task-menu" data-menu-for="${escapeHtml(task.id)}" role="menu">
              <button type="button" data-action="edit-task" data-task-id="${escapeHtml(task.id)}" data-testid="button-edit-${escapeHtml(task.id)}"><i class="bi bi-pencil"></i> Edit task</button>
              <button type="button" data-action="delete-task" data-task-id="${escapeHtml(task.id)}" data-testid="button-delete-${escapeHtml(task.id)}"><i class="bi bi-trash3"></i> Delete task</button>
            </div>
          </div>
        </div>
        <button type="button" class="task-card-body" data-action="edit-task" data-task-id="${escapeHtml(task.id)}" data-testid="button-open-task-${escapeHtml(task.id)}">
          <h3>${escapeHtml(task.title)}</h3>${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
        </button>
        <div class="task-card-footer">
          ${task.dueDate ? `<span class="due-date ${overdue ? 'due-date-overdue' : ''}" data-testid="text-due-date-${escapeHtml(task.id)}"><i class="bi bi-calendar3"></i>${overdue ? 'Overdue · ' : ''}${formatDueDate(task.dueDate)}</span>` : '<span class="no-due-date">No due date</span>'}
          <span class="task-id">#${shortId}</span>
        </div>
      </div>
    </article>
  `;
}

function renderModals() {
  document.querySelector('#modal-root').innerHTML = `
    <div class="modal fade" id="task-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <section class="modal-content task-modal">
          <div class="modal-topline"><span class="modal-eyebrow" id="task-modal-eyebrow">New task</span><button type="button" class="icon-button" data-action="close-task-modal" aria-label="Close task modal"><i class="bi bi-x-lg"></i></button></div>
          <h2 id="task-modal-title">Put the next thing in motion.</h2>
          <p class="modal-intro">Give the work enough shape to make the next step obvious.</p>
          <form id="task-form">
            <label class="form-label" for="task-title">Title <span>*</span></label>
            <input class="form-control" id="task-title" name="title" required maxlength="100" placeholder="What needs to move forward?" data-testid="input-task-title">
            <label class="form-label" for="task-description">Description</label>
            <textarea class="form-control" id="task-description" name="description" rows="3" maxlength="300" placeholder="Add the useful context..." data-testid="input-task-description"></textarea>
            <div class="form-grid">
              <div><label class="form-label" for="task-priority">Priority</label><select class="form-select" id="task-priority" name="priority" data-testid="select-task-priority"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div><label class="form-label" for="task-due-date">Due date</label><input class="form-control" id="task-due-date" name="dueDate" type="date" data-testid="input-task-due-date"></div>
            </div>
            <div><label class="form-label" for="task-status">Stage</label><select class="form-select" id="task-status" name="status" data-testid="select-task-status">${STATUSES.map((status) => `<option value="${status.id}">${status.label}</option>`).join('')}</select></div>
            <div class="modal-actions"><button type="button" class="button button-quiet btn" data-action="close-task-modal" data-testid="button-cancel-task">Cancel</button><button type="submit" class="button button-primary btn" data-testid="button-save-task">Save task</button></div>
          </form>
        </section>
      </div>
    </div>
    <div class="modal fade" id="delete-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <section class="modal-content confirm-modal">
          <span class="confirm-icon"><i class="bi bi-trash3"></i></span><h2>Delete this task?</h2><p id="delete-copy"></p>
          <div class="modal-actions"><button type="button" class="button button-quiet btn" data-action="close-delete-modal" data-testid="button-cancel-delete">Keep task</button><button type="button" class="button button-danger btn" data-action="confirm-delete" data-testid="button-confirm-delete">Delete task</button></div>
        </section>
      </div>
    </div>
  `;
}

function updateTheme() {
  document.documentElement.classList.toggle('dark', state.theme === 'dark');
  document.querySelectorAll('[data-action="toggle-theme"]').forEach((button) => {
    button.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    button.querySelector('.theme-toggle-thumb').classList.toggle('theme-toggle-thumb-dark', state.theme === 'dark');
    button.querySelector('i').className = state.theme === 'dark' ? 'bi bi-moon-stars-fill' : 'bi bi-sun-fill';
  });
}

function openTaskModal(taskId = null, status = 'todo') {
  state.editingTaskId = taskId;
  state.modalStatus = status;
  const task = taskId ? state.tasks.find((item) => item.id === taskId) : null;
  const form = document.querySelector('#task-form');
  form.reset();
  document.querySelector('#task-modal-eyebrow').textContent = task ? 'Edit task' : 'New task';
  document.querySelector('#task-modal-title').textContent = task ? 'Make an adjustment' : 'Put the next thing in motion.';
  document.querySelector('#task-title').value = task?.title ?? '';
  document.querySelector('#task-description').value = task?.description ?? '';
  document.querySelector('#task-priority').value = task?.priority ?? 'medium';
  document.querySelector('#task-due-date').value = task?.dueDate ?? '';
  document.querySelector('#task-status').value = task?.status ?? status;
  showModal('#task-modal');
  window.setTimeout(() => document.querySelector('#task-title').focus(), 180);
}

function showModal(selector) {
  const modal = document.querySelector(selector);
  modal.classList.add('show', 'd-block');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  if (!document.querySelector('.modal-backdrop')) {
    document.body.insertAdjacentHTML('beforeend', '<div class="modal-backdrop fade show"></div>');
  }
}

function hideModal(selector) {
  const modal = document.querySelector(selector);
  modal.classList.remove('show', 'd-block');
  modal.setAttribute('aria-hidden', 'true');
  document.querySelector('.modal-backdrop')?.remove();
  if (!document.querySelector('.modal.show')) document.body.classList.remove('modal-open');
}

function saveTask(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const taskData = {
    title: String(data.title).trim(),
    description: String(data.description).trim(),
    priority: String(data.priority),
    dueDate: String(data.dueDate),
    status: String(data.status),
  };
  if (!taskData.title) return;
  if (state.editingTaskId) {
    state.tasks = state.tasks.map((task) => task.id === state.editingTaskId ? { ...task, ...taskData } : task);
  } else {
    state.tasks = [...state.tasks, { ...taskData, id: makeTaskId(), createdAt: new Date().toISOString() }];
  }
  persistTasks();
  hideModal('#task-modal');
  renderBoard();
}

function cycleTaskStatus(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  const nextStatus = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo';
  state.tasks = state.tasks.map((item) => item.id === taskId ? { ...item, status: nextStatus } : item);
  persistTasks();
  renderBoard();
}

function openDeleteModal(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  state.deleteTargetId = taskId;
  document.querySelector('#delete-copy').textContent = `“${task.title}” will be removed from your board. This cannot be undone.`;
  showModal('#delete-modal');
}

function deleteTask() {
  if (!state.deleteTargetId) return;
  state.tasks = state.tasks.filter((task) => task.id !== state.deleteTargetId);
  state.deleteTargetId = null;
  persistTasks();
  hideModal('#delete-modal');
  renderBoard();
}

function resetBoard() {
  if (window.confirm('Reset this board to the starter tasks? Your current tasks will be replaced.')) {
    state.tasks = STARTER_TASKS.map((task) => ({ ...task }));
    persistTasks();
    renderBoard();
  }
}

function moveTask(taskId, status, beforeTaskId = null) {
  const draggedTask = state.tasks.find((task) => task.id === taskId);
  if (!draggedTask) return;
  const withoutDragged = state.tasks.filter((task) => task.id !== taskId);
  const movedTask = { ...draggedTask, status };
  if (beforeTaskId) {
    const targetIndex = withoutDragged.findIndex((task) => task.id === beforeTaskId);
    withoutDragged.splice(targetIndex < 0 ? withoutDragged.length : targetIndex, 0, movedTask);
  } else {
    const lastIndex = withoutDragged.reduce((index, task, currentIndex) => task.status === status ? currentIndex : index, -1);
    withoutDragged.splice(lastIndex + 1, 0, movedTask);
  }
  state.tasks = withoutDragged;
  persistTasks();
  renderBoard();
}

function bindDragAndDrop() {
  document.querySelectorAll('.task-card-shell').forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      state.draggedId = card.dataset.taskId;
      card.classList.add('task-card-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', state.draggedId);
    });
    card.addEventListener('dragend', () => {
      state.draggedId = null;
      document.querySelectorAll('.task-card-dragging, .kanban-column-over').forEach((item) => item.classList.remove('task-card-dragging', 'kanban-column-over'));
    });
    card.addEventListener('dragover', (event) => event.preventDefault());
    card.addEventListener('drop', (event) => {
      event.preventDefault();
      const status = card.closest('.kanban-column').dataset.status;
      moveTask(state.draggedId, status, card.dataset.taskId);
    });
  });
  document.querySelectorAll('.kanban-column').forEach((column) => {
    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      column.classList.add('kanban-column-over');
    });
    column.addEventListener('dragleave', (event) => {
      if (!column.contains(event.relatedTarget)) column.classList.remove('kanban-column-over');
    });
    column.addEventListener('drop', (event) => {
      event.preventDefault();
      moveTask(state.draggedId, column.dataset.status);
    });
  });
}

function handleBoardClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const { action, taskId, status } = actionTarget.dataset;
  if (action === 'add-task') openTaskModal(null, status || 'todo');
  if (action === 'edit-task') openTaskModal(taskId);
  if (action === 'delete-task') openDeleteModal(taskId);
  if (action === 'cycle-status') cycleTaskStatus(taskId);
  if (action === 'toggle-menu') {
    const menu = document.querySelector(`[data-menu-for="${CSS.escape(taskId)}"]`);
    document.querySelectorAll('.task-menu.menu-open').forEach((item) => { if (item !== menu) item.classList.remove('menu-open'); });
    menu.classList.toggle('menu-open');
  }
  if (action === 'reset-board') resetBoard();
  if (action === 'toggle-theme') {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    persistTheme();
    updateTheme();
  }
}

function bindEvents() {
  const boardRegion = document.querySelector('#board-region');
  boardRegion.addEventListener('click', handleBoardClick);
  boardRegion.addEventListener('input', (event) => {
    if (event.target.id !== 'task-search') return;
    state.search = event.target.value;
    renderBoard();
    const search = document.querySelector('#task-search');
    search.focus();
    search.setSelectionRange(state.search.length, state.search.length);
  });
  boardRegion.addEventListener('change', (event) => {
    if (event.target.id === 'priority-filter') {
      state.priorityFilter = event.target.value;
      renderBoard();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.task-menu-wrap')) document.querySelectorAll('.task-menu.menu-open').forEach((menu) => menu.classList.remove('menu-open'));
    const actionTarget = event.target.closest('[data-action="toggle-theme"]');
    if (actionTarget) handleBoardClick(event);
    if (event.target.classList.contains('modal')) hideModal(`#${event.target.id}`);
  });
  document.querySelector('#task-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.reportValidity()) saveTask(event.target);
  });
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close-task-modal') hideModal('#task-modal');
    if (action === 'close-delete-modal') hideModal('#delete-modal');
    if (action === 'confirm-delete') deleteTask();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideModal('#task-modal');
      hideModal('#delete-modal');
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.querySelector('#task-search')?.focus();
    }
  });
}

renderShell();
renderSkeleton();
bindEvents();
window.setTimeout(() => {
  state.isHydrating = false;
  renderBoard();
}, 320);