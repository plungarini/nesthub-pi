import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
	getAuth,
	GoogleAuthProvider,
	signInWithPopup,
	signInWithCustomToken,
	onAuthStateChanged,
	type User,
} from 'firebase/auth';
import {
	getFirestore,
	collection,
	query,
	where,
	orderBy,
	limit,
	getDocs,
	addDoc,
	Timestamp,
	onSnapshot,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firebase config — values injected at build time via Vite
// ---------------------------------------------------------------------------
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Singleton — safe to import from multiple widgets
let app: FirebaseApp;
if (getApps().length === 0) {
	app = initializeApp(firebaseConfig);
} else {
	app = getApps()[0]!;
}

const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SmokeEntry {
	id: string;
	timestamp: Timestamp;
	intervalSincePrevious: number;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/** Returns the currently signed-in Firebase user, or null. */
export function getCurrentUser(): User | null {
	return auth.currentUser;
}

/** Opens a Google OAuth popup. Resolves with the signed-in user. */
export async function signInWithGoogle(): Promise<User> {
	const provider = new GoogleAuthProvider();
	const result = await signInWithPopup(auth, provider);
	return result.user;
}

/**
 * Silently authenticates using a Firebase custom token fetched from the
 * nesthub-pi backend (`/api/widgets/smokeless/token`).
 *
 * This is the persistent, non-interactive auth path used by the Nest Hub Cast
 * browser. If FIREBASE_SMOKELESS_UID + FIREBASE_SERVICE_ACCOUNT_JSON are set
 * in the backend .env, this works without any user interaction and produces a
 * session that survives across Cast app launches via IndexedDB.
 */
export async function signInSilently(): Promise<User> {
	const res = await fetch('/api/widgets/smokeless/token');
	if (!res.ok) throw new Error(`Token endpoint returned ${res.status}`);
	const { token } = (await res.json()) as { token: string };
	const result = await signInWithCustomToken(auth, token);
	return result.user;
}

/**
 * Subscribes to auth state changes. Returns an unsubscribe function.
 * Useful for detecting session restore on page load.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
	return onAuthStateChanged(auth, callback);
}

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

/**
 * Subscribes to today's smoke entries for a given user.
 * Calls `callback` immediately and on every change.
 * Returns an unsubscribe function.
 */
export function subscribeToTodaySmokes(
	userId: string,
	callback: (entries: SmokeEntry[]) => void,
): () => void {
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	const ref = collection(db, 'users', userId, 'logs');
	const q = query(
		ref,
		where('timestamp', '>=', Timestamp.fromDate(todayStart)),
		orderBy('timestamp', 'desc'),
	);

	return onSnapshot(q, (snap) => {
		const entries: SmokeEntry[] = snap.docs.map((doc) => ({
			id: doc.id,
			timestamp: doc.data().timestamp as Timestamp,
			intervalSincePrevious: doc.data().intervalSincePrevious as number,
		}));
		callback(entries);
	});
}

/**
 * Subscribes to the single most recent smoke entry across all time.
 * Ensures "time since last smoke" always displays correctly, even if the last
 * smoke occurred on a previous day.
 */
export function subscribeToLatestSmoke(
	userId: string,
	callback: (entry: SmokeEntry | null) => void,
): () => void {
	const ref = collection(db, 'users', userId, 'logs');
	const q = query(ref, orderBy('timestamp', 'desc'), limit(1));

	return onSnapshot(q, (snap) => {
		if (snap.empty) {
			callback(null);
		} else {
			const doc = snap.docs[0]!;
			callback({
				id: doc.id,
				timestamp: doc.data().timestamp as Timestamp,
				intervalSincePrevious: doc.data().intervalSincePrevious as number,
			});
		}
	});
}

/**
 * Adds a new smoke entry for the given user.
 * Implements the two-step write from smokeless-interface.md:
 *   1. Compute interval since previous log.
 *   2. Write the new log document.
 */
export async function addSmokeEntry(userId: string): Promise<void> {
	const now = new Date();
	const logsRef = collection(db, 'users', userId, 'logs');

	// Step 1 — find previous log to compute interval
	const prevQuery = query(
		logsRef,
		where('timestamp', '<=', Timestamp.fromDate(now)),
		orderBy('timestamp', 'desc'),
		limit(1),
	);
	const prevSnap = await getDocs(prevQuery);

	let intervalSincePrevious = 0;
	if (!prevSnap.empty) {
		const prevTs = (prevSnap.docs[0]!.data().timestamp as Timestamp).toDate();
		intervalSincePrevious = Math.floor((now.getTime() - prevTs.getTime()) / 1000);
	}

	// Step 2 — write the new log
	await addDoc(logsRef, {
		timestamp: Timestamp.fromDate(now),
		intervalSincePrevious,
	});
}
