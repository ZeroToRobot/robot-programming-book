// Adds a "[avatar] <display name>  ·  Sign out" control to the mdBook top bar.
//
// Display name + avatar come from the user's stored profile (/api/GetProfile),
// so they reflect any name the user set during onboarding. The email address is
// shown only as a hover tooltip (and alt text) on the avatar and the name.
// Falls back to the Google identity claims (/.auth/me) if the profile lookup
// is unavailable. Non-fatal: renders nothing if neither source works.
(function () {
  var LOGOUT = "/.auth/logout?post_logout_redirect_uri=/login";

  function initials(first, last, name) {
    var a = (first && first[0]) || (name && name[0]) || "?";
    var b = (last && last[0]) || "";
    return (a + b).toUpperCase();
  }

  function makeFallbackAvatar(text, email) {
    var span = document.createElement("span");
    span.className = "auth-avatar auth-avatar-fallback";
    span.textContent = text;
    if (email) span.title = email;
    return span;
  }

  function render(profile) {
    var container =
      document.querySelector("#menu-bar .right-buttons") ||
      document.querySelector(".right-buttons");
    if (!container || document.querySelector(".auth-menu")) return;

    var email = profile.email || "";
    var first = profile.firstName || "";
    var last = profile.lastName || "";
    var name = (first + " " + last).trim() || (email ? email.split("@")[0] : "Account");
    var pic = profile.pictureUrl || "";
    var init = initials(first, last, name);

    var wrap = document.createElement("div");
    wrap.className = "auth-menu";

    if (pic) {
      var img = document.createElement("img");
      img.className = "auth-avatar";
      img.src = pic;
      img.alt = email;         // shown if the image fails / for screen readers
      img.title = email;       // hover tooltip
      img.referrerPolicy = "no-referrer";
      img.onerror = function () {
        img.replaceWith(makeFallbackAvatar(init, email));
      };
      wrap.appendChild(img);
    } else {
      wrap.appendChild(makeFallbackAvatar(init, email));
    }

    var userEl = document.createElement("span");
    userEl.className = "auth-user";
    userEl.textContent = name;
    userEl.title = email;      // hover tooltip
    wrap.appendChild(userEl);

    var signout = document.createElement("a");
    signout.className = "auth-signout";
    signout.href = LOGOUT;
    signout.textContent = "Sign out";
    wrap.appendChild(signout);

    container.appendChild(wrap);
  }

  // Prefer a session-cached profile, then GetProfile, then /.auth/me claims.
  var cached = null;
  try { cached = JSON.parse(sessionStorage.getItem("rpb_profile") || "null"); } catch (e) {}
  if (cached) { render(cached); return; }

  fetch("/api/GetProfile", { credentials: "same-origin" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (profile) {
      if (profile && (profile.firstName || profile.pictureUrl || profile.email)) {
        try { sessionStorage.setItem("rpb_profile", JSON.stringify(profile)); } catch (e) {}
        render(profile);
        return;
      }
      return fetch("/.auth/me", { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var p = d && d.clientPrincipal;
          if (!p) return;
          var claims = p.claims || [];
          function claim(t) {
            for (var i = 0; i < claims.length; i++) {
              if (claims[i] && (claims[i].typ || "").toLowerCase() === t) return claims[i].val;
            }
            return "";
          }
          render({
            email: claim("email") || p.userDetails || "",
            firstName: claim("given_name"),
            lastName: claim("family_name"),
            pictureUrl: claim("picture"),
          });
        });
    })
    .catch(function () { /* non-fatal */ });
})();
