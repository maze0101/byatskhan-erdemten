const CACHE_NAME = "byatskhan-erdemten-v23";
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
].map(encodeURI);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_ASSETS).then(() =>
        // Cache audio one-by-one so a single failed fetch doesn't block install.
        Promise.all(AUDIO_ASSETS.map((url) => cache.add(url).catch(() => {})))
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
