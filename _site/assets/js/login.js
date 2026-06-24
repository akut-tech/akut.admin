/* Login page controller. */
(function () {
  "use strict";

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
    button.textContent = loading ? t("login.submitting") : t("login.submit");
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
      showError(t("login.errorEmpty"));
      return;
    }

    setLoading(true);
    AkutAuth.login(username, password)
      .then(function () {
        window.location.href = nextUrl();
      })
      .catch(function (err) {
        showError(err.message || t("login.errorFailed"));
        setLoading(false);
      });
  });
})();
