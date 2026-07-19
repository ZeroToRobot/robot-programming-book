// Enforces profile completion before reading the book.
//
// The whole site is already gated to signed-in users. This adds a second gate:
// if the signed-in user has not completed their onboarding profile, send them
// to /welcome. Checked once per browser session (cached in sessionStorage) to
// avoid an API call on every page. Fails open on network/API errors so a
// transient issue never locks a reader out of already-authenticated content.
(function () {
  try {
    if (sessionStorage.getItem("rpb_profile_ok") === "1") return;
  } catch (e) {
    /* sessionStorage unavailable - just check every load */
  }

  fetch("/api/GetProfile", { credentials: "same-origin" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (p) {
      if (!p) return; // API error -> don't block
      if (p.profileComplete === true) {
        try { sessionStorage.setItem("rpb_profile_ok", "1"); } catch (e) {}
      } else {
        window.location.replace("/welcome");
      }
    })
    .catch(function () {
      /* network error -> don't block reading */
    });
})();
