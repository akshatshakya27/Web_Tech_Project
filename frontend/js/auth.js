(function authModule() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const showRegisterBtn = document.getElementById("showRegisterBtn");
  const toRegisterInline = document.getElementById("toRegisterInline");
  const toLoginInline = document.getElementById("toLoginInline");
  const authError = document.getElementById("authError");

  if (!loginForm || !registerForm) {
    return;
  }

  if (EcoAPI.getToken()) {
    window.location.href = "dashboard.html";
    return;
  }

  function setError(message = "") {
    authError.textContent = message;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  }

  function validatePassword(password) {
    if (!password || password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    return "";
  }

  function setPasswordVisibility(button, input, isVisible) {
    input.type = isVisible ? "text" : "password";
    button.textContent = isVisible ? "🙈" : "👁";
    button.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
    button.setAttribute("aria-pressed", String(isVisible));
  }

  function wirePasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach((button) => {
      const targetId = button.getAttribute("data-target");
      const input = document.getElementById(targetId);

      if (!input) {
        return;
      }

      setPasswordVisibility(button, input, false);

      button.addEventListener("click", () => {
        const nextVisible = input.type === "password";
        setPasswordVisibility(button, input, nextVisible);
      });
    });
  }

  function toggleForms(showRegister) {
    registerForm.classList.toggle("hidden", !showRegister);
    loginForm.classList.toggle("hidden", showRegister);
    showRegisterBtn.classList.toggle("active", showRegister);
    showLoginBtn.classList.toggle("active", !showRegister);
    setError("");
  }

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
      const response = await EcoAPI.authorizedFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      EcoAPI.showToast("Registration successful. Please login.", "success");
      registerForm.reset();
      toggleForms(false);
    } catch (error) {
      setError("Unable to connect. Please try again.");
    } finally {
      EcoAPI.setLoading(false);
    }
  }

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
      const response = await EcoAPI.authorizedFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      EcoAPI.setToken(data.token);
      if (data.user) {
        localStorage.setItem("ecotrack_user", JSON.stringify(data.user));
      }
      EcoAPI.showToast("Login successful.", "success");
      window.location.href = "dashboard.html";
    } catch (error) {
      setError("Unable to connect. Please try again.");
    } finally {
      EcoAPI.setLoading(false);
    }
  }

  showLoginBtn.addEventListener("click", () => toggleForms(false));
  showRegisterBtn.addEventListener("click", () => toggleForms(true));
  toRegisterInline.addEventListener("click", () => toggleForms(true));
  toLoginInline.addEventListener("click", () => toggleForms(false));

  registerForm.addEventListener("submit", registerUser);
  loginForm.addEventListener("submit", loginUser);

  wirePasswordToggles();
})();
