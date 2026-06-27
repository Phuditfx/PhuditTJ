const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
const bellIcon = document.getElementById('bellIcon');
const simulatePostBtn = document.getElementById('simulatePostBtn');
const feedList = document.getElementById('feedList');
const navBadge = document.getElementById('navBadge');

let isSubscribed = false;

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('Service Worker Registered');
        
        // Check initial subscription state
        reg.pushManager.getSubscription().then(sub => {
            if (sub) {
                isSubscribed = true;
                bellIcon.setAttribute('data-lucide', 'bell-ring');
                enableNotificationsBtn.classList.add('active');
                lucide.createIcons();
            }
        });
    }).catch(err => console.error("Service worker registration failed:", err));
}

// Convert Base64 URL to Uint8Array for Push Subscription
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe to push notifications
async function subscribeUser() {
    try {
        const reg = await navigator.serviceWorker.ready;
        
        // Get public key from server
        const response = await fetch('/api/vapidPublicKey');
        const vapidPublicKey = await response.text();

        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        await fetch('/api/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: { 'Content-Type': 'application/json' }
        });

        isSubscribed = true;
        bellIcon.setAttribute('data-lucide', 'bell-ring');
        enableNotificationsBtn.classList.add('active');
        lucide.createIcons();
        alert('Notifications enabled!');

    } catch (error) {
        console.error('Failed to subscribe the user: ', error);
        alert('Could not enable notifications. Check console for details.');
    }
}

enableNotificationsBtn.addEventListener('click', async () => {
    if (isSubscribed) {
        alert('You are already subscribed to notifications.');
        return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        subscribeUser();
    } else {
        alert('Permission for notifications was denied.');
    }
});

simulatePostBtn.addEventListener('click', async () => {
    // Add to UI immediately
    const html = `
        <div class="post-card new-post-anim">
            <div class="post-header">
                <div class="user-avatar"><img src="https://ui-avatars.com/api/?name=You&background=6366f1&color=fff" alt="User"></div>
                <div class="post-meta">
                    <h4>You</h4>
                    <span>Just now</span>
                </div>
            </div>
            <div class="post-content">
                <p>New post created at ${new Date().toLocaleTimeString()}! Push notification sent to all devices.</p>
            </div>
        </div>
    `;
    feedList.insertAdjacentHTML('afterbegin', html);

    // Call server to trigger push notification
    await fetch('/api/post', { method: 'POST' });
});

// Handling when user returns to the app to clear badges
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Clear badges
        if (navigator.clearAppBadge) {
            navigator.clearAppBadge().catch(console.error);
        }
        
        // Tell server to reset count
        fetch('/api/resetCount', { method: 'POST' });
    }
});
