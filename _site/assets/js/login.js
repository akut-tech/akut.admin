/* Login page controller. */
(function () {
  "use strict";

  // If a valid session already exists, skip the form.
  AkutAuth.redirectIfAuthed();

  var form = document.getElementById("loginForm");
  var button = document.getElementById("loginButton");
  var errorBox = document.getElementById("loginError");

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function setLoading(loading) {
    button.disabled = loading;
    button.textContent = loading ? "Signing in…" : "Sign in";
  }

  function nextUrl() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get("next");
    var base = (window.AKUT_CONFIG && window.AKUT_CONFIG.baseUrl) || "";
    return next || (base + "/");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();

    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;
    if (!username || !password) {
      showError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    AkutAuth.login(username, password)
      .then(function () {
        window.location.href = nextUrl();
      })
      .catch(function (err) {
        showError(err.message || "Sign-in failed. Please try again.");
        setLoading(false);
      });
  });
})();
