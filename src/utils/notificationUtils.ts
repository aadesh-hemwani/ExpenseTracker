export const requestNotificationPermission = async () => {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return false;
    }
    
    // Check if we can access Notification global safely
    try {
        if (Notification.permission === "granted") {
           return true;
        }

        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
    } catch (e) {
        console.error("Error requesting notification permission:", e);
        return false;
    }
    
    return false;
};

export const sendNotification = (title: string, body: string) => {
    // Safety check again
    if (!("Notification" in window)) return;

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
            }).catch(e => console.error("SW Notification failed", e));
        } else {
            // Fallback for desktop/non-PWA context
            try {
                new Notification(title, {
                    body,
                    icon: '/pwa-192x192.png',
                });
            } catch (e) {
                console.error("Notification creation failed", e);
            }
        }
    }
};
