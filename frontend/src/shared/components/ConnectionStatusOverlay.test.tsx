// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConnectionStatusOverlay } from './ConnectionStatusOverlay';
import { connectionUnavailableEvent } from '@/shared/lib/apiClient';

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value });
}

afterEach(() => { cleanup(); setOnline(true); });

describe('ConnectionStatusOverlay', () => {
  it('muestra una pantalla que conserva la página al perder la conexión y se oculta al recuperarla', () => {
    setOnline(false);
    render(<ConnectionStatusOverlay />);
    expect(screen.getByRole('alertdialog', { name: 'Sin conexión con Dental System' })).toBeTruthy();
    setOnline(true);
    fireEvent(window, new Event('online'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('puede mostrarse como una ruta de demostración incluso con conexión', () => {
    setOnline(true);
    render(<ConnectionStatusOverlay forceVisible />);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('usa la misma pantalla cuando el servidor deja de responder', () => {
    setOnline(true);
    render(<ConnectionStatusOverlay />);
    fireEvent(window, new Event(connectionUnavailableEvent));
    expect(screen.getByRole('alertdialog', { name: 'Sin conexión con Dental System' })).toBeTruthy();
  });
});
