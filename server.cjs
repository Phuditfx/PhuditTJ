const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set up VAPID Keys
let vapidKeys;
const VAPID_KEY_FILE = path.join(__dirname, 'vapid-keys.json');

if (fs.existsSync(VAPID_KEY_FILE)) {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_KEY_FILE, 'utf8'));
} else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_KEY_FILE, JSON.stringify(vapidKeys));
}

webpush.setVapidDetails(
    'mailto:test@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

// Store subscriptions (In-memory for demo)
let subscriptions = [];
let postCount = 0; // Simulated global unread post count

// API to get Public VAPID Key for frontend
app.get('/api/vapidPublicKey', (req, res) => {
    res.send(vapidKeys.publicKey);
});

// API to subscribe
app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    // Prevent duplicate subscriptions
    const existing = subscriptions.find(sub => sub.endpoint === subscription.endpoint);
    if (!existing) {
        subscriptions.push(subscription);
        console.log('New subscription added.');
    }
    res.status(201).json({});
});

// API to reset count (when user opens the app)
app.post('/api/resetCount', (req, res) => {
    postCount = 0;
    res.status(200).json({ success: true });
});

// API to simulate a new post being created
app.post('/api/post', (req, res) => {
    postCount++;
    const payload = JSON.stringify({
        title: 'New Post!',
        body: 'Someone just posted on the feed.',
        icon: '/icons/icon-192x192.png',
        badgeCount: postCount // Send the new count in payload
    });

    const promises = [];
    subscriptions.forEach(subscription => {
        promises.push(
            webpush.sendNotification(subscription, payload).catch(err => {
                console.error('Error sending push', err);
                // Remove failed subscription (e.g. user revoked permission)
                subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
            })
        );
    });

    Promise.all(promises).then(() => res.sendStatus(200));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    console.log(`Public VAPID Key: ${vapidKeys.publicKey}`);
});
