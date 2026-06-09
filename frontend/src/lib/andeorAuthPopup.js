import { toast } from "sonner";

const AUTH_POPUP_EVENT_KEY = "yanature:auth-popup-event";

function popupFeatures() {
  const width = 520;
  const height = 680;
  const screenLeft = window.screenLeft ?? window.screenX ?? 0;
  const screenTop = window.screenTop ?? window.screenY ?? 0;
  const outerWidth = window.outerWidth || window.innerWidth;
  const outerHeight = window.outerHeight || window.innerHeight;
  const left = screenLeft + Math.max(0, (outerWidth - width) / 2);
  const top = screenTop + Math.max(0, (outerHeight - height) / 2);

  return [
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "resizable=yes",
    "scrollbars=yes",
    "status=no",
    "toolbar=no",
    "menubar=no",
    "location=yes"
  ].join(",");
}

function authPopupUrl(mode = "login", provider = "google") {
  const params = new URLSearchParams({ redirectTo: "/adventure-map" });
  if (mode) params.set("mode", mode);
  if (provider) params.set("provider", provider);
  return `${window.location.origin}/auth/game-google?${params.toString()}`;
}

export function startAndeorAuthPopup({ mode = "login", provider = "google", onSuccess, onError, onCancel } = {}) {
  if (typeof window === "undefined") return null;

  let settled = false;
  let pollId = null;
  const popup = window.open(authPopupUrl(mode, provider), "andeor_google_auth", popupFeatures());

  if (!popup) {
    const message = "Please allow popups to connect your Andeor account.";
    toast.error(message);
    onError?.(message);
    return null;
  }

  popup.focus();

  function cleanup() {
    window.removeEventListener("message", handleMessage);
    window.removeEventListener("storage", handleStorage);
    if (pollId !== null) window.clearInterval(pollId);
    pollId = null;
  }

  function finishSuccess(payload) {
    if (settled) return;
    settled = true;
    cleanup();
    try {
      popup.close();
    } catch {
      // The callback page closes itself after sending the message.
    }
    onSuccess?.(payload);
  }

  function finishError(message) {
    if (settled) return;
    settled = true;
    cleanup();
    try {
      popup.close();
    } catch {
      // Ignore cross-origin close failures.
    }
    toast.error(message || "Google sign-in failed.");
    onError?.(message);
  }

  function handlePayload(payload) {
    if (!payload || typeof payload !== "object") return;
    if (payload.type === "YANATURE_AUTH_SUCCESS") {
      finishSuccess(payload);
      return;
    }
    if (payload.type === "YANATURE_AUTH_ERROR") {
      finishError(payload.message || "Google sign-in failed.");
    }
  }

  function handleMessage(event) {
    if (event.origin !== window.location.origin) return;
    handlePayload(event.data);
  }

  function handleStorage(event) {
    if (event.key !== AUTH_POPUP_EVENT_KEY || !event.newValue) return;
    try {
      handlePayload(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed storage updates.
    }
  }

  window.addEventListener("message", handleMessage);
  window.addEventListener("storage", handleStorage);
  pollId = window.setInterval(() => {
    if (!settled && popup.closed) {
      settled = true;
      cleanup();
      onCancel?.();
    }
  }, 700);

  return {
    close() {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        popup.close();
      } catch {
        // Ignore cross-origin close failures.
      }
    }
  };
}
