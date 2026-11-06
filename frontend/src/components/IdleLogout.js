import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { logout } from '../redux/slices/authSlice';

// Auto-logout the user after 5 minutes of inactivity.
// "Activity" = any of the listed events. The last-activity time is kept in
// localStorage so the limit also holds across page reloads, closed tabs and
// a sleeping laptop, and activity in one tab keeps the other tabs alive.
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL = 15 * 1000;
const WRITE_THROTTLE = 5 * 1000;
const LAST_ACTIVITY_KEY = 'lastActivityAt';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

const readLastActivity = () => {
  try {
    return parseInt(localStorage.getItem(LAST_ACTIVITY_KEY), 10) || null;
  } catch (e) {
    return null;
  }
};

const writeLastActivity = (ts) => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
  } catch (e) { /* ignore */ }
};

const clearLastActivity = () => {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch (e) { /* ignore */ }
};

const IdleLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useSelector((state) => state.auth);

  // null = first render after a page load; lets us tell a fresh login
  // (start the clock) apart from a reload of an existing session (check it).
  const prevAuthRef = useRef(null);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated) {
      if (wasAuthenticated) clearLastActivity();
      return;
    }

    const forceLogout = () => {
      clearLastActivity();
      dispatch(logout());
      toast.warning('You have been logged out due to 5 minutes of inactivity.');
      navigate('/login');
    };

    const isExpired = () => {
      const last = readLastActivity();
      return last !== null && Date.now() - last > IDLE_TIMEOUT;
    };

    // Returning to an existing session (page load) that has already been idle too long
    if (wasAuthenticated === null && isExpired()) {
      forceLogout();
      return;
    }

    const now = Date.now();
    writeLastActivity(now);
    lastWriteRef.current = now;

    const onActivity = () => {
      const t = Date.now();
      if (t - lastWriteRef.current < WRITE_THROTTLE) return;
      lastWriteRef.current = t;
      writeLastActivity(t);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && isExpired()) forceLogout();
    };

    const interval = setInterval(() => {
      if (isExpired()) forceLogout();
    }, CHECK_INTERVAL);

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity)
      );
      document.removeEventListener('visibilitychange', onVisible);
    };
    // Re-arm whenever the auth state flips (login/logout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  return null;
};

export default IdleLogout;
