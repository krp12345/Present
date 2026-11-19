# Authentication

## Sign in with Google

The app is unlocked by signing in with a Google account through Firebase Authentication. There is no key or password of the app's own, so there is nothing to guess or brute-force: repeated attempts are a matter for Google's own account protection.

Only one account may use the app: the one whose Firebase user ID has a document in the Firestore `owners` collection. The operator adds that document by hand in the Firebase console. Any other account that signs in is shown "Access denied" (with its user ID, so the owner can register themselves the first time) and can read or write nothing; the Firestore security rules enforce this on every request.

## Session

A session lasts one hour from sign-in. Firebase refreshes its ID token in the background, but the token keeps the original sign-in time (`auth_time`), and the security rules refuse every request once that is more than one hour ago. The client also returns to the sign-in screen at that moment; anything not saved is discarded. Signing in again starts a new hour.

Each device signs in on its own, so the PC and the phone may be open at the same time.

"Lock" signs out on that device.

## What changed from the static-key design

The first design used a static key, a count of five failed tries, and a block that lasted until the operator cleared it. Enforcing a failure count needs server code, which the free Firebase plan does not run. Google sign-in restricted to the owner's account removes the guessable secret altogether, so the count and the block are no longer needed.
