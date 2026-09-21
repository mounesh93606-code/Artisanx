import { Outlet } from 'react-router-dom';
import { MobileShell } from './MobileShell';

export function ArtisanLayout() {
  return (
    <MobileShell>
      <Outlet />
    </MobileShell>
  );
}

