import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './providers/AppProviders';
import { router } from './router';
import { ConnectionStatusOverlay } from '@/shared/components/ConnectionStatusOverlay';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <ConnectionStatusOverlay />
    </AppProviders>
  );
}

