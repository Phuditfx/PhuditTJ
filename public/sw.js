self.addEventListener('push', function(event) {
    if (event.data) {
        const payload = event.data.json();
        const title = payload.title || 'New Notification';
        const options = {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192x192.png',
            data: payload
        };
        
        // Update App Badge if supported
        if (navigator.setAppBadge && payload.badgeCount) {
            navigator.setAppBadge(payload.badgeCount).catch(console.error);
        }

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    // Open the app when notification is clicked
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
