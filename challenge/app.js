const STORAGE_KEY = "daily-challenge-records-v1";
const OTTER_IMG = "assets/otter.png";

const state = {
  today: new Date(),
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(), // 0-indexed
  selectedDate: null, // "YYYY-MM-DD"
  records: {},
  uid: null,
  justStampedKey: null, // date key whose stamp should play the landing animation
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
  dayNote: document.getElementById("dayNote"),
  doneBtn: document.getElementById("doneBtn"),
  clearDayBtn: document.getElementById("clearDayBtn"),
  toast: document.getElementById("toast"),
  confettiLayer: document.getElementById("confettiLayer"),
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

// Korean public holidays (source: 네이버 캘린더), including 대체공휴일/임시공휴일.
const HOLIDAYS = {
  "2024-01-01": "신정",
  "2024-02-09": "설날 연휴",
  "2024-02-10": "설날",
  "2024-02-11": "설날 연휴",
  "2024-02-12": "대체공휴일",
  "2024-03-01": "삼일절",
  "2024-05-05": "어린이날",
  "2024-05-06": "대체공휴일",
  "2024-05-15": "부처님오신날",
  "2024-06-06": "현충일",
  "2024-08-15": "광복절",
  "2024-09-16": "추석 연휴",
  "2024-09-17": "추석",
  "2024-09-18": "추석 연휴",
  "2024-10-03": "개천절",
  "2024-10-09": "한글날",
  "2024-12-25": "성탄절",

  "2025-01-01": "신정",
  "2025-01-27": "임시공휴일",
  "2025-01-28": "설날 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설날 연휴",
  "2025-03-01": "삼일절",
  "2025-03-03": "대체공휴일",
  "2025-05-05": "어린이날·부처님오신날",
  "2025-05-06": "대체공휴일",
  "2025-06-03": "임시공휴일",
  "2025-06-06": "현충일",
  "2025-08-15": "광복절",
  "2025-10-03": "개천절",
  "2025-10-06": "추석 연휴",
  "2025-10-07": "추석",
  "2025-10-08": "대체공휴일",
  "2025-10-09": "한글날",
  "2025-12-25": "성탄절",

  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",

  "2027-01-01": "신정",
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "대체공휴일",
  "2027-03-01": "삼일절",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-08-15": "광복절",
  "2027-08-16": "대체공휴일",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절",
  "2027-10-04": "대체공휴일",
  "2027-10-09": "한글날",
  "2027-10-11": "대체공휴일",
  "2027-12-25": "성탄절",
  "2027-12-27": "대체공휴일",
};

function saveRecords() {
  if (!state.uid) return;
  window.otterFirestore.save(state.records).catch((err) => {
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
    if (HOLIDAYS[key]) {
      div.classList.add("holiday");
      div.title = HOLIDAYS[key];
    }

    if (status === "stamped") {
      const wrap = document.createElement("div");
      wrap.className = "stampwrap";
      const isLanding = key === state.justStampedKey;
      const rot = stampRotation(key);
      wrap.innerHTML = `
        <div class="stamp-ring${isLanding ? " landing" : ""}" style="${isLanding ? `--rest-rot:${rot}deg;` : `transform:rotate(${rot}deg);`}">
          <img src="${OTTER_IMG}" alt="성공 도장" />
        </div>
        ${isLanding ? '<div class="stamp-impact"></div>' : ""}
      `;
      div.appendChild(wrap);
    } else {
      const num = document.createElement("div");
      num.className = "plainday";
      num.textContent = cell.day;
      div.appendChild(num);
    }

    div.addEventListener("click", () => openModal(key));
    els.grid.appendChild(div);
  });
}

function renderStats() {
  const keys = Object.keys(state.records);

  // Current streak ending today. If today hasn't been recorded yet, an
  // in-progress "today" shouldn't zero out a real streak from prior days.
  const cursor = new Date(state.today);
  cursor.setHours(0, 0, 0, 0);
  const todayKey = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
  if (dayStatus(todayKey) !== "stamped") {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (true) {
    const key = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (dayStatus(key) === "stamped") {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  if (streak < 2) streak = 0;

  const todayY = state.today.getFullYear();
  const todayM = state.today.getMonth() + 1;
  const thisMonthCount = keys.filter((k) => {
    const [y, m] = k.split("-").map(Number);
    return y === todayY && m === todayM && dayStatus(k) === "stamped";
  }).length;

  // Weekdays (Mon-Fri) so far this month with no recorded status at all.
  let unmarkedWeekdayCount = 0;
  for (let d = 1; d <= state.today.getDate(); d++) {
    const dow = new Date(todayY, todayM - 1, d).getDay();
    if (dow === 0 || dow === 6) continue;
    if (dayStatus(dateKey(todayY, todayM - 1, d)) === "none") unmarkedWeekdayCount++;
  }

  els.stats.innerHTML = `
    <div class="stat-box">
      <div class="label">확인해주세요</div>
      <div class="num">${unmarkedWeekdayCount}일</div>
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

let pendingConfetti = false;

function openModal(key) {
  pendingConfetti = false;
  state.justStampedKey = null;
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

  els.dayNote.value = record.note || "";
  updateModalResult();
  els.modalBackdrop.classList.add("open");
}

function closeModal() {
  flushNote();
  els.modalBackdrop.classList.remove("open");
  state.selectedDate = null;
  if (pendingConfetti) {
    pendingConfetti = false;
    renderCalendar();
    fireConfetti();
  }
  state.justStampedKey = null;
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

  if (!record.school && !record.academy && !record.note) {
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
    pendingConfetti = true;
    state.justStampedKey = key;
    showToast("🦦 수댕이 도장 획득! 오늘도 성공!");
  } else {
    pendingConfetti = false;
    state.justStampedKey = null;
  }
}

let noteTimer = null;

function commitNote() {
  const key = state.selectedDate;
  if (!key) return;
  const text = els.dayNote.value.trim();
  const record = state.records[key] || {};
  if ((record.note || "") === text) return;
  if (text) {
    record.note = text;
    state.records[key] = record;
  } else {
    delete record.note;
    if (!record.school && !record.academy) delete state.records[key];
  }
  saveRecords();
}

function flushNote() {
  if (noteTimer === null) return;
  clearTimeout(noteTimer);
  noteTimer = null;
  commitNote();
}

function clearDay() {
  const key = state.selectedDate;
  if (!key) return;
  pendingConfetti = false;
  state.justStampedKey = null;
  clearTimeout(noteTimer);
  noteTimer = null;
  delete state.records[key];
  saveRecords();
  els.dayNote.value = "";
  document.querySelectorAll(".choice").forEach((btn) => btn.classList.remove("active"));
  updateModalResult();
  renderCalendar();
  renderStats();
  showToast("기록을 지웠어요");
}

// ---------- Confetti ----------
const CONFETTI_COLORS = ["#ff8a45", "#2f6fed", "#ffd23f", "#ff6a8a", "#4fd1a5", "#8a5a34"];

function fireConfetti() {
  const layer = els.confettiLayer;
  if (!layer) return;

  ["left", "right"].forEach((side) => {
    const dir = side === "left" ? 1 : -1;
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";

      const size = 6 + Math.random() * 6;
      piece.style.width = `${size}px`;
      piece.style.height = `${size * (Math.random() < 0.5 ? 1 : 0.6)}px`;
      piece.style.borderRadius = Math.random() < 0.5 ? "50%" : "2px";
      piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      piece.style.left = side === "left" ? "0" : "auto";
      piece.style.right = side === "right" ? "0" : "auto";
      piece.style.top = `${30 + Math.random() * 40}%`;

      layer.appendChild(piece);

      const angle = (Math.random() * 55 + 15) * (Math.PI / 180);
      const distance = 180 + Math.random() * 320;
      const dx = dir * distance * Math.cos(angle);
      const dy = -distance * Math.sin(angle);
      const rotate = Math.random() * 720 - 360;

      const animation = piece.animate(
        [
          { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${dx * 1.15}px, ${dy + 320}px) rotate(${rotate * 1.5}deg)`, opacity: 0 },
        ],
        { duration: 2200 + Math.random() * 1400, delay: Math.random() * 500, easing: "cubic-bezier(.2,.6,.35,1)", fill: "forwards" }
      );
      animation.onfinish = () => piece.remove();
    }
  });
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

els.dayNote.addEventListener("input", () => {
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    noteTimer = null;
    commitNote();
  }, 600);
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

// One-time migration from the old per-account document (pre-shared-calendar) into
// the shared doc, run only when the shared doc is still empty.
async function migrateLegacyRecordsIfNeeded(uid) {
  try {
    const legacy = await window.otterFirestore.fetchLegacyRecords(uid);
    if (legacy && Object.keys(legacy).length > 0) {
      state.records = legacy;
      saveRecords();
      return;
    }
  } catch (err) {
    console.error(err);
  }
  migrateLocalRecordsIfNeeded();
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
  unsubscribeFirestore = window.otterFirestore.subscribe((records) => {
    if (firstSnapshot && Object.keys(records).length === 0) {
      firstSnapshot = false;
      migrateLegacyRecordsIfNeeded(user.uid);
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
