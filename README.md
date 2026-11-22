# Income & Expense Manager

A mobile-friendly, local-first web app for customer payment tracking, daily income and expense, work management and deadline reminders.

## Enable GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main**, folder **/(root)**, then Save.
4. Wait for GitHub Pages to publish. Your site URL will be shown on the Pages settings screen.

## Use
Open the published URL on your iPhone. In Safari, use Share → Add to Home Screen for an app-like icon.

## Data and privacy
Records are stored in browser localStorage on the device/browser. They are not sent to GitHub. Export backups regularly. Clearing website data can erase records.

## Reminder limitation
The app displays 7-day-before, deadline-day and daily-overdue reminders whenever opened. Browser notifications are permission-based and are not guaranteed as background scheduled notifications on iOS Safari. A native app is needed for more reliable scheduled alerts.

## Offline
The service worker caches the app shell after the first successful load. The first visit requires internet access.
