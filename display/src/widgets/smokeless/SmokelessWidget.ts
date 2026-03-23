import { BaseWidget } from '../_base/BaseWidget.js';
import {
	addSmokeEntry,
	getCurrentUser,
	onAuthChange,
	signInSilently,
	signInWithGoogle,
	subscribeToTodaySmokes,
	type SmokeEntry,
} from './firebase.js';

// ---------------------------------------------------------------------------
// Time formatting helper
// ---------------------------------------------------------------------------
function formatTimeSince(timestamp: Date): string {
	const diffMs = Date.now() - timestamp.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return 'just now';
	if (diffMin < 60) return `${diffMin}m ago`;
	const h = Math.floor(diffMin / 60);
	const m = diffMin % 60;
	return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

// ---------------------------------------------------------------------------
// SmokelessWidget
// ---------------------------------------------------------------------------

/**
 * SmokelessWidget — live smoking habit tracker.
 *
 * Does NOT use BaseWidget's polling or dataEndpoint — manages its own
 * Firestore onSnapshot subscription for real-time updates.
 *
 * States: 'auth' → 'loading' → 'live'
 */
export class SmokelessWidget extends BaseWidget {
	static readonly widgetId = 'smokeless-widget';
	// No dataEndpoint — we use Firestore directly
	static readonly dataEndpoint = null;

	private _entries: SmokeEntry[] = [];
	private _state: 'auth' | 'loading' | 'live' = 'loading';
	private _isAdding = false; // true while Firestore write is in flight
	private _unsubscribeAuth: (() => void) | null = null;
	private _unsubscribeFirestore: (() => void) | null = null;
	private _tickTimer: ReturnType<typeof setInterval> | null = null;

	connectedCallback() {
		super.connectedCallback();

		// Observe auth state — handles both initial state and session restore
		this._unsubscribeAuth = onAuthChange((user) => {
			if (user) {
				this._state = 'loading';
				this.loading = false; // stop BaseWidget's own loading UI
				this._subscribeToData(user.uid);
			} else {
				// Try silent sign-in via backend custom token first.
				// This works automatically on the Nest Hub (no popup needed).
				// Falls back to showing the OAuth button only if the backend
				// isn't configured (e.g. during local dev without service account).
				signInSilently().catch(() => {
					this._state = 'auth';
					this.loading = false;
					this._unsubscribeFirestore?.();
					this._unsubscribeFirestore = null;
					this._stopTick();
					this._update();
				});
			}
		});
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._unsubscribeAuth?.();
		this._unsubscribeFirestore?.();
		this._stopTick();
	}

	// ---------------------------------------------------------------------------
	// Firestore subscription
	// ---------------------------------------------------------------------------

	private _subscribeToData(uid: string) {
		this._unsubscribeFirestore?.();
		this._unsubscribeFirestore = subscribeToTodaySmokes(uid, (entries) => {
			this._entries = entries;
			this._isAdding = false; // write confirmed — unlock button
			this._state = 'live';
			this._startTick();
			this._update();
		});
	}

	// ---------------------------------------------------------------------------
	// 60-second tick for updating the "time since" label without a full re-fetch
	// ---------------------------------------------------------------------------

	private _startTick() {
		if (this._tickTimer) return;
		this._tickTimer = setInterval(() => this._update(), 60_000);
	}

	private _stopTick() {
		if (this._tickTimer) {
			clearInterval(this._tickTimer);
			this._tickTimer = null;
		}
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	protected render(): string {
		if (this._state === 'auth') return this._renderAuth();
		if (this._state === 'loading') return this._renderLoadingState();
		return this._renderLive();
	}

	private _renderAuth(): string {
		return `
      <div class="flex flex-col flex-1 items-center justify-center gap-6 px-4 text-center">
        <div class="flex flex-col items-center gap-2">
          <span class="text-4xl">🚭</span>
          <span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Smokeless</span>
          <p class="text-[0.625rem] text-white/20 uppercase tracking-wider mt-1">Sign in to track your habit</p>
        </div>
        <button
          id="smokeless-signin-btn"
          class="flex items-center gap-3 px-6 py-3 rounded-2xl glass-heavy border border-white/10 text-sm font-bold text-white/80 tracking-wide active:scale-95 transition-transform cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>
      </div>
    `;
	}

	private _renderLoadingState(): string {
		return `
      <div class="flex flex-col flex-1 items-center justify-center gap-3">
        <div class="w-8 h-8 rounded-full border-4 animate-spin border-tint-blue/30 border-t-tint-blue"></div>
        <span class="text-[0.625rem] text-white/20 uppercase tracking-widest font-bold">Connecting…</span>
      </div>
    `;
	}

	private _renderLive(): string {
		const todayCount = this._entries.length;
		const lastEntry = this._entries[0];
		const lastTimestamp = lastEntry ? lastEntry.timestamp.toDate() : null;
		const timeSince = lastTimestamp ? formatTimeSince(lastTimestamp) : '–';

		const addButtonContent = this._isAdding
			? `<div class="size-[4rem] rounded-full border-2 border-white/20 border-t-white/70 animate-spin"></div>`
			: `<span class="text-[4.5rem] translate-x-px font-medium leading-none">+</span>`;

		return `
      <div class="flex items-center justify-between px-2 py-1 shrink-0">
        <span class="text-[0.8125rem] text-white/40 uppercase font-bold leading-none tracking-[0.12em]">Smokeless</span>
        <span class="text-[0.625rem] text-white/20 uppercase font-bold tracking-widest">Today</span>
      </div>

      <div class="flex flex-1 flex-col items-center justify-center gap-4">
				<!-- Big count number -->
				<div class="flex flex-col items-center">
					<h1 class="text-[10rem] font-bold leading-none text-white transition-all duration-700">
						${todayCount}
					</h1>
					<span class="text-[1.25rem] text-white/80 -mt-3">${timeSince}</span>
				</div>

				<!-- Add button -->
				<button
					id="smokeless-add-btn"
					class="aspect-square px-4 rounded-full glass-heavy border ${this._isAdding ? 'border-white/5 opacity-50 cursor-not-allowed' : 'border-white/10 active:scale-90 active:bg-white/10 cursor-pointer'} flex items-center justify-center shadow-lg transition-all"
					${this._isAdding ? 'disabled' : ''}
				>${addButtonContent}</button>

      </div>
    `;
	}

	// ---------------------------------------------------------------------------
	// Event listeners — attached after every render via onData
	// ---------------------------------------------------------------------------

	protected onData() {
		setTimeout(() => this._attachListeners(), 0);
	}

	private _attachListeners() {
		const signinBtn = this.querySelector('#smokeless-signin-btn');
		if (signinBtn) {
			signinBtn.addEventListener('click', () => this._handleSignIn());
		}

		const addBtn = this.querySelector('#smokeless-add-btn');
		if (addBtn) {
			addBtn.addEventListener('click', () => this._handleAdd());
		}
	}

	// Re-attach listeners after every _update() call
	protected _update() {
		super._update();
		this._attachListeners();
	}

	private async _handleSignIn() {
		const signinBtn = this.querySelector('#smokeless-signin-btn') as HTMLButtonElement | null;
		if (signinBtn) {
			signinBtn.disabled = true;
			signinBtn.classList.add('opacity-50');
		}
		try {
			await signInWithGoogle();
			// onAuthChange will fire and handle the state transition
		} catch {
			if (signinBtn) {
				signinBtn.disabled = false;
				signinBtn.classList.remove('opacity-50');
			}
		}
	}

	private async _handleAdd() {
		const user = getCurrentUser();
		if (!user || this._isAdding) return;

		// Show spinner on the button — re-render just the live view
		this._isAdding = true;
		this._update();

		try {
			await addSmokeEntry(user.uid);
			// Count update comes via onSnapshot — no manual re-render needed.
			// _isAdding is reset to false inside _subscribeToData's callback.
		} catch (err) {
			this._isAdding = false;
			this._update();
			// Push error to the nesthub alert bus
			await fetch('/api/alerts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source: 'smokeless-widget',
					title: 'Smokeless',
					message: `Failed to save entry: ${(err as Error).message}`,
					level: 'error',
					durationMs: 5000,
				}),
			}).catch(() => {});
		}
	}
}

customElements.define('smokeless-widget', SmokelessWidget);
