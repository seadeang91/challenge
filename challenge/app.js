const STORAGE_KEY = "daily-challenge-records-v1";
const OTTER_IMG = "assets/otter.png";

const state = {
  today: new Date(),
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(), // 0-indexed
  selectedDate: null, // "YYYY-MM-DD"
  records: {},
  uid: null,
};

const els = {
  monthLabel: document.getElementById("monthLabel"),
  weekdays: document.getElementById("weekdays"),
  grid: document.getElementById("calendarGrid"),
  stats: document.getElementById("stats"),
  prevBtn: document.getElementById("prevMonth"),
  nextBtn: document.getElementById("nextMonth"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalDate: document.getElementById("modalDate"),
  modalResult: document.getElementById("modalResult"),
  modalClose: document.getElementById("modalClose"),
  doneBtn: document.getElementById("doneBtn"),
  clearDayBtn: document.getElementById("clearDayBtn"),
  toast: document.getElementById("toast"),
  stage: document.getElementById("stage"),
  authGate: document.getElementById("authGate"),
  authSubtitle: document.getElementById("authSubtitle"),
  authError: document.getElementById("authError"),
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginBtn: document.getElementById("loginBtn"),
  userEmail: document.getElementById("userEmail"),
  logoutBtn: document.getElementById("logoutBtn"),
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function saveRecords() {
  if (!state.uid) return;
  window.otterFirestore.save(state.uid, state.records).catch((err) => {
    console.error(err);
    showToast("저장에 실패했어요. 다시 시도해주세요.");
  });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateKey(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function stampRotation(key) {
  const day = Number(key.slice(-2));
  return ((day * 53) % 9 - 4) * 3;
}

function dayStatus(key) {
  const r = state.records[key];
  if (!r) return "none";
  const both = r.school === "success" && r.academy === "success";
  if (both) return "stamped";
  if (r.school || r.academy) return "partial";
  return "none";
}

function renderWeekdays() {
  els.weekdays.innerHTML = WEEKDAY_LABELS.map((w) => `<span>${w}</span>`).join("");
}

function renderCalendar() {
  const { viewYear, viewMonth } = state;
  els.monthLabel.textContent = `${viewYear}년 ${viewMonth + 1}월`;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, otherMonth: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, otherMonth: false });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length, otherMonth: true, isNext: true });
  }

  const todayKey = dateKey(state.today.getFullYear(), state.today.getMonth(), state.today.getDate());

  els.grid.innerHTML = "";
  let dayCounterCurrent = 1;
  let dayCounterNext = 1;

  cells.forEach((cell) => {
    const div = document.createElement("div");
    div.classList.add("day-cell");

    if (cell.otherMonth) {
      div.classList.add("empty", "other-month");
      els.grid.appendChild(div);
      return;
    }

    const key = dateKey(viewYear, viewMonth, cell.day);
    const status = dayStatus(key);

    if (key === todayKey) div.classList.add("today");
    if (status === "stamped") div.classList.add("stamped");
    if (status === "partial") div.classList.add("partial");

    if (status === "stamped") {
      const wrap = document.createElement("div");
      wrap.className = "stampwrap";
      wrap.innerHTML = `
        <div class="stamp-ring" style="transform:rotate(${stampRotation(key)}deg);">
          <img src="${OTTER_IMG}" alt="성공 도장" />
        </div>
      `;
      div.appendChild(wrap);
    } else {
      const num = document.createElement("div");
      num.className = "plainday";
      num.textContent = cell.day;
      div.appendChild(num);

      if (status === "partial") {
        const r = state.records[key];
        const dots = document.createElement("div");
        dots.className = "status-dot";
        dots.innerHTML = `
          <span class="school ${r.school === "fail" ? "fail" : ""}" style="${!r.school ? "opacity:.25" : ""}"></span>
          <span class="academy ${r.academy === "fail" ? "fail" : ""}" style="${!r.academy ? "opacity:.25" : ""}"></span>
        `;
        div.appendChild(dots);
      }
    }

    div.addEventListener("click", () => openModal(key));
    els.grid.appendChild(div);
  });
}

function renderStats() {
  const keys = Object.keys(state.records);

  let streak = 0;
  const cursor = new Date(state.today);
  cursor.setHours(0, 0, 0, 0);
  while (true) {
    const key = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (dayStatus(key) === "stamped") {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  const todayY = state.today.getFullYear();
  const todayM = state.today.getMonth() + 1;
  const thisMonthCount = keys.filter((k) => {
    const [y, m] = k.split("-").map(Number);
    return y === todayY && m === todayM && dayStatus(k) === "stamped";
  }).length;

  const weekStart = new Date(state.today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const thisWeekCount = keys.filter((k) => {
    const [y, m, d] = k.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date >= weekStart && date <= weekEnd && dayStatus(k) === "stamped";
  }).length;

  els.stats.innerHTML = `
    <div class="stat-box">
      <div class="label">이번주 성공</div>
      <div class="num">${thisWeekCount}회</div>
    </div>
    <div class="stat-box">
      <div class="label">이번달 성공</div>
      <div class="num">${thisMonthCount}회</div>
    </div>
    <div class="stat-box">
      <div class="label">연속 성공</div>
      <div class="num">
        <svg viewBox="0 0 24 24" style="width:13px;height:13px;"><path d="M12 2c1 3-2 4-2 7a3 3 0 0 0 6 0c2 2 2 5 0 8a7 7 0 1 1-9-11c1.5-1 2-3 2-4Z" fill="#ff8a45"/></svg>
        ${streak}일
      </div>
    </div>
  `;
}

function renderAll() {
  renderWeekdays();
  renderCalendar();
  renderStats();
}

// ---------- Modal ----------

function openModal(key) {
  state.selectedDate = key;
  const [y, m, d] = key.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const wd = WEEKDAY_LABELS[dateObj.getDay()];
  els.modalDate.textContent = `${y}년 ${m}월 ${d}일 (${wd})`;

  const record = state.records[key] || {};
  document.querySelectorAll(".category").forEach((cat) => {
    const category = cat.dataset.category;
    cat.querySelectorAll(".choice").forEach((btn) => {
      btn.classList.toggle("active", record[category] === btn.dataset.value);
    });
  });

  updateModalResult();
  els.modalBackdrop.classList.add("open");
}

function closeModal() {
  els.modalBackdrop.classList.remove("open");
  state.selectedDate = null;
}

function updateModalResult() {
  const record = state.records[state.selectedDate] || {};
  if (record.school === "success" && record.academy === "success") {
    els.modalResult.textContent = "🦦 오늘의 수댕이 도장 완성! 정말 잘했어요!";
  } else if (record.school || record.academy) {
    els.modalResult.textContent = "조금만 더 힘내볼까요?";
  } else {
    els.modalResult.textContent = "";
  }
}

function setChoice(category, value) {
  const key = state.selectedDate;
  if (!key) return;
  if (!state.records[key]) state.records[key] = {};
  const record = state.records[key];

  if (record[category] === value) {
    delete record[category];
  } else {
    record[category] = value;
  }

  if (!record.school && !record.academy) {
    delete state.records[key];
  }

  saveRecords();

  document.querySelectorAll(`.category[data-category="${category}"] .choice`).forEach((btn) => {
    btn.classList.toggle("active", record[category] === btn.dataset.value);
  });

  updateModalResult();
  renderCalendar();
  renderStats();

  if (record.school === "success" && record.academy === "success") {
    showToast("🦦 수댕이 도장 획득! 오늘도 성공!");
  }
}

function clearDay() {
  const key = state.selectedDate;
  if (!key) return;
  delete state.records[key];
  saveRecords();
  document.querySelectorAll(".choice").forEach((btn) => btn.classList.remove("active"));
  updateModalResult();
  renderCalendar();
  renderStats();
  showToast("기록을 지웠어요");
}

// ---------- Toast ----------
let toastTimer = null;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

// ---------- Events ----------

els.prevBtn.addEventListener("click", () => {
  state.viewMonth--;
  if (state.viewMonth < 0) {
    state.viewMonth = 11;
    state.viewYear--;
  }
  renderCalendar();
  renderStats();
});

els.nextBtn.addEventListener("click", () => {
  state.viewMonth++;
  if (state.viewMonth > 11) {
    state.viewMonth = 0;
    state.viewYear++;
  }
  renderCalendar();
  renderStats();
});

document.querySelectorAll(".category .choice").forEach((btn) => {
  btn.addEventListener("click", () => {
    const category = btn.closest(".category").dataset.category;
    setChoice(category, btn.dataset.value);
  });
});

els.modalClose.addEventListener("click", closeModal);
els.doneBtn.addEventListener("click", closeModal);
els.clearDayBtn.addEventListener("click", clearDay);
els.modalBackdrop.addEventListener("click", (e) => {
  if (e.target === els.modalBackdrop) closeModal();
});

renderAll();

// ---------- Auth ----------
let unsubscribeFirestore = null;

function showAuthGate(message) {
  els.stage.hidden = true;
  els.authGate.hidden = false;
  els.loginForm.hidden = false;
  els.authSubtitle.textContent = message || "로그인하고 기록을 시작하세요";
}

function showApp() {
  els.authGate.hidden = true;
  els.stage.hidden = false;
}

function migrateLocalRecordsIfNeeded() {
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (local && Object.keys(local).length > 0) {
      state.records = local;
      saveRecords();
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore malformed local data
  }
}

window.handleAuthUser = function (user, allowed) {
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    unsubscribeFirestore = null;
  }

  if (!user) {
    state.uid = null;
    state.records = {};
    showAuthGate();
    return;
  }

  if (!allowed) {
    showAuthGate("이 계정은 사용할 수 없습니다.");
    window.otterAuth.signOut();
    return;
  }

  state.uid = user.uid;
  els.userEmail.textContent = user.email;
  showApp();

  let firstSnapshot = true;
  unsubscribeFirestore = window.otterFirestore.subscribe(user.uid, (records) => {
    if (firstSnapshot && Object.keys(records).length === 0) {
      firstSnapshot = false;
      migrateLocalRecordsIfNeeded();
      return;
    }
    firstSnapshot = false;
    state.records = records;
    renderCalendar();
    renderStats();
  });
};

els.loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value;
  els.authError.textContent = "";
  els.loginBtn.disabled = true;
  els.loginBtn.textContent = "로그인 중...";
  window.otterAuth
    .signIn(email, password)
    .catch(() => {
      els.authError.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
    })
    .finally(() => {
      els.loginBtn.disabled = false;
      els.loginBtn.textContent = "로그인";
    });
});

els.logoutBtn.addEventListener("click", () => {
  window.otterAuth.signOut();
});

// ---------- Service worker ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
