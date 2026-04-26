(function () {
  var resetButton = document.querySelector("[data-reset-pwa-cache]");
  var homeNav = document.querySelector("[data-home-nav]");
  var homeUrl = homeNav ? homeNav.getAttribute("data-home-url") : null;

  if (homeNav) {
    homeNav.addEventListener("click", function () {
      window.location.assign(homeUrl || "/");
    });
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      resetButton.disabled = true;
      resetButton.textContent = "Limpiando...";

      Promise.resolve()
        .then(function () {
          if ("caches" in window) {
            return caches.keys().then(function (keys) {
              return Promise.all(keys.map(function (key) {
                return caches.delete(key);
              }));
            });
          }
        })
        .then(function () {
          return navigator.serviceWorker.getRegistrations().then(function (registrations) {
            return Promise.all(
              registrations.map(function (registration) {
                return registration.unregister();
              })
            );
          });
        })
        .then(function () {
          window.location.reload();
        })
        .catch(function () {
          resetButton.disabled = false;
          resetButton.textContent = "Resetear cache PWA";
        });
    });
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/service-worker.js").catch(function () {
      // PWA support is progressive; the app remains usable without SW.
    });
  });
})();
