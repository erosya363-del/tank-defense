"use strict";

const CACHE_NAME = "tanks-v5.0.0";
const CACHE_URLS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./css/screens.css",
  "./js/state.js",
  "./js/storage.js",
  "./js/utils.js",
  "./js/audio.js",
  "./js/router.js",
  "./js/effects.js",
  "./js/player.js",
  "./js/enemies.js",
  "./js/ui.js",
  "./js/game.js",
  "./manifest.json"
];

// Install — кэшируем все файлы
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate — удаляем старые кэши
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — сначала кэш, потом сеть (offline-first)
self.addEventListener("fetch", (event) => {
  // Пропускаем не-GET запросы
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Кэшируем новые запросы
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        });
    })
  );
});