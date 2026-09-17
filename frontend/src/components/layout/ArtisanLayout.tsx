import { Outlet } from 'react-router-dom';
import { MobileShell } from './MobileShell';
import GuideHandOverlay from '../guide-hand/GuideHandOverlay';
import ShowMeFab from '../guide-hand/ShowMeFab';

export function ArtisanLayout() {
  return (
    <MobileShell>
      <Outlet />
      <GuideHandOverlay />
      <ShowMeFab />
    </MobileShell>
  );
}
