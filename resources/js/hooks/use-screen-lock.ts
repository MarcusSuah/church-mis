import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { lockScreen } from '@/routes';
import { lock } from '@/routes/lock-screen';

/**
 * Lock screen (see LockScreenController). Activity in any tab counts, so a
 * user working in one tab doesn't get locked out by another idle tab; when
 * one tab locks or unlocks, the others follow.
 */
const ACTIVITY_KEY = 'ssbc:last-activity';
const LOCKED_KEY = 'ssbc:screen-locked';
export const UNLOCKED_KEY = 'ssbc:screen-unlocked';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

function readNumber(key: string): number {
    try {
        return Number(window.localStorage.getItem(key)) || 0;
    } catch {
        return 0;
    }
}

/** Tell the other tabs (they listen to storage events). */
export function broadcast(key: string): void {
    try {
        window.localStorage.setItem(key, String(Date.now()));
    } catch {
        // Private mode / storage blocked: tabs just won't sync.
    }
}

/** Lock now: the server marks the session locked and shows the lock screen. */
export function lockScreenNow(): void {
    broadcast(LOCKED_KEY);
    router.post(lock.url());
}

/** Locks the screen after `minutes` without mouse, keyboard or touch (0 = off). */
export function useScreenLock(minutes: number): void {
    // Another tab locked: show the lock screen here too.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === LOCKED_KEY) {
                router.visit(lockScreen.url());
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    useEffect(() => {
        if (!minutes || minutes <= 0) {
            return;
        }

        const limit = minutes * 60_000;
        let lastLocal = Date.now();
        let lastWritten = 0;
        let locking = false;

        const markActive = () => {
            lastLocal = Date.now();
            // Share at most every 5 seconds, so constant mouse movement stays cheap.
            if (lastLocal - lastWritten > 5_000) {
                lastWritten = lastLocal;
                broadcast(ACTIVITY_KEY);
            }
        };

        const check = () => {
            const idleFor = Date.now() - Math.max(lastLocal, readNumber(ACTIVITY_KEY));
            if (!locking && idleFor >= limit) {
                locking = true;
                lockScreenNow();
            }
        };

        // A fresh page counts as activity, so an old timestamp can't lock it at once.
        markActive();
        ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActive, { passive: true }));
        // Background tabs run timers slowly; check again as soon as the tab is visible.
        const onVisible = () => document.visibilityState === 'visible' && check();
        document.addEventListener('visibilitychange', onVisible);
        const timer = window.setInterval(check, 10_000);

        return () => {
            ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive));
            document.removeEventListener('visibilitychange', onVisible);
            window.clearInterval(timer);
        };
    }, [minutes]);
}
