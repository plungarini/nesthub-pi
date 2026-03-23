import admin from 'firebase-admin';

let _app: admin.app.App | null = null;

/**
 * Returns the Firebase Admin app singleton.
 * Initializes from FIREBASE_SERVICE_ACCOUNT_JSON env var (single-line JSON string).
 */
export function getFirebaseAdmin(): admin.app.App {
	if (_app) return _app;

	const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
	if (!raw) {
		throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set');
	}

	const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
	_app = admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});

	return _app;
}
