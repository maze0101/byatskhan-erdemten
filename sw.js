const CACHE_NAME = "byatskhan-erdemten-v31";
const SHELL_ASSETS = [
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "Tsagaan_khurgyn_tuuhuud_13_nom.html",
];
const AUDIO_ASSETS = [
  "Baby Sleep MusicBaby Sleep Instantly in 3 MinutesCalm Night &Beat InsomniaMozart & Brahms Lullaby.mp3",
  "Бүүвэйн дуу(buuvein duu).mp3",
  "Narandulam feat Munkh-Erdene,  Shinetsog Geni  - Buu Ai - Sureg ost ( lyric video ).mp3",
  "Relaxing Music Relieves stress, Anxiety and Depression 🌿Heals the Mind - Deep Sleep.mp3",
].map(encodeURI);
// The page can't start without React/Babel, so keep them available offline.
const CDN_ASSETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js",
];
// Versioned third-party files (scripts, fonts) that are safe to serve cache-first.
const CDN_HOSTS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_ASSETS).then(() =>
        // Cache CDN scripts and audio one-by-one so a single failed fetch doesn't block install.
        Promise.all([...CDN_ASSETS, ...AUDIO_ASSETS].map((url) => cache.add(url).catch(() => {})))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            // Opaque (no-cors) responses report status 0 but are still usable.
            if (response && (response.ok || response.type === "opaque")) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
      )
    );
    return;
  }
  // Let the browser handle cross-origin requests directly instead of
  // proxying them through the service worker. Proxying turns them into
  // opaque responses, and opaque responses break Range-request
  // streaming for large media — which is exactly how the GitHub
  // Release-hosted lullaby track gets played/seeked.
  if (url.origin !== self.location.origin) return;
  const isShell = event.request.mode === "navigate" || /\.(html|json|js)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (isShell) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
