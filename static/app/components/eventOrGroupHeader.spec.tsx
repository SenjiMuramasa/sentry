import {EventFixture} from 'sentry-fixture/event';
import {GroupFixture} from 'sentry-fixture/group';
import {UserFixture} from 'sentry-fixture/user';

import {initializeOrg} from 'sentry-test/initializeOrg';
import {render, screen, userEvent} from 'sentry-test/reactTestingLibrary';
import {textWithMarkupMatcher} from 'sentry-test/utils';

import EventOrGroupHeader from 'sentry/components/eventOrGroupHeader';
import {EventOrGroupType} from 'sentry/types/event';

const group = GroupFixture({
  level: 'error',
  metadata: {
    type: 'metadata type',
    directive: 'metadata directive',
    uri: 'metadata uri',
    value: 'metadata value',
    message: 'metadata message',
  },
  culprit: 'culprit',
});

const event = EventFixture({
  id: 'id',
  eventID: 'eventID',
  groupID: 'groupID',
  culprit: undefined,
  metadata: {
    type: 'metadata type',
    directive: 'metadata directive',
    uri: 'metadata uri',
    value: 'metadata value',
    message: 'metadata message',
  },
});

describe('EventOrGroupHeader', function () {
  beforeEach(() => {
    jest.useRealTimers();
  });

  const {organization, router} = initializeOrg();

  describe('Group', function () {
    it('renders with `type = error`', function () {
      render(<EventOrGroupHeader data={group} {...router} />);
    });

    it('renders with `type = csp`', function () {
      render(
        <EventOrGroupHeader
          data={{
            ...group,
            type: EventOrGroupType.CSP,
          }}
          {...router}
        />
      );
    });

    it('renders with `type = default`', function () {
      render(
        <EventOrGroupHeader
          data={{
            ...group,
            type: EventOrGroupType.DEFAULT,
            metadata: {
              ...group.metadata,
              title: 'metadata title',
            },
          }}
          {...router}
        />
      );
    });

    it('renders metadata values in message for error events', function () {
      render(
        <EventOrGroupHeader
          data={{
            ...group,
            type: EventOrGroupType.ERROR,
          }}
          {...router}
        />
      );

      expect(screen.getByText('metadata value')).toBeInTheDocument();
    });

    it('renders location', function () {
      render(
        <EventOrGroupHeader
          data={{
            ...group,
            metadata: {
              filename: 'path/to/file.swift',
            },
            platform: 'swift',
            type: EventOrGroupType.ERROR,
          }}
          {...router}
        />
      );

      expect(
        screen.getByText(textWithMarkupMatcher('in path/to/file.swift'))
      ).toBeInTheDocument();
    });

    it('preloads group on hover', async function () {
      jest.useFakeTimers();
      const mockFetchGroup = MockApiClient.addMockResponse({
        url: `/organizations/org-slug/issues/${group.id}/`,
        body: group,
      });

      render(<EventOrGroupHeader data={group} {...router} />, {
        organization: {...organization, features: ['issue-stream-table-layout']},
      });

      const groupLink = screen.getByRole('link');

      // Should not be called right away
      await userEvent.hover(groupLink, {delay: null});
      expect(mockFetchGroup).not.toHaveBeenCalled();

      // Called after 300ms
      jest.advanceTimersByTime(301);
      expect(mockFetchGroup).toHaveBeenCalled();
    });
  });

  describe('Event', function () {
    it('renders with `type = error`', function () {
      render(
        <EventOrGroupHeader
          data={EventFixture({
            ...event,
            type: EventOrGroupType.ERROR,
          })}
          {...router}
        />
      );
    });

    it('renders with `type = csp`', function () {
      render(
        <EventOrGroupHeader
          data={{
            ...event,
            type: EventOrGroupType.CSP,
          }}
          {...router}
        />
      );
    });

    it('renders with `type = default`', function () {
      render(
        <EventOrGroupHeader
          data={{
            ...event,
            type: EventOrGroupType.DEFAULT,
            metadata: {
              ...event.metadata,
              title: 'metadata title',
            },
          }}
          {...router}
        />
      );
    });

    it('hides level tag', function () {
      render(
        <EventOrGroupHeader
          hideLevel
          data={{
            ...event,
            type: EventOrGroupType.DEFAULT,
            metadata: {
              ...event.metadata,
              title: 'metadata title',
            },
          }}
        />
      );
    });

    it('keeps sort in link when query has sort', function () {
      render(
        <EventOrGroupHeader
          data={{
            ...event,
            type: EventOrGroupType.DEFAULT,
          }}
        />,
        {
          router: {
            ...router,
            location: {
              ...router.location,
              query: {
                ...router.location.query,
                sort: 'freq',
              },
            },
          },
        }
      );

      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        '/organizations/org-slug/issues/groupID/events/eventID/?_allp=1&referrer=event-or-group-header&sort=freq'
      );
    });

    it('lack of project adds all parameter', function () {
      render(
        <EventOrGroupHeader
          data={{
            ...event,
            type: EventOrGroupType.DEFAULT,
          }}
        />,
        {
          router: {
            ...router,
            location: {
              ...router.location,
              query: {},
            },
          },
        }
      );

      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        '/organizations/org-slug/issues/groupID/events/eventID/?_allp=1&referrer=event-or-group-header'
      );
    });
  });

  it('renders group tombstone without link to group', function () {
    render(
      <EventOrGroupHeader
        data={{
          id: '123',
          level: 'error',
          message: 'numTabItems is not defined ReferenceError something',
          culprit:
            'useOverflowTabs(webpack-internal:///./app/components/tabs/tabList.tsx)',
          type: EventOrGroupType.ERROR,
          metadata: {
            value: 'numTabItems is not defined',
            type: 'ReferenceError',
            filename: 'webpack-internal:///./app/components/tabs/tabList.tsx',
            function: 'useOverflowTabs',
          },
          actor: UserFixture(),
          isTombstone: true,
        }}
        {...router}
      />
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
