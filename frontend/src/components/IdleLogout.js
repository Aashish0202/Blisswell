import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { logout } from '../redux/slices/authSlice';

// Auto-logout the user after 10 minutes of inactivity.
// "Activity" = any of the listed events; each resets the timer.
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

const IdleLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useSelector((state) => state.auth);

  const timerRef = useRef(null);
  // Keep latest auth state inside a ref so the (stable) activity handler always sees it
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const forceLogout = () => {
    clearTimer();
    dispatch(logout());
    toast.warning('You have been logged out due to 10 minutes of inactivity.');
    navigate('/login');
  };

  const resetTimer = () => {
    if (!authRef.current) return;
    clearTimer();
    timerRef.current = setTimeout(forceLogout, IDLE_TIMEOUT);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimer();
      return;
    }

    // Arm the timer and listen for activity
    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );

    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, resetTimer)
      );
    };
    // Re-arm whenever the auth state flips (login/logout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  return null;
};

export default IdleLogout;