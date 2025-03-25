import {useTheme} from '@emotion/react';
import styled from '@emotion/styled';

import {TourElement} from 'sentry/components/tours/components';
import {t} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import type {Event} from 'sentry/types/event';
import type {Group} from 'sentry/types/group';
import type {Project} from 'sentry/types/project';
import {getConfigForIssueType} from 'sentry/utils/issueTypeConfig';
import useMedia from 'sentry/utils/useMedia';
import {
  IssueDetailsTour,
  IssueDetailsTourContext,
} from 'sentry/views/issueDetails/issueDetailsTour';
import {
  IssueDetailsContext,
  useIssueDetailsReducer,
} from 'sentry/views/issueDetails/streamline/context';
import {EventDetailsHeader} from 'sentry/views/issueDetails/streamline/eventDetailsHeader';
import {IssueEventNavigation} from 'sentry/views/issueDetails/streamline/eventNavigation';
import StreamlinedGroupHeader from 'sentry/views/issueDetails/streamline/header/header';
import StreamlinedSidebar from 'sentry/views/issueDetails/streamline/sidebar/sidebar';
import {ToggleSidebar} from 'sentry/views/issueDetails/streamline/sidebar/toggleSidebar';
import {getGroupReprocessingStatus} from 'sentry/views/issueDetails/utils';

interface GroupDetailsLayoutProps {
  children: React.ReactNode;
  event: Event | undefined;
  group: Group;
  project: Project;
}

export function GroupDetailsLayout({
  group,
  event,
  project,
  children,
}: GroupDetailsLayoutProps) {
  const theme = useTheme();
  const {issueDetails, dispatch} = useIssueDetailsReducer();
  const isScreenSmall = useMedia(`(max-width: ${theme.breakpoints.large})`);
  const shouldDisplaySidebar = issueDetails.isSidebarOpen || isScreenSmall;
  const issueTypeConfig = getConfigForIssueType(group, group.project);
  const groupReprocessingStatus = getGroupReprocessingStatus(group);
  const hasFilterBar = issueTypeConfig.header.filterBar.enabled;

  return (
    <IssueDetailsContext.Provider value={{...issueDetails, dispatch}}>
      <StreamlinedGroupHeader
        group={group}
        event={event ?? null}
        project={project}
        groupReprocessingStatus={groupReprocessingStatus}
      />
      <StyledLayoutBody
        data-test-id="group-event-details"
        sidebarOpen={issueDetails.isSidebarOpen}
      >
        <div>
          <TourElement<IssueDetailsTour>
            tourContext={IssueDetailsTourContext}
            id={IssueDetailsTour.AGGREGATES}
            title={t('View data in aggregate')}
            description={t(
              'The top section of the page always displays data in aggregate, including trends over time or tag value distributions.'
            )}
            position="bottom"
          >
            <EventDetailsHeader event={event} group={group} project={project} />
          </TourElement>
          <TourElement<IssueDetailsTour>
            tourContext={IssueDetailsTourContext}
            id={IssueDetailsTour.EVENT_DETAILS}
            title={t('Explore details')}
            description={t(
              'Here we capture everything we know about this data example, like context, trace, breadcrumbs, replay, and tags.'
            )}
            position="top"
          >
            <GroupContent>
              <NavigationSidebarWrapper hasToggleSidebar={!hasFilterBar}>
                <IssueEventNavigation event={event} group={group} />
                {/* Since the event details header is disabled, display the sidebar toggle here */}
                {!hasFilterBar && <ToggleSidebar size="sm" />}
              </NavigationSidebarWrapper>
              <ContentPadding>{children}</ContentPadding>
            </GroupContent>
          </TourElement>
        </div>
        {shouldDisplaySidebar ? (
          <StreamlinedSidebar group={group} event={event} project={project} />
        ) : null}
      </StyledLayoutBody>
    </IssueDetailsContext.Provider>
  );
}

const StyledLayoutBody = styled('div')<{
  sidebarOpen: boolean;
}>`
  display: grid;
  background-color: ${p => p.theme.background};
  grid-template-columns: ${p => (p.sidebarOpen ? 'minmax(100px, 100%) 325px' : '100%')};

  @media (max-width: ${p => p.theme.breakpoints.large}) {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
  }
`;

const GroupContent = styled('section')`
  background: ${p => p.theme.backgroundSecondary};
  display: flex;
  flex-direction: column;
  @media (min-width: ${p => p.theme.breakpoints.large}) {
    border-right: 1px solid ${p => p.theme.translucentBorder};
  }
  @media (max-width: ${p => p.theme.breakpoints.large}) {
    border-bottom-width: 1px solid ${p => p.theme.translucentBorder};
  }
`;

const NavigationSidebarWrapper = styled('div')<{
  hasToggleSidebar: boolean;
}>`
  position: relative;
  display: flex;
  padding: ${p =>
    p.hasToggleSidebar
      ? `${space(1)} 0 ${space(0.5)} ${space(1.5)}`
      : `10px ${space(1.5)} ${space(0.25)} ${space(1.5)}`};
`;

const ContentPadding = styled('div')`
  min-height: 100vh;
  padding: 0 ${space(1.5)} ${space(1.5)} ${space(1.5)};
`;
