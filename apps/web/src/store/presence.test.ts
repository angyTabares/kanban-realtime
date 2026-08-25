import { describe, expect, it, beforeEach } from 'vitest';
import { usePresence } from './presence';

describe('usePresence store', () => {
  beforeEach(() => {
    usePresence.setState({ activeUserIds: [] });
  });

  it('marca usuarios en línea manteniendo el set de ids', () => {
    usePresence.getState().markOnline('u1');
    usePresence.getState().markOnline('u2');
    usePresence.getState().markOnline('u1'); // duplicado
    expect(usePresence.getState().activeUserIds).toEqual(['u1', 'u2']);
  });

  it('marca fuera de línea y reemplaza la lista cuando llega el snapshot', () => {
    usePresence.getState().markOffline('u1');
    expect(usePresence.getState().activeUserIds).toEqual([]);

    usePresence.getState().setActive(['a', 'b']);
    expect(usePresence.getState().activeUserIds).toEqual(['a', 'b']);
  });

  it('limpia el estado', () => {
    usePresence.getState().setActive(['a']);
    usePresence.getState().clear();
    expect(usePresence.getState().activeUserIds).toEqual([]);
  });
});