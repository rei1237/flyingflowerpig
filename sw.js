/**
 * 🐷 꽃돼지 PWA Service Worker
 * 캐싱 및 오프라인 지원
 */

const CACHE_NAME = 'flying-flower-pig-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pig-main.png',
  '/pig-wink.png',
  '/pig-crash.png',
  '/pig-falling.png',
  '/sky-day-ko.jpg',
  '/sky-sunset-ko.jpg',
  '/sky-night-ko.jpg',
  '/sky-space-ko.jpg',
  '/title-logo.webp',
  '/freepik-growth-groove.mp3'
];

// ── 설치: 정적 자산 캐싱 ──
self.addEventListener('install', (event) => {
  console.log('[SW] 설치 중...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 정적 자산 캐싱');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] 설치 완료');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] 캐싱 실패:', err);
      })
  );
});

// ── 활성화: 이전 캐시 정리 ──
self.addEventListener('activate', (event) => {
  console.log('[SW] 활성화 중...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[SW] 이전 캐시 삭제:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] 활성화 완료');
        return self.clients.claim();
      })
  );
});

// ── fetch: 캐시 우선 전략 ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Same-origin 요청만 캐싱
  if (url.origin !== self.location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // 캐시에 있으면 반환
        if (cachedResponse) {
          // 백그라운드에서 캐시 업데이트
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse.clone());
                });
              }
            })
            .catch(() => {
              // 네트워크 오류 무시 (캐시된 버전 사용)
            });
          
          return cachedResponse;
        }
        
        // 캐시에 없으면 네트워크 요청
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // 성공 응답을 캐시에 저장
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch 실패:', error);
            // 오프라인 fallback (필요시)
            throw error;
          });
      })
  );
});

// ── 푸시 알림 (향후 확장용) ──
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '🐷 연이가 기다리고 있어요!',
      icon: '/pig-main.png',
      badge: '/pig-main.png',
      tag: data.tag || 'flower-pig',
      requireInteraction: false,
      vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '날아라 꽃돼지', options)
    );
  }
});

// ── 알림 클릭 ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
