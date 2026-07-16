(() => {
  const USER_KEY = "athletixUser";
  const SESSION_KEY = "athletixSupabaseSession";
  const ADMIN_HOME = "admin.html";
  const HOME = "index.html";
  const LOGIN = "admin-login.html";

  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    return Boolean(getUser());
  }

  function isAdmin() {
    return getUser()?.role === "admin";
  }

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getAccessToken() {
    return getSession()?.access_token || "";
  }

  function clearAuth() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  function initials(user) {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function requireAdmin() {
    if (!isAuthenticated()) {
      const next = encodeURIComponent(window.location.pathname.split("/").pop() || ADMIN_HOME);
      clearAuth();
      window.location.replace(`${LOGIN}?next=${next}`);
      return false;
    }

    if (!isAdmin()) {
      clearAuth();
      window.location.replace(HOME);
      return false;
    }
    document.documentElement.classList.add("admin-authorized");
    return true;
  }

  function mountProfileMenu() {
    const mount = document.querySelector("[data-auth-profile]");
    if (!mount) return;

    const user = getUser();
    if (!user) {
      mount.hidden = false;
      mount.innerHTML = `
        <button class="profile-trigger guest-profile" type="button" aria-label="Connexion au compte">
          <span class="profile-avatar">U</span>
          <span class="profile-label">Compte</span>
        </button>
      `;
      const trigger = mount.querySelector(".profile-trigger");
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        window.location.href = LOGIN;
      });
      return;
    }

    const adminItem = isAdmin()
      ? '<a href="admin.html">Administration</a>'
      : "";

    mount.hidden = false;
    mount.innerHTML = `
      <button class="profile-trigger account-profile" type="button" aria-haspopup="true" aria-expanded="false">
        <span class="profile-avatar">${initials(user)}</span>
        <span class="profile-label">Compte</span>
      </button>
      <div class="profile-menu" hidden>
        <strong>${user.name || "Mon compte"}</strong>
        <a href="#">Mon compte</a>
        <a href="#">Parametres</a>
        ${adminItem}
      </div>
    `;

    const trigger = mount.querySelector(".profile-trigger");
    const menu = mount.querySelector(".profile-menu");

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  window.AthletixAuth = {
    getUser,
    getSession,
    getAccessToken,
    isAuthenticated,
    isAdmin,
    requireAdmin,
    mountProfileMenu,
    clearAuth
  };
})();
