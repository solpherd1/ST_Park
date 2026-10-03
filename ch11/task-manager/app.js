"use strict";
/* 제10장 업무 관리 웹 프로그램 — 단일 사용자, LocalStorage 저장
   11장에서 Manifest·Service Worker를 추가해도 이 파일의 데이터 흐름은 그대로 유지한다. */

// ===== 1. 상수와 상태 =====
const STORAGE_KEY = "ai-agent-designer.task-manager.v1";
const SCHEMA_VERSION = 1;
const STATUSES = ["예정", "진행 중", "완료"];
const PRIORITIES = ["높음", "보통", "낮음"];

let tasks = [];        // 데이터의 유일한 기준(single source of truth)
let editingId = null;  // 수정 중인 업무의 id, 없으면 null

// ===== 2. 도구 함수 =====
function makeId() {
  // crypto.randomUUID()는 보안 컨텍스트(https, localhost)에서만 동작하므로 대체 방식을 둔다
  if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "task-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function getLocalDateString(date = new Date()) {
  // toISOString()은 UTC 기준이라 한국 시간 오전 9시 이전에 날짜가 하루 밀릴 수 있다
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isOverdue(task, today = getLocalDateString()) {
  return task.status !== "완료" && task.dueDate !== "" && task.dueDate < today;
}

// ===== 3. 데이터 모델과 검증 =====
function readForm() {
  return {
    title: document.querySelector("#title").value.trim(),
    status: document.querySelector("#status").value,
    priority: document.querySelector("#priority").value,
    dueDate: document.querySelector("#due-date").value,
    memo: document.querySelector("#memo").value.trim()
  };
}

function validateTaskInput(input) {
  if (!input.title) return "업무명을 입력하십시오.";
  if (input.title.length > 100) return "업무명은 100자 이하로 입력하십시오.";
  if (!STATUSES.includes(input.status)) return "상태 값이 올바르지 않습니다.";
  if (!PRIORITIES.includes(input.priority)) return "우선순위 값이 올바르지 않습니다.";
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return "마감일 형식이 올바르지 않습니다.";
  if (input.memo.length > 500) return "메모는 500자 이하로 입력하십시오.";
  return "";
}

function createTask(input) {
  const now = new Date().toISOString();
  return { id: makeId(), ...input, createdAt: now, updatedAt: now };
}

function isValidTask(t) {
  return t && typeof t.id === "string" && typeof t.title === "string" && t.title.trim() !== "" &&
    STATUSES.includes(t.status) && PRIORITIES.includes(t.priority) &&
    typeof t.dueDate === "string" && typeof t.memo === "string" &&
    typeof t.createdAt === "string" && typeof t.updatedAt === "string";
}

// ===== 4. 저장과 불러오기 =====
function saveTasks() {
  try {
    const payload = { schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), tasks };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    // 저장 공간 초과, 사생활 보호 모드 등
    showMessage("저장하지 못했습니다. 브라우저 저장 공간을 확인하고 JSON 백업을 내보내십시오.", true);
    return false;
  }
}

function loadTasks() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.tasks)) throw new Error("schema");
    return data.tasks.filter(isValidTask);
  } catch (error) {
    // 손상된 값은 지우지 않고 별도 키에 보관해 복구 가능성을 남긴다
    if (raw) localStorage.setItem(STORAGE_KEY + ".corrupted", raw);
    showMessage("저장 데이터를 읽지 못해 빈 목록으로 시작합니다. 원래 값은 별도로 보관했습니다.", true);
    return [];
  }
}

// ===== 5. 등록·수정·완료·삭제 =====
function addTask(input) {
  tasks.push(createTask(input));
}

function updateTask(id, input) {
  tasks = tasks.map(t => t.id === id ? { ...t, ...input, updatedAt: new Date().toISOString() } : t);
}

function toggleComplete(id) {
  tasks = tasks.map(t => {
    if (t.id !== id) return t;
    const status = t.status === "완료" ? "진행 중" : "완료";
    return { ...t, status, updatedAt: new Date().toISOString() };
  });
}

function deleteTask(id) {
  const target = tasks.find(t => t.id === id);
  if (!target) return;
  if (!confirm(`“${target.title}” 업무를 영구 삭제할까요? 되돌릴 수 없습니다.`)) return;
  tasks = tasks.filter(t => t.id !== id);
  if (editingId === id) resetForm();
  commit("삭제했습니다.");
}

// ===== 6. 폼 처리 =====
const form = document.querySelector("#task-form");
const submitButton = document.querySelector("#submit-button");
const cancelButton = document.querySelector("#cancel-edit");

function showMessage(text, isError = false) {
  const el = document.querySelector("#form-message");
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function resetForm() {
  form.reset();
  document.querySelector("#priority").value = "보통";
  editingId = null;
  submitButton.textContent = "등록";
  cancelButton.hidden = true;
  document.querySelector("#form-title").textContent = "업무 등록";
}

function startEdit(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  editingId = id;
  document.querySelector("#title").value = t.title;
  document.querySelector("#status").value = t.status;
  document.querySelector("#priority").value = t.priority;
  document.querySelector("#due-date").value = t.dueDate;
  document.querySelector("#memo").value = t.memo;
  submitButton.textContent = "수정 저장";
  cancelButton.hidden = false;
  document.querySelector("#form-title").textContent = "업무 수정";
  document.querySelector("#title").focus();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const input = readForm();
  const error = validateTaskInput(input);
  if (error) { showMessage(error, true); document.querySelector("#title").focus(); return; }
  const message = editingId ? "수정했습니다." : "등록했습니다.";
  if (editingId) updateTask(editingId, input); else addTask(input);
  resetForm();
  commit(message);
});

cancelButton.addEventListener("click", () => { resetForm(); showMessage("수정을 취소했습니다."); });

// ===== 7. 필터와 렌더링 =====
function getFilteredTasks() {
  const keyword = document.querySelector("#keyword").value.trim().toLowerCase();
  const status = document.querySelector("#filter-status").value;
  const priority = document.querySelector("#filter-priority").value;
  const dateRule = document.querySelector("#filter-date").value;
  const today = getLocalDateString();
  return tasks.filter(t => {
    const text = (t.title + " " + t.memo).toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    const matchStatus = status === "전체" || t.status === status;
    const matchPriority = priority === "전체" || t.priority === priority;
    const matchDate = dateRule === "전체" ||
      (dateRule === "오늘" && t.dueDate === today) ||
      (dateRule === "지연" && isOverdue(t, today)) ||
      (dateRule === "없음" && t.dueDate === "");
    return matchKeyword && matchStatus && matchPriority && matchDate;   // 모든 조건을 AND로 결합
  });
}

function sortTasks(items) {
  // 미완료 우선 → 마감일 빠른 순(없음은 뒤) → 우선순위
  const rank = { "높음": 0, "보통": 1, "낮음": 2 };
  return [...items].sort((a, b) =>
    (a.status === "완료") - (b.status === "완료") ||
    (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
    rank[a.priority] - rank[b.priority]);
}

function makeButton(label, action, id) {
  const button = document.createElement("button");
  button.type = "button";            // 폼 제출로 오인되지 않게 한다
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function render() {
  const list = document.querySelector("#task-list");
  const count = document.querySelector("#result-count");
  const items = sortTasks(getFilteredTasks());
  const today = getLocalDateString();
  list.replaceChildren();

  if (tasks.length === 0) count.textContent = "아직 등록된 업무가 없습니다. 업무 등록 양식에서 첫 업무를 등록하십시오.";
  else if (items.length === 0) count.textContent = `전체 ${tasks.length}건 중 조건에 맞는 업무가 없습니다.`;
  else count.textContent = `전체 ${tasks.length}건 중 ${items.length}건 표시`;

  for (const t of items) {
    const li = document.createElement("li");
    li.className = "task-item";
    if (t.status === "완료") li.classList.add("done");
    if (isOverdue(t, today)) li.classList.add("overdue");

    const main = document.createElement("div");
    main.className = "task-main";
    const title = document.createElement("strong");
    title.className = "task-title";
    title.textContent = t.title;                 // innerHTML 대신 textContent로 XSS 예방
    const meta = document.createElement("span");
    meta.className = "task-meta";
    meta.textContent = `${t.status} · ${t.priority} · 마감 ${t.dueDate || "없음"}`;
    main.append(title, meta);
    if (isOverdue(t, today)) {
      const badge = document.createElement("span");
      badge.className = "badge-overdue";
      badge.textContent = "기한 지남";
      main.append(badge);
    }
    if (t.memo) {
      const memo = document.createElement("span");
      memo.className = "task-memo";
      memo.textContent = t.memo;
      main.append(memo);
    }
    li.append(main,
      makeButton(t.status === "완료" ? "완료 취소" : "완료", "toggle", t.id),
      makeButton("수정", "edit", t.id),
      makeButton("삭제", "delete", t.id));
    list.append(li);
  }
}

// 저장과 화면 갱신을 항상 함께 수행한다(필터 조건도 유지됨)
function commit(message) {
  if (saveTasks() && message) showMessage(message);
  render();
}

// 목록 버튼은 이벤트 위임으로 한 번만 연결한다
document.querySelector("#task-list").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "toggle") { toggleComplete(id); commit("상태를 바꿨습니다."); }
  if (action === "edit") startEdit(id);
  if (action === "delete") deleteTask(id);
});

document.querySelector("#keyword").addEventListener("input", render);
["#filter-status", "#filter-priority", "#filter-date"].forEach(sel =>
  document.querySelector(sel).addEventListener("change", render));
document.querySelector("#reset-filters").addEventListener("click", () => {
  document.querySelector("#keyword").value = "";
  ["#filter-status", "#filter-priority", "#filter-date"].forEach(sel => document.querySelector(sel).value = "전체");
  render();
});

// ===== 8. JSON 백업 내보내기·가져오기 =====
function exportTasks() {
  const payload = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), tasks };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `task-backup-${getLocalDateString()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);  // 다운로드 시작 후 해제
}

function importTasks(file) {
  if (!file) return;
  if (file.size > 1024 * 1024) { showMessage("1MB보다 큰 파일은 가져올 수 없습니다.", true); return; }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.tasks)) throw new Error("schema");
      const valid = data.tasks.filter(isValidTask);
      const skipped = data.tasks.length - valid.length;
      if (!confirm(`유효한 업무 ${valid.length}건으로 현재 목록 ${tasks.length}건을 교체할까요?` +
        (skipped ? ` (형식 오류 ${skipped}건 제외)` : ""))) return;
      exportTasks();                    // 교체 전 현재 데이터를 자동 백업
      tasks = valid;
      resetForm();
      commit(`백업에서 ${valid.length}건을 가져왔습니다.`);
    } catch (error) {
      showMessage("올바른 업무 백업 파일이 아닙니다.", true);
    }
  };
  reader.readAsText(file);
}

document.querySelector("#export-button").addEventListener("click", exportTasks);
document.querySelector("#import-file").addEventListener("change", event => {
  importTasks(event.target.files[0]);
  event.target.value = "";              // 같은 파일을 다시 고를 수 있게 초기화
});

// ===== 9. 시작 =====
tasks = loadTasks();
render();
