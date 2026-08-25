import { io, Socket } from 'socket.io-client';
import { useAuth } from '../store/auth';

const WS_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const socket: Socket = io(WS_ORIGIN || '/', {
  path: '/ws',
  auth: { token: useAuth.getState().accessToken },
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export function connectSocket(): Socket {
  if (!socket.connected) {
    socket.auth = { token: useAuth.getState().accessToken };
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  socket.disconnect();
}

/** Asegura la conexión y resuelve cuando el socket está listo para emitir. */
export function ensureConnected(timeoutMs = 5000): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (socket.connected) return resolve(socket);
    connectSocket();
    const timer = setTimeout(() => {
      socket.off('connect', onConnect);
      reject(new Error('No se pudo conectar el socket de tiempo real'));
    }, timeoutMs);
    const onConnect = () => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      resolve(socket);
    };
    socket.once('connect', onConnect);
  });
}

/** Conecta el socket y, si el token fue rechazado, refresca la sesión y reconecta. */
export async function connectSocketWithRetry(): Promise<Socket> {
  if (socket.connected) return socket;
  socket.auth = { token: useAuth.getState().accessToken };
  socket.connect();

  const result = await new Promise<Socket>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Tiempo de conexión agotado'));
    }, 8000);

    const onError = () => {
      cleanup();
      // Token inválido: refrescar y reconectar una sola vez.
      void refreshAndRetry().then(resolve).catch(reject);
    };

    const onConnect = () => {
      cleanup();
      resolve(socket);
    };

    function cleanup() {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('error:auth', onError);
    }

    socket.on('connect', onConnect);
    socket.on('error:auth', onError);
  });

  return result;
}

async function refreshAndRetry(): Promise<Socket> {
  const state = useAuth.getState();
  const apiBase = WS_ORIGIN ? `${WS_ORIGIN}/api` : '/api';
  const res = await fetch(`${apiBase}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: state.refreshToken }),
  });
  if (!res.ok) {
    throw new Error('No se pudo renovar la sesión');
  }
  const body = (await res.json()) as {
    data: { accessToken: string; refreshToken: string };
  };
  useAuth.getState().setTokens(body.data);
  socket.auth = { token: body.data.accessToken };
  socket.connect();
  await ensureConnected();
  return socket;
}