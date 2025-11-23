// ====== Sound system (calm & cute) ======

let sfxEnabled = false;
let audioCtx = null;

// File-based sounds
let bgMusic = null;
let openSound = null;
let closeSound = null;
let hoverSound = null;
let clickSound = null;

// Load audio files (only once)
function initAudioFiles() {
  if (bgMusic) return; // already created

  // 👇 Your REAL Catbox URLs (WORKS IN CODEPEN)
  bgMusic = new Audio("https://files.catbox.moe/7bosxt.mp3");   // background music
  bgMusic.loop = true;
  bgMusic.volume = 0.05; // soft background

  openSound = new Audio("https://files.catbox.moe/u0bxnb.wav");  // open / click sound
  closeSound = new Audio("https://files.catbox.moe/3gmlma.wav"); // close sound

  // optional sounds (you didn’t upload them so they fall back automatically)
  hoverSound = null;
  clickSound = null;

  // Slightly lower SFX volume so it’s gentle
  [openSound, closeSound, hoverSound, clickSound].forEach((snd) => {
    if (snd) snd.volume = 0.2;
  });
}

// Play a single audio element (resetting it so it can spam-click)
function playFileSound(sound) {
  if (!sound) return false;
  try {
    sound.currentTime = 0;
    sound.play();
    return true;
  } catch (e) {
    return false;
  }
}

function playUiSound(kind) {
  if (!sfxEnabled) return;

  // Try using file sounds first
  initAudioFiles();

  let sound = null;

  if (kind === "open") sound = openSound;
  else if (kind === "close") sound = closeSound;
  else if (kind === "hover") sound = hoverSound;
  else if (kind === "click") sound = clickSound;

  const played = sound ? playFileSound(sound) : false;

  // If file sound played correctly → we stop here
  if (played) return;

  // ====== Fallback cute oscillator (only if no file available) ======

  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    let freq = 200;
    if (kind === "close") freq = 100;
    if (kind === "hover") freq = 0;

    osc.type = "sine";
    osc.frequency.value = freq;

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
    gain.gain.linearRampToValueAtTime(0.0, now + 0.26);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    // ignore errors
  }
}



// ====== Window controls ======

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;

  closeAllWindows(false); // close others without playing close sound

  win.setAttribute("aria-hidden", "false");
  win.style.transform = "translate(-50%, -50%) scale(1)";
  win.style.left = "50%";
  win.style.top = "50%";
  win.style.margin = "0";

  playUiSound("open");
}

function closeAllWindows(playSound = true) {
  document.querySelectorAll(".window").forEach((win) => {
    if (win.getAttribute("aria-hidden") === "false" && playSound) {
      playUiSound("close");
    }
    win.setAttribute("aria-hidden", "true");
  });
}

// ====== Dragging windows ======

let dragState = null;
let zCounter = 80;

function makeDraggable(win) {
  const header = win.querySelector(".window-header");
  if (!header) return;

  header.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    const rect = win.getBoundingClientRect();

    dragState = {
      win,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    win.classList.add("dragging");
    win.style.transition = "none";
    win.style.left = rect.left + "px";
    win.style.top = rect.top + "px";
    win.style.transform = "scale(1)";
    win.style.margin = "0";
    win.style.zIndex = ++zCounter;

    document.body.style.userSelect = "none";
  });
}

document.addEventListener("mousemove", (e) => {
  if (!dragState) return;
  const { win, offsetX, offsetY } = dragState;

  let x = e.clientX - offsetX;
  let y = e.clientY - offsetY;

  const maxX = window.innerWidth - win.offsetWidth;
  const maxY = window.innerHeight - win.offsetHeight;

  x = Math.max(8, Math.min(x, maxX - 8));
  y = Math.max(8, Math.min(y, maxY - 8));

  win.style.left = x + "px";
  win.style.top = y + "px";
});

document.addEventListener("mouseup", () => {
  if (!dragState) return;
  dragState.win.classList.remove("dragging");
  dragState.win.style.transition = "";
  dragState = null;
  document.body.style.userSelect = "";
});

// ====== DOM Ready ======

document.addEventListener("DOMContentLoaded", () => {
  // Dock buttons open windows
  document.querySelectorAll("[data-open-window]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open-window");
      openWindow(id);
    });

    // tiny hover sound
    btn.addEventListener("mouseenter", () => playUiSound("hover"));
  });

  // Close buttons
  document.querySelectorAll("[data-close-window]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const win = btn.closest(".window");
      if (win && win.getAttribute("aria-hidden") === "false") {
        playUiSound("close");
      }
      if (win) {
        win.setAttribute("aria-hidden", "true");
      }
    });
  });

  // Escape key closes windows
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllWindows();
    }
  });

  // Theme toggle
  const themeBtn = document.getElementById("toggle-theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("theme-dark");
      document.body.classList.toggle("theme-light", !isDark);
      themeBtn.setAttribute("aria-pressed", String(isDark));
      themeBtn.textContent = isDark ? "☀️" : "🌙";
    });
  }

  // SFX + background music toggle
const sfxBtn = document.getElementById("toggle-sfx");
if (sfxBtn) {
  sfxBtn.addEventListener("click", () => {
    sfxEnabled = !sfxEnabled;
    sfxBtn.setAttribute("aria-pressed", String(sfxEnabled));
    sfxBtn.textContent = sfxEnabled ? "🔈" : "🔊";

    // We only create Audio objects after a user click (browser rule)
    initAudioFiles();

    if (sfxEnabled) {
      // Start background music (user just clicked – allowed)
      try {
        if (bgMusic) bgMusic.play();
      } catch (e) {}
      playUiSound("open");
    } else {
      // Stop background music
      if (bgMusic) bgMusic.pause();
    }
  });
}


  // Mobile note show/dismiss
  const mobileNote = document.querySelector(".mobile-note");
  const dismissBtn = document.getElementById("dismiss-mobile-note");

  if (mobileNote && dismissBtn) {
    const seen = window.localStorage.getItem("mobile-note-dismissed");
    if (!seen && window.innerWidth < 780) {
      mobileNote.style.display = "block";
    }

    dismissBtn.addEventListener("click", () => {
      mobileNote.style.display = "none";
      window.localStorage.setItem("mobile-note-dismissed", "true");
    });
  }

  // Year in footer
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Make all windows draggable
  document.querySelectorAll(".window").forEach((win) => {
    makeDraggable(win);
  });

  // Gmail compose button (opens Gmail in new tab)
  const gmailBtn = document.getElementById("open-gmail");
  if (gmailBtn) {
    gmailBtn.addEventListener("click", () => {
      const url =
        "https://mail.google.com/mail/?view=cm&fs=1&to=fruitcat001@gmail.com";
      window.open(url, "_blank");
    });
  }
});