// Adds a "Signed in as <email> · Sign out" control to the mdBook top bar.
// Reads the current user from the Static Web Apps auth endpoint (/.auth/me).
// The whole site is gated to authenticated users, so a principal is expected;
// if it is missing (or the request fails), we simply render nothing.
(function () {
  fetch("/.auth/me", { credentials: "same-origin" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var principal = data && data.clientPrincipal;
      if (!principal) return;

      var container =
        document.querySelector("#menu-bar .right-buttons") ||
        document.querySelector(".right-buttons");
      if (!container) return;

      var wrap = document.createElement("div");
      wrap.className = "auth-menu";

      var user = document.createElement("span");
      user.className = "auth-user";
      user.textContent = principal.userDetails || "account";
      user.title = principal.userDetails || "";

      var signout = document.createElement("a");
      signout.className = "auth-signout";
      signout.href = "/.auth/logout?post_logout_redirect_uri=/login";
      signout.textContent = "Sign out";

      wrap.appendChild(user);
      wrap.appendChild(signout);
      container.appendChild(wrap);
    })
    .catch(function () {
      /* non-fatal: leave the top bar unchanged */
    });
})();
