# Security checklist — Ekta Padel

The admin gate in the app (`window.isAdmin = user.email === ADMIN_EMAIL`) is
**client-side only**. It controls what the UI shows — it does **not** secure the
database. Database security is enforced entirely by Firestore rules.

## 1. Deploy the rules (do this first)

1. Open **Firebase Console → Firestore Database → Rules**.
2. Paste the contents of [`firestore.rules`](firestore.rules).
3. Click **Publish**.

(or, with the Firebase CLI: `firebase deploy --only firestore:rules`)

## 2. Verify they actually block writes

In the **Rules Playground** (Console → Firestore → Rules → "Playground"):

| Simulate | Path | Expected |
|---|---|---|
| `get` (unauthenticated) | `/padel/main` | ✅ Allow (public leaderboard) |
| `update` (unauthenticated) | `/padel/main` | ❌ **Deny** |
| `update` (auth = a non-admin email) | `/padel/main` | ❌ **Deny** |
| `update` (auth = admin email, verified) | `/padel/main` | ✅ Allow |
| `create` (auth = any user) | `/errors/abc` | ✅ Allow |
| `get` (non-admin) | `/errors/abc` | ❌ **Deny** |
| `write` (admin) | `/backups/2026-01-01` | ✅ Allow |

If the unauthenticated/non-admin **write** rows say *Allow*, your data is
exposed — re-check the rules were published to the correct project.

## 3. Red flags to look for in the current rules

- A rule like `allow read, write: if true;` — **world-writable** (test mode).
- `allow read, write: if request.time < timestamp.date(2025, …);` — **test mode
  that already expired or will**; once it expires the app breaks, before that
  it's wide open.
- Rules scoped only to `/{document=**}` with broad access.

## 4. After deploying

- Confirm the app still works for you (admin) — add a match, it should save.
- Confirm a logged-out viewer can still see the leaderboard (read is public).
- Backups (`backups/{date}`) and error reports (`errors/{clientId}`) start
  flowing automatically; check the `backups` and `errors` collections appear in
  the Console after a day / after an error.

## Notes

- To make the leaderboard **private** (viewers must sign in), change
  `allow read: if true;` to `allow read: if request.auth != null;` under
  `/padel/{doc}`.
- The admin is matched by email. To pin to a Google account UID instead, replace
  the `isAdmin()` body with `request.auth != null && request.auth.uid == 'YOUR_UID'`.
