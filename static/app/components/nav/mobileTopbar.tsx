import {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import styled from '@emotion/styled';

import {Button} from 'sentry/components/button';
import Link from 'sentry/components/links/link';
import {useNavContext} from 'sentry/components/nav/context';
import {PrimaryNavigationItems} from 'sentry/components/nav/primary/index';
import {SecondaryMobile} from 'sentry/components/nav/secondaryMobile';
import {IconClose, IconMenu, IconSentry} from 'sentry/icons';
import {t} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import {useLocation} from 'sentry/utils/useLocation';
import useOrganization from 'sentry/utils/useOrganization';

type ActiveView = 'primary' | 'secondary' | 'closed';

function MobileTopbar() {
  const {activeGroup} = useNavContext();
  const location = useLocation();
  const organization = useOrganization();
  const [view, setView] = useState<ActiveView>('closed');
  /** Sync menu state with `body` attributes */
  useLayoutEffect(() => {
    updateNavStyleAttributes(view);
  }, [view]);
  /** Automatically close the menu after any navigation */
  useEffect(() => {
    setView('closed');
  }, [location.pathname]);
  const handleClick = useCallback(() => {
    setView(v => (v === 'closed' ? (activeGroup ? 'secondary' : 'primary') : 'closed'));
  }, [activeGroup]);

  return (
    <Topbar>
      <HomeLink
        to={`/organizations/${organization.slug}/issues/`}
        aria-label={t('Sentry Home')}
      >
        <IconSentry />
      </HomeLink>
      <MenuButton
        onClick={handleClick}
        icon={view === 'closed' ? <IconMenu /> : <IconClose />}
        aria-label={view === 'closed' ? t('Open main menu') : t('Close main menu')}
        size="sm"
        borderless
      />
      {view !== 'closed' ? (
        <NavigationOverlayPortal
          label={view === 'primary' ? t('Primary Navigation') : t('Secondary Navigation')}
        >
          {view === 'primary' ? <PrimaryNavigationItems /> : null}
          {view === 'secondary' ? (
            <SecondaryMobile handleClickBack={() => setView('primary')} />
          ) : null}
        </NavigationOverlayPortal>
      ) : null}
    </Topbar>
  );
}

export default MobileTopbar;

/** When the mobile menu opens, set the main content to `inert` and disable `body` scrolling */
function updateNavStyleAttributes(view: ActiveView) {
  const mainContent = document.getElementById('main');
  if (!mainContent) {
    throw new Error(
      'Unable to match "#main" element. Please add `id="main"` to the element which wraps the app content.'
    );
  }

  if (view !== 'closed') {
    mainContent.setAttribute('inert', '');
    document.body.style.setProperty('overflow', 'hidden');
  } else {
    mainContent.removeAttribute('inert');
    document.body.style.removeProperty('overflow');
  }
}

function NavigationOverlayPortal({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return createPortal(
    <NavigationOverlay aria-label={label}>{children}</NavigationOverlay>,
    document.body
  );
}

const Topbar = styled('header')`
  height: 40px;
  width: 100vw;
  padding: ${space(0.5)} ${space(1.5)} ${space(0.5)} ${space(1)};
  border-bottom: 1px solid ${p => p.theme.translucentGray100};
  background: #3e2648;
  background: linear-gradient(180deg, #3e2648 0%, #442c4e 100%);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: ${p => p.theme.zIndex.sidebar};
`;

const HomeLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${space(2)};
  margin: -${space(1)};

  svg {
    color: ${p => p.theme.white};
    width: ${space(3)};
    height: ${space(3)};
  }
`;

const MenuButton = styled(Button)`
  color: ${p => p.theme.white};

  &:hover {
    color: ${p => p.theme.white};
  }
`;

const NavigationOverlay = styled('nav')`
  position: fixed;
  top: 40px;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  background: ${p => p.theme.surface300};
  z-index: ${p => p.theme.zIndex.modal};
  --color: ${p => p.theme.textColor};
  --color-hover: ${p => p.theme.activeText};
`;
