import { Outlet } from 'react-router-dom';
import { MobileShell } from './MobileShell';
import { HelpingHandRoot } from '../helping-hand/HelpingHandRoot';

export function ArtisanLayout() {
  return (
    <MobileShell>
      <Outlet />
      <HelpingHandRoot />
    </MobileShell>
  );
}
