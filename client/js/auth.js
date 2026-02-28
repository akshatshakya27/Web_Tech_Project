/*
 * EcoTrack Authentication Logic
 * - Handles login/register form switching and submission.
 * - Performs client-side validation and API calls for auth endpoints.
 */

(function authModule() {
  const DEMO_USERS_KEY = "ecotrack_demo_users";
  const ENABLE_DEMO_AUTH_FALLBACK = true;

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const showRegisterBtn = document.getElementById("showRegisterBtn");
  const toRegisterInline = document.getElementById("toRegisterInline");
  const toLoginInline = document.getElementById("toLoginInline");
  const authError = document.getElementById("authError");
  const darkModeToggle = document.getElementById("darkModeToggle");

  if (!loginForm || !registerForm) {
    return;
  }

  EcoAPI.applySavedTheme();

  if (darkModeToggle) {
    darkModeToggle.textContent = document.body.classList.contains("dark") ? "☀️ Light Mode" : "🌙 Dark Mode";
    darkModeToggle.addEventListener("click", () => {
      const isDark = EcoAPI.toggleTheme();
      darkModeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    });
  }

  if (EcoAPI.getToken()) {
    window.location.href = "dashboard.html";
    return;
  }

  /** Displays a single auth error message area. */
  function setError(message = "") {
    authError.textContent = message;
  }

  /** Validates email format with a basic safe regex pattern. */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  }

  /** Checks password strength requirements. */
  function validatePassword(password) {
    if (!password || password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    return "";
  }

  /** Ensures a default demo account exists for backend-free testing. */
  function ensureDefaultDemoUser() {
    const users = getDemoUsers();
    const hasDefault = users.some((user) => user.email.toLowerCase() === "demo@ecotrack.com");

    if (!hasDefault) {
      users.push({
        name: "Demo User",
        email: "demo@ecotrack.com",
        password: "password123"
      });
      saveDemoUsers(users);
    }
  }

  /** Loads demo users from localStorage for offline auth fallback. */
  function getDemoUsers() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  /** Persists demo users to localStorage. */
  function saveDemoUsers(users) {
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  }

  /** Creates a lightweight JWT-like token for frontend decoding. */
  function createDemoToken(user) {
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      name: user.name,
      email: user.email,
      sub: user.email,
      iat: Math.floor(Date.now() / 1000)
    }));

    return `${header}.${payload}.demo-signature`;
  }

  /** Registers user in local demo store if backend is unavailable. */
  function registerUserInDemoStore({ name, email, password }) {
    const users = getDemoUsers();
    const exists = users.some((user) => user.email.toLowerCase() === email.toLowerCase());

    if (exists) {
      return { ok: false, message: "Email already exists in demo mode." };
    }

    users.push({ name, email, password });
    saveDemoUsers(users);
    return { ok: true };
  }

  /** Attempts login against local demo store when API is unavailable. */
  function loginWithDemoStore({ email, password }) {
    const users = getDemoUsers();
    const matched = users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password);

    if (!matched) {
      return { ok: false, message: "Invalid demo credentials." };
    }

    return {
      ok: true,
      token: createDemoToken(matched)
    };
  }

  /** Switches visible form between login and register. */
  function toggleForms(showRegister) {
    registerForm.classList.toggle("hidden", !showRegister);
    loginForm.classList.toggle("hidden", showRegister);
    showRegisterBtn.classList.toggle("active", showRegister);
    showLoginBtn.classList.toggle("active", !showRegister);
    setError("");
  }

  /** Handles register submission and basic validations. */
  async function registerUser(event) {
    event.preventDefault();
    setError("");

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    EcoAPI.setLoading(true);

    try {
      const response = await EcoAPI.authorizedFetch("/api/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (ENABLE_DEMO_AUTH_FALLBACK && [404, 405, 500, 502, 503].includes(response.status)) {
          const demoRegisterResult = registerUserInDemoStore({ name, email, password });
          if (!demoRegisterResult.ok) {
            setError(demoRegisterResult.message);
            return;
          }

          EcoAPI.showToast("Registered in demo mode. Please login.", "success");
          registerForm.reset();
          toggleForms(false);
          return;
        }

        setError(data.message || "Registration failed.");
        return;
      }

      EcoAPI.showToast("Registration successful. Please login.", "success");
      registerForm.reset();
      toggleForms(false);
    } catch (error) {
      if (ENABLE_DEMO_AUTH_FALLBACK) {
        const demoRegisterResult = registerUserInDemoStore({ name, email, password });
        if (!demoRegisterResult.ok) {
          setError(demoRegisterResult.message);
          return;
        }

        EcoAPI.showToast("Registered in demo mode. Please login.", "success");
        registerForm.reset();
        toggleForms(false);
        return;
      }

      setError("Unable to connect. Please try again.");
    } finally {
      EcoAPI.setLoading(false);
    }
  }

  /** Handles login submission and token storage. */
  async function loginUser(event) {
    event.preventDefault();
    setError("");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    EcoAPI.setLoading(true);

    try {
      const response = await EcoAPI.authorizedFetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token) {
        if (ENABLE_DEMO_AUTH_FALLBACK && [404, 405, 500, 502, 503].includes(response.status)) {
          const demoLoginResult = loginWithDemoStore({ email, password });
          if (!demoLoginResult.ok) {
            setError(`${demoLoginResult.message} Try demo@ecotrack.com / password123`);
            return;
          }

          EcoAPI.setToken(demoLoginResult.token);
          EcoAPI.showToast("Logged in using demo mode.", "success");
          window.location.href = "dashboard.html";
          return;
        }

        setError(data.message || "Invalid email or password.");
        return;
      }

      EcoAPI.setToken(data.token);
      EcoAPI.showToast("Login successful.", "success");
      window.location.href = "dashboard.html";
    } catch (error) {
      if (ENABLE_DEMO_AUTH_FALLBACK) {
        const demoLoginResult = loginWithDemoStore({ email, password });
        if (!demoLoginResult.ok) {
          setError(`${demoLoginResult.message} Try demo@ecotrack.com / password123`);
          return;
        }

        EcoAPI.setToken(demoLoginResult.token);
        EcoAPI.showToast("Logged in using demo mode.", "success");
        window.location.href = "dashboard.html";
        return;
      }

      setError("Unable to connect. Please try again.");
    } finally {
      EcoAPI.setLoading(false);
    }
  }

  showLoginBtn.addEventListener("click", () => toggleForms(false));
  showRegisterBtn.addEventListener("click", () => toggleForms(true));
  toRegisterInline.addEventListener("click", () => toggleForms(true));
  toLoginInline.addEventListener("click", () => toggleForms(false));

  ensureDefaultDemoUser();

  registerForm.addEventListener("submit", registerUser);
  loginForm.addEventListener("submit", loginUser);
})();
