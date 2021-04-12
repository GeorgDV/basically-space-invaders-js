const cacheName = 'temp';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.webmanifest',
        './main.js',
        './templates.json',
        './style.scss',
        './FFFFORWA.TTF',
        './favicon.ico',
        './github_logo_light.png',
        './player_icon.webp',
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open(cacheName)
      .then(cache => cache.match(event.request, { ignoreSearch: true }))
      .then(response => {
        return response || fetch(event.request);
      })
  );
});