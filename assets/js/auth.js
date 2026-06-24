/* Authentication against Amazon Cognito (USER_PASSWORD_AUTH) and session
 * handling for the Akut Admin console.
 *
 * The lambda.akut API sits behind an HTTP API JWT authorizer that reads
 * identity claims (given_name, family_name, email, custom:tenant,
 * cognito:groups). Those live in the *ID token*, so that is the token we
 * send as `Authorization: Bearer` and the one we decode for the UI. */
(function () {
  "use strict";

  var STORAGE_KEY = "akut.admin.session";

  function cfg() {
    return window.AKUT_CONFIG || {};
  }

  function loginUrl() {
    var base = (cfg().baseUrl || "");
    return base + "/login/";
  }

  function homeUrl() {
    var base = (cfg().baseUrl || "");
    return base + "/";
  }

  // ---- Session storage ----------------------------------------------------

  function saveSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ---- JWT helpers --------------------------------------------------------

  function decodeJwt(token) {
    if (!token) return null;
    try {
      var payload = token.split(".")[1];
      payload = payload.replace(/-/g, "+").replace(/_/g, "/");
      var pad = payload.length % 4;
      if (pad) payload += "=".repeat(4 - pad);
      return JSON.parse(decodeURIComponent(escape(atob(payload))));
    } catch (e) {
      return null;
    }
  }

  function isExpired(token) {
    var claims = decodeJwt(token);
    if (!claims || !claims.exp) return true;
    // 30s clock-skew safety margin.
    return Date.now() / 1000 >= claims.exp - 30;
  }

  function claims() {
    var s = getSession();
    return s ? decodeJwt(s.idToken) : null;
  }

  // cognito:groups is an array in the raw token. Returns lowercased names.
  function groups() {
    var c = claims();
    if (!c) return [];
    var g = c["cognito:groups"] || [];
    if (typeof g === "string") g = [g];
    return g.map(function (x) { return String(x).toLowerCase(); });
  }

  function isAdmin() {
    return groups().indexOf("admin") !== -1;
  }

  // custom:subtenants is a comma-separated string in the raw token, e.g.
  // "akut,test". Returns the trimmed, de-duplicated list of sub-tenants the
  // signed-in user is allowed to target.
  function subTenants() {
    var c = claims();
    if (!c || !c["custom:subtenants"]) return [];
    var seen = {};
    return String(c["custom:subtenants"]).split(",")
      .map(function (s) { return s.trim(); })
      .filter(function (s) {
        if (!s || seen[s]) return false;
        seen[s] = true;
        return true;
      });
  }

  function isAuthenticated() {
    var s = getSession();
    return !!(s && s.idToken && !isExpired(s.idToken));
  }

  // ---- Cognito token refresh ----------------------------------------------

  var _refreshPromise = null;

  function refresh() {
    // Deduplicate concurrent refresh calls — only one flight at a time.
    if (_refreshPromise) return _refreshPromise;

    var s = getSession();
    if (!s || !s.refreshToken) {
      return Promise.reject(new Error("No refresh token available."));
    }

    var c = cfg();
    var endpoint = "https://cognito-idp." + c.cognito.region + ".amazonaws.com/";
    _refreshPromise = fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
      },
      body: JSON.stringify({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: c.cognito.clientId,
        AuthParameters: { REFRESH_TOKEN: s.refreshToken }
      })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var msg = (data && (data.message || data.__type)) || ("Token refresh failed (" + res.status + ")");
          throw new Error(msg);
        }
        var auth = data.AuthenticationResult;
        if (!auth || !auth.IdToken) {
          throw new Error("Cognito did not return a new ID token.");
        }
        // Cognito does not return a new RefreshToken on refresh — keep the old one.
        saveSession({
          idToken: auth.IdToken,
          accessToken: auth.AccessToken,
          refreshToken: s.refreshToken,
          expiresIn: auth.ExpiresIn,
          obtainedAt: Date.now()
        });
        return getSession();
      });
    }).finally(function () {
      _refreshPromise = null;
    });

    return _refreshPromise;
  }

  // Returns a promise that resolves to a valid idToken, refreshing if needed.
  // Rejects (and clears the session) if the refresh token is also expired.
  function getValidToken() {
    var s = getSession();
    if (!s || !s.idToken) return Promise.reject(new Error("Not signed in."));
    if (!isExpired(s.idToken)) return Promise.resolve(s.idToken);
    return refresh().then(function (newSession) {
      return newSession.idToken;
    }).catch(function (err) {
      clearSession();
      throw err;
    });
  }

  // ---- Cognito sign-in ----------------------------------------------------

  function login(username, password) {
    var c = cfg();
    var endpoint = "https://cognito-idp." + c.cognito.region + ".amazonaws.com/";
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth"
      },
      body: JSON.stringify({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: c.cognito.clientId,
        AuthParameters: { USERNAME: username, PASSWORD: password }
      })
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var msg = (data && (data.message || data.__type)) || ("Login failed (" + res.status + ")");
          throw new Error(prettyCognitoError(data && data.__type, msg));
        }
        if (data.ChallengeName) {
          throw new Error(
            "Sign-in requires an additional step (" + data.ChallengeName +
            ") that this console does not handle. Please resolve it in the Akut app first."
          );
        }
        var auth = data.AuthenticationResult;
        if (!auth || !auth.IdToken) {
          throw new Error("Cognito did not return an ID token.");
        }
        saveSession({
          idToken: auth.IdToken,
          accessToken: auth.AccessToken,
          refreshToken: auth.RefreshToken,
          expiresIn: auth.ExpiresIn,
          obtainedAt: Date.now()
        });
        return getSession();
      });
    });
  }

  function prettyCognitoError(type, fallback) {
    switch (type) {
      case "NotAuthorizedException":
        return "Incorrect username or password.";
      case "UserNotFoundException":
        return "No account found for that username.";
      case "UserNotConfirmedException":
        return "This account is not confirmed yet.";
      case "PasswordResetRequiredException":
        return "A password reset is required for this account.";
      case "TooManyRequestsException":
      case "LimitExceededException":
        return "Too many attempts. Please wait a moment and try again.";
      default:
        return fallback;
    }
  }

  function logout() {
    clearSession();
    window.location.href = loginUrl();
  }

  // ---- Page guards --------------------------------------------------------

  // Call from protected pages: bounce to /login if not authenticated.
  // A page with an expired ID token but a live refresh token is still usable —
  // the first API call will refresh transparently, so we only redirect when
  // there is no session at all.
  function requireAuth() {
    var s = getSession();
    if (!s || !s.idToken) {
      clearSession();
      var here = window.location.pathname + window.location.search;
      window.location.replace(loginUrl() + "?next=" + encodeURIComponent(here));
    }
  }

  // Call from the login page: if already signed in, skip to the app.
  function redirectIfAuthed() {
    if (isAuthenticated()) {
      var params = new URLSearchParams(window.location.search);
      var next = params.get("next");
      window.location.replace(next || homeUrl());
    }
  }

  // ---- UI helpers ---------------------------------------------------------

  function renderUserCard() {
    var c = claims();
    var nameEl = document.getElementById("navUserName");
    var metaEl = document.getElementById("navUserMeta");
    if (!c) return;
    var name = [c.given_name, c.family_name].filter(Boolean).join(" ") ||
      c["cognito:username"] || c.email || "Signed in";
    var tenant = (window.AkutApi && window.AkutApi.getSubTenant()) || c["custom:tenant"];
    var role = isAdmin() ? "Admin" : "Customer";
    var meta = [role, tenant ? ("· " + tenant) : ""].filter(Boolean).join(" ");
    if (nameEl) nameEl.textContent = name;
    if (metaEl) metaEl.textContent = meta;
  }

  window.AkutAuth = {
    login: login,
    logout: logout,
    refresh: refresh,
    getValidToken: getValidToken,
    getSession: getSession,
    claims: claims,
    groups: groups,
    isAdmin: isAdmin,
    subTenants: subTenants,
    isAuthenticated: isAuthenticated,
    requireAuth: requireAuth,
    redirectIfAuthed: redirectIfAuthed,
    renderUserCard: renderUserCard,
    decodeJwt: decodeJwt
  };
})();
