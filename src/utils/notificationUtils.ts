export const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return false;
    }
    
    if (Notification.permission === "granted") {
        return true;
    }
    
    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }
    
    return false;
};

export const sendNotification = (title: string, body: string) => {
    if (Notification.permission === "granted") {
        // Check if service worker is ready for mobile support (if installed)
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    vibrate: [200, 100, 200]
                });
            });
        } else {
            // Fallback for desktop/non-PWA context
            new Notification(title, {
                body,
                icon: '/pwa-192x192.png',
            });
        }
    }
};
