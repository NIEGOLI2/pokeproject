/*
  app.js
  - Handles the search button and the game card click to load the embedded EmulatorJS loader
  - Adds UI state preservation so search bar hides and logo shrinks when a game opens,
    and restores the original menu when returning (no full page reload).
*/

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const searchBtn = document.getElementById("searchBtn");
  const gameBtn = document.getElementById("gameBtn");
  const launchSection = document.getElementById("launch");
  const mainApp = document.getElementById("app");
  const titleLogo = document.getElementById("title-logo");
  const controlsSection = document.querySelector(".controls");

  // Preserve original launch HTML so we can restore later without reloading
  const originalLaunchHTML = launchSection.innerHTML;
  // Preserve original logo inline styles (if any)
  const originalLogoStyle = titleLogo ? titleLogo.getAttribute("style") || "" : "";

  // Default to dark mode (no toggle).
  document.body.classList.add("dark-mode");

  // Simple search behaviour: filters by title text and focuses button (UX convenience)
  searchBtn.addEventListener("click", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) {
      // if empty, just highlight the game button
      gameBtn.focus();
      return;
    }
    // If the query matches "rojo" or "pokemon" or "buscar", focus the game button
    if (gameBtn.innerText.toLowerCase().includes(q) || q.includes("rojo") || q.includes("pokemon") || q.includes("buscar")) {
      gameBtn.focus();
    } else {
      // simple feedback: change placeholder briefly
      const ph = searchInput.placeholder;
      searchInput.placeholder = 'No encontrado';
      setTimeout(() => (searchInput.placeholder = ph), 1000);
    }
  });

  // When any game card is clicked, replace the card with the emulator and start loader
  const gameCards = document.querySelectorAll(".game-card.game-card--rom");
  gameCards.forEach(card => {
    card.addEventListener("click", () => openEmulator(card));
    card.addEventListener("keypress", (ev) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        openEmulator(card);
      }
    });
  });

  // Helper to hide controls and shrink logo
  function enterGameUIState() {
    if (controlsSection) controlsSection.style.display = "none";
    if (titleLogo) {
      titleLogo.style.transition = "width 200ms ease, opacity 200ms ease";
      titleLogo.style.width = "160px";
      titleLogo.style.opacity = "0.9";
      titleLogo.style.marginBottom = "6px";
    }
  }

  // Helper to restore menu UI state
  function restoreMenuUIState() {
    // restore launch HTML
    launchSection.innerHTML = originalLaunchHTML;
    // restore logo style
    if (titleLogo) {
      if (originalLogoStyle) {
        titleLogo.setAttribute("style", originalLogoStyle);
      } else {
        titleLogo.removeAttribute("style");
      }
    }

    // rewire event listeners again on restored elements
    // (re-query elements and rebind click)
    const newGameBtn = document.getElementById("gameBtn");
    if (newGameBtn) {
      newGameBtn.addEventListener("click", openEmulator);
      newGameBtn.addEventListener("keypress", (ev) => {
        if (ev.key === " " || ev.key === "Enter") {
          ev.preventDefault();
          openEmulator();
        }
      });
    }

    // show controls again
    if (controlsSection) {
      controlsSection.style.display = "";
    }
  }

  function openEmulator(cardElement) {
    // Prevent multiple clicks
    if (document.getElementById("game")) return;
    if (!cardElement) cardElement = document.querySelector(".game-card.game-card--rom");

    // Enter altered UI state (hide search bar, shrink logo)
    enterGameUIState();

    // Create game container expected by loader.js
    const gameContainerWrapper = document.createElement("div");
    gameContainerWrapper.id = "game-wrapper";
    gameContainerWrapper.style.width = "100%";
    gameContainerWrapper.style.height = "520px";
    gameContainerWrapper.style.marginTop = "12px";
    gameContainerWrapper.style.borderRadius = "12px";
    gameContainerWrapper.style.overflow = "hidden";
    gameContainerWrapper.style.background = "#000";
    gameContainerWrapper.style.position = "relative";

    // Create in-game menu bar (top) and game container; place menu inside game DIV so it overlays the emulation area
    const menuBar = document.createElement("div");
    menuBar.id = "game-menu-bar";
    menuBar.style.position = "absolute";
    menuBar.style.top = "8px";
    menuBar.style.right = "12px";
    menuBar.style.zIndex = "9999";
    menuBar.style.display = "flex";
    menuBar.style.gap = "8px";
    menuBar.style.alignItems = "center";
    menuBar.style.pointerEvents = "auto"; // ensure buttons are clickable

    const backBtn = document.createElement("button");
    backBtn.id = "game-back-btn";
    backBtn.className = "btn";
    backBtn.textContent = "VOLVER (SALIR)";
    backBtn.style.minWidth = "150px";
    backBtn.style.background = "#c0392b"; // red-ish for warning
    backBtn.style.color = "#fff";

    const fullBtn = document.createElement("button");
    fullBtn.id = "game-full-btn";
    fullBtn.className = "btn";
    fullBtn.textContent = "PANTALLA COMPLETA";
    fullBtn.style.background = "rgba(255,255,255,0.06)";
    fullBtn.style.color = "white";

    menuBar.appendChild(backBtn);
    menuBar.appendChild(fullBtn);

    const gameDiv = document.createElement("div");
    gameDiv.id = "game";
    gameDiv.style.width = "100%";
    gameDiv.style.height = "100%";
    gameDiv.style.position = "relative"; // ensure absolutely positioned menu is contained inside

    // Append the game DIV first, then put the menu inside it so the buttons overlay the emulation canvas
    gameContainerWrapper.appendChild(gameDiv);
    gameDiv.appendChild(menuBar);

    // Replace launch area with emulator container
    launchSection.innerHTML = "";
    launchSection.appendChild(gameContainerWrapper);

    // Configure EmulatorJS globals expected by data/loader.js using the clicked card's data attributes
    const romPath = cardElement.dataset.rom || "/[Poke-Nexus] Pokemon - Edicion Rojo Fuego (Esp).gba";
    const gameTitle = cardElement.dataset.title || "Pokemon";
    window.EJS_player = "#game";
    window.EJS_gameUrl = romPath;
    window.EJS_gameName = gameTitle;
    window.EJS_core = "gba";
    // point loader at the EmulatorJS data directory that's present in the repo
    window.EJS_pathtodata = "jjjjj/EmulatorJS-main/data/";
    window.EJS_startOnLoaded = true;
    // disable DB to avoid IndexedDB prompts during testing
    window.EJS_disableDatabases = true;
    window.EJS_disableLocalStorage = true;

    // Load loader.js from the data folder
    const script = document.createElement("script");
    script.src = window.EJS_pathtodata + "loader.js";
    script.async = true;
    script.onerror = (e) => {
      const err = document.createElement("div");
      err.style.color = "white";
      err.style.padding = "10px";
      err.textContent = "No se pudo cargar el emulador (loader.js). Revisa la ruta o abre la consola.";
      gameDiv.appendChild(err);
      console.error("Failed to load loader.js from", script.src, e);
    };
    document.body.appendChild(script);

    // Back button behavior: warn user that unsaved progress will be lost, then return to menu (no reload)
    backBtn.addEventListener("click", () => {
      const confirmText = "Advertencia: si sales ahora NO se guardará el progreso. ¿Deseas salir sin guardar? (Antes guarda)";
      if (confirm(confirmText)) {
        // Attempt graceful shutdown: remove emulator elements and restore menu UI
        // Note: loader/emulator may have started workers; a full cleanup depends on emulator implementation.
        // Remove loader script if present (best-effort)
        try {
          // Try call any global EJS_emulator exit if exists
          if (window.EJS_emulator && typeof window.EJS_emulator.exit === "function") {
            try { window.EJS_emulator.exit(); } catch (e) { console.warn("EJS_emulator.exit failed", e); }
          }
        } catch (e) {
          console.warn("Error during emulator shutdown", e);
        }
        // Remove loader.js script tags that were appended from this run
        const scripts = document.querySelectorAll(`script[src^="${window.EJS_pathtodata}loader.js"], script[src^="${window.EJS_pathtodata}src/loader.js"]`);
        scripts.forEach(s => s.parentNode && s.parentNode.removeChild(s));

        // Restore menu UI and original launch area
        restoreMenuUIState();
      }
    });

    // Fullscreen toggle for the game wrapper
    fullBtn.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) {
          await gameContainerWrapper.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.warn("Fullscreen failed:", e);
      }
    });
  }

  // No dark-mode toggle: dark mode is always active by default.

});