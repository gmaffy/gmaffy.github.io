const catchName = "converter_catch_v3";
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(catchName).then(function (cache) {
            return cache.addAll([
                '/',
                'js/main.js',
                'js/idb.js'
                'css/style.css',
            
            ]);
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('curr_') &&
                        !allCaches.includes(cacheName);
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
