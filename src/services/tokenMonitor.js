// src/services/tokenMonitor.js
import { isTokenExpired } from "../Redux/Slice/AxiosInstance";


class TokenMonitor {
  constructor() {
    this.dispatch = null;

    this.onSilentRefresh = null;   // async () => {}
    this.onSessionExpired = null;  // () => {}

    this.tokenInterval = null;
    this.isRefreshing = false;

    // Activity
    this.lastActivityMem = Date.now();
    this.activityHandler = null;
    this.events = ["mousedown", "keydown", "scroll", "touchstart", "click", "mousemove"];

    // Tune these
    this.TOKEN_CHECK_INTERVAL = 30 * 1000;  // check every 30 seconds
    this.ACTIVITY_WRITE_THROTTLE = 10 * 1000; // write lastActivity at most every 10s
    this.INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes inactivity -> treat as inactive
  }

  init({ dispatch, onSilentRefresh, onSessionExpired }) {
    this.dispatch = dispatch;
    this.onSilentRefresh = onSilentRefresh;
    this.onSessionExpired = onSessionExpired;

    this.ensureActivityKeys();
    this.setupActivityListeners();
    this.start();

    // immediate run
    this.checkNow();
  }

  ensureActivityKeys() {
    const now = Date.now();
    if (!localStorage.getItem("loginTime")) localStorage.setItem("loginTime", String(now));
    if (!localStorage.getItem("lastActivity")) localStorage.setItem("lastActivity", String(now));
  }

  start() {
    this.stop();
    this.tokenInterval = setInterval(() => this.checkNow(), this.TOKEN_CHECK_INTERVAL);
  }

  stop() {
    if (this.tokenInterval) {
      clearInterval(this.tokenInterval);
      this.tokenInterval = null;
    }
  }

  cleanup() {
    this.stop();
    this.removeActivityListeners();
  }

  setupActivityListeners() {
    this.removeActivityListeners();

    this.activityHandler = () => {
      const now = Date.now();
      if (now - this.lastActivityMem < this.ACTIVITY_WRITE_THROTTLE) return;

      this.lastActivityMem = now;
      try {
        localStorage.setItem("lastActivity", String(now));
      } catch (e) {
        console.error("Failed writing lastActivity", e);
      }
    };

    this.events.forEach((ev) => {
      document.addEventListener(ev, this.activityHandler, { passive: true });
    });
  }

  removeActivityListeners() {
    if (!this.activityHandler) return;
    this.events.forEach((ev) => document.removeEventListener(ev, this.activityHandler));
    this.activityHandler = null;
  }

  getAccessTokenFromStorage() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      const user = typeof raw === "string" ? JSON.parse(raw) : raw;
      return user?.accessToken || null;
    } catch {
      return null;
    }
  }

  isInactive() {
    const loginTime = Number(localStorage.getItem("loginTime") || 0);
    const lastActivity = Number(localStorage.getItem("lastActivity") || 0);
    const last = lastActivity || loginTime || Date.now();
    return Date.now() - last >= this.INACTIVITY_TIMEOUT;
  }

  async checkNow() {
    if (this.isRefreshing) return;

    const token = this.getAccessTokenFromStorage();
    if (!token) return;

    const expired = isTokenExpired(token);
    if (!expired) return;

    const inactive = this.isInactive();

    if (inactive) {
      // token expired + inactive => logout + redirect
      if (this.onSessionExpired) this.onSessionExpired();
      this.cleanup();
      return;
    }

    // token expired + active => silent refresh
    if (!this.onSilentRefresh) return;

    try {
      this.isRefreshing = true;
      await this.onSilentRefresh();
    } catch (e) {
      console.error("Silent refresh failed, expiring session", e);
      if (this.onSessionExpired) this.onSessionExpired();
      this.cleanup();
    } finally {
      this.isRefreshing = false;
    }
  }
}

export const tokenMonitor = new TokenMonitor();