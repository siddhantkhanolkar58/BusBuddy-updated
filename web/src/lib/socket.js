/**
 * One shared Socket.io connection (PRD FR-S2).
 *
 * Rooms rather than polling, and one socket for the whole tab: a commuter
 * watching a stop while an admin tab watches the network should still be a
 * single connection per client.
 *
 * Re-subscription on reconnect is handled here. Socket.io restores the transport
 * but not room membership, so without this a bus would appear frozen after a
 * tunnel — exactly the failure the freshness indicator would then have to
 * explain.
 *
 * Static-host mode: when VITE_API_URL is not set the app is deployed on a
 * static host (Vercel / Firebase Hosting) with no Express backend.  All
 * socket calls become no-ops so the browser console stays clean.
 */
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@sptos/shared';
import { getToken } from './api.js';

const SOCKET_URL = import.meta.env?.VITE_API_URL || undefined;

/**
 * When no backend URL is configured the socket is disabled entirely.
 * Live updates are unavailable but the REST+Firestore path still works.
 */
const SOCKET_DISABLED = !import.meta.env?.VITE_API_URL;

const SUBSCRIBE = {
  route: SOCKET_EVENTS.SUBSCRIBE_ROUTE,
  stop: SOCKET_EVENTS.SUBSCRIBE_STOP,
};
const UNSUBSCRIBE = {
  route: SOCKET_EVENTS.UNSUBSCRIBE_ROUTE,
  stop: SOCKET_EVENTS.UNSUBSCRIBE_STOP,
};
const UPDATE_EVENT = {
  route: SOCKET_EVENTS.ROUTE_UPDATE,
  stop: SOCKET_EVENTS.STOP_UPDATE,
};

let socket = null;
/** kind:id -> Set<handler>, so several components can watch the same room. */
const rooms = new Map();
const statusHandlers = new Set();

const roomKey = (kind, id) => `${kind}:${id}`;

function notifyStatus() {
  for (const handler of statusHandlers) handler(Boolean(socket?.connected));
}

export function getSocket() {
  if (SOCKET_DISABLED) return null;
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: getToken() },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 800,
    reconnectionDelayMax: 8000,
  });

  socket.on('connect', () => {
    notifyStatus();
    for (const key of rooms.keys()) {
      const [kind, id] = key.split(':');
      socket.emit(SUBSCRIBE[kind], Number(id), (state) => {
        if (state && !state.error) dispatch(key, state);
      });
    }
  });

  socket.on('disconnect', notifyStatus);

  for (const kind of Object.keys(UPDATE_EVENT)) {
    socket.on(UPDATE_EVENT[kind], (payload) => {
      const id = kind === 'route' ? payload?.route?.id : payload?.stop?.id;
      if (id) dispatch(roomKey(kind, id), payload);
    });
  }

  return socket;
}

function dispatch(key, payload) {
  for (const handler of rooms.get(key) ?? []) handler(payload);
}

/**
 * Joins a room and returns an unsubscribe. The acknowledgement carries the
 * current state, so a subscriber gets an immediate snapshot without a second
 * REST round trip.
 */
export function subscribe(kind, id, handler) {
  if (!id || SOCKET_DISABLED) return () => {};
  const key = roomKey(kind, id);
  const live = getSocket();
  if (!live) return () => {};

  if (!rooms.has(key)) {
    rooms.set(key, new Set());
    live.emit(SUBSCRIBE[kind], Number(id), (state) => {
      if (state && !state.error) dispatch(key, state);
    });
  }
  rooms.get(key).add(handler);

  return () => {
    const handlers = rooms.get(key);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      rooms.delete(key);
      live.emit(UNSUBSCRIBE[kind], Number(id));
    }
  };
}

/** Private per-user and admin channels: arrival alerts and network activity. */
export function on(event, handler) {
  if (SOCKET_DISABLED) return () => {};
  const live = getSocket();
  if (!live) return () => {};
  live.on(event, handler);
  return () => live.off(event, handler);
}

export function subscribeAdmin() {
  if (SOCKET_DISABLED) return;
  const live = getSocket();
  if (live) live.emit(SOCKET_EVENTS.SUBSCRIBE_ADMIN, () => {});
}

export function onConnectionChange(handler) {
  statusHandlers.add(handler);
  // On static-only deployments there is no socket — always report disconnected.
  handler(SOCKET_DISABLED ? false : Boolean(socket?.connected));
  return () => statusHandlers.delete(handler);
}

/**
 * Signing in or out changes who the socket is, so the handshake has to run
 * again. Reconnecting rather than tearing the socket down keeps the room
 * registry — and therefore every component's subscription — intact: the
 * `connect` handler above rejoins them all.
 */
export function refreshSocketAuth() {
  if (!socket || SOCKET_DISABLED) return;
  socket.auth = { token: getToken() };
  socket.disconnect().connect();
}
