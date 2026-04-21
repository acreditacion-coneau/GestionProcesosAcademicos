import React from 'react';
import { RouterProvider } from 'react-router';
import { TramitesProvider } from './context/TramitesContext';
import { UserProvider } from './context/UserContext';
import { router } from './routes';

export default function App() {
  return (
    <UserProvider>
      <TramitesProvider>
        <RouterProvider router={router} />
      </TramitesProvider>
    </UserProvider>
  );
}
