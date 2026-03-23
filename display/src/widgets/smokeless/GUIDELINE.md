# Smokeless Widget — Developer Notes

## Required Environment Variables

Add these to `display/.env` (Vite reads them at build time):

```env
VITE_FIREBASE_API_KEY=<from Firebase Console>
VITE_FIREBASE_AUTH_DOMAIN=smokeless-eu.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smokeless-eu
VITE_FIREBASE_STORAGE_BUCKET=smokeless-eu.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1096722867612
VITE_FIREBASE_APP_ID=<from Firebase Console>
```

Find `apiKey` and `appId` in **Firebase Console → Project settings → Your apps**.

---

## Firestore Collection Path

```
users/{uid}/logs/{auto-id}/
  timestamp: Timestamp
  intervalSincePrevious: number  (seconds since previous log; 0 for first)
```

Logs are queried filtered to `timestamp >= todayStart`, ordered `desc`. `logs[0]` is always the latest.

---

## Render States

| State | When |
|-------|------|
| `auth` | Firebase Auth returns `null` user on `onAuthStateChanged` |
| `loading` | Auth resolves with a user, but first Firestore snapshot not yet received |
| `live` | First `onSnapshot` callback fires with today's entries |

Transitions are driven by `onAuthChange()` (from `firebase.ts`) + the Firestore `onSnapshot` callback.

---

## Optimistic Update Pattern

When the `+` button is tapped:

1. `_optimisticCount += 1` — immediately increments displayed count.
2. `_update()` re-renders with the new count.
3. `addSmokeEntry(uid)` writes to Firestore asynchronously.
4. On success: `onSnapshot` fires → `_optimisticCount` resets to 0 (confirmed count replaces optimistic offset).
5. On failure: `_optimisticCount` decremented back, `_update()` reverts UI.

---

## Notes

- The widget does **not** use `BaseWidget`'s `dataEndpoint` or polling. It overrides `connectedCallback()` directly.
- The 60-second tick (`setInterval`) refreshes the "time since last" label without a full Firestore fetch.
- Tint color of the big count number shifts: green (>2h clean), amber (<1h), red (<15min).
