/*
 * 患者案内システム Service Worker
 *
 * 役割：アプリのファイルを端末に保存し、院内ネットワークが切れても起動できるようにする。
 *
 * 【重要】index.html などを修正してGitHubに再アップしたら、
 * 必ず下の CACHE_VERSION の数字を1つ増やしてください。
 * これを忘れると、端末が古いキャッシュを表示し続けて修正が反映されません。
 */
const CACHE_VERSION = 'v2';
const CACHE_NAME = `patient-guidance-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// インストール時：全ファイルを先読みして保存する
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 有効化時：古いバージョンのキャッシュを削除する
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('patient-guidance-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// 取得時：キャッシュ優先。無ければネットワークから取り、次回のために保存する
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // GET以外や他サイトへの通信は素通しする
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // オフラインで未保存のページを開こうとした場合はトップ画面を返す
          if (request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
    })
  );
});
