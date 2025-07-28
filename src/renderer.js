const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const screens = {
    license: document.getElementById('licenseScreen'),
    folder: document.getElementById('folderScreen'),
    install: document.getElementById('installScreen'),
    finish: document.getElementById('finishScreen'),
  };

  const aiBubble = document.getElementById("aiBubble");

  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.remove('active'));
    screens[name].classList.add('active');

    // Annoying Intelligence comment
    if (aiBubble) {
      const lines = aiSnarks[name];
      const pick = lines[Math.floor(Math.random() * lines.length)];
      aiBubble.textContent = pick;
    }
  }

  const agreeBox = document.getElementById('agreeBox');
  const agreeBtn = document.getElementById('agreeBtn');
  const browseBtn = document.getElementById('browseBtn');
  const installBtn = document.getElementById('installBtn');
  const installPathInput = document.getElementById('installPathInput');
  const installStatus = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');
  const addPathBtn = document.getElementById('addPathBtn');
  const addPathBox = document.getElementById('addPathBox');
  const pathStatus = document.getElementById('pathStatus');
  const finishBtn = document.getElementById('finishBtn');

  let selectedInstallPath = null;

  // Screen 1: License
  agreeBox.addEventListener('change', () => {
    agreeBtn.disabled = !agreeBox.checked;
  });

  agreeBtn.addEventListener('click', () => {
    showScreen('folder');
  });

  // Screen 2: Folder selection
  browseBtn.addEventListener('click', async () => {
    const path = await ipcRenderer.invoke('select-install-path');
    if (path) {
      selectedInstallPath = path;
      installPathInput.value = path;
      installBtn.disabled = false;
    }
  });

  installBtn.addEventListener('click', () => {
    if (!selectedInstallPath) return;

    showScreen('install');
    installStatus.textContent = 'Starting installation...';
    ipcRenderer.invoke('install-wpp', selectedInstallPath);
  });

  // Screen 3: Install progress
  ipcRenderer.on('progress-update', (event, percent) => {
    progressBar.style.width = `${percent}%`;
    installStatus.textContent = `Installing... ${percent}%`;
  });

  ipcRenderer.on('install-complete', (event, result) => {
    if (result.success) {
      showScreen('finish');
    } else {
      installStatus.textContent = `❌ Error: ${result.error}`;
    }
  });

  // Screen 4: Finish
  addPathBtn.addEventListener('click', async () => {
    if (!addPathBox.checked || !selectedInstallPath) {
      pathStatus.textContent = "Skipped adding to PATH.";
      return;
    }

    const result = await ipcRenderer.invoke('add-to-path', selectedInstallPath);
    if (result.success) {
      pathStatus.textContent = "✅ W++ added to PATH!";
    } else {
      pathStatus.textContent = `⚠️ Failed: ${result.error}`;
    }
  });

  finishBtn.addEventListener('click', () => {
    window.close();
  });

  // Annoying Intelligence Snarks
  const aiSnarks = {
    license: [
      "📜 Reading licenses? What a rebel.",
      "This license gives you rights... and responsibilities. Ew.",
      "MIT? Not the school. The license. Disappointed?",
    ],
    folder: [
      "🏗️ Ah, the sacred ritual of folder picking.",
      "Choose wisely. Or don't. I'm just a bubble.",
      "Put it on your desktop. Live dangerously.",
    ],
    install: [
      "Installing... probably.",
      "Did you just blink? You missed 5% progress.",
      "This progress bar is more honest than most politicians.",
    ],
    finish: [
      "You did it. You clicked buttons like a pro.",
      "Installed. Time to make something better than Visual Basic.",
      "You're done! Go touch grass. Or code.",
    ]
  };

  // Initial line on first screen
  if (aiBubble) {
    aiBubble.textContent = aiSnarks.license[0];
  }
});
