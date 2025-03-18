import logging
from datetime import datetime

from sentry.eventstore.models import GroupEvent
from sentry.integrations.repository import get_default_notification_action_repository
from sentry.integrations.repository.base import NotificationMessageValidationError
from sentry.integrations.repository.notification_action import (
    NewNotificationActionNotificationMessage,
    NotificationActionNotificationMessageRepository,
)
from sentry.integrations.utils.metrics import EventLifecycle
from sentry.models.options.organization_option import OrganizationOption
from sentry.models.organization import Organization
from sentry.workflow_engine.models.action import Action

_default_logger = logging.getLogger(__name__)


class NotificationActionThreadUtils:
    """
    Stateless utility class for handling notification action threads.
    This class will will be used for the issue and metric alert handlers.

    Eventually with Notification Platform, we should delete this class
    """

    @classmethod
    def _save_notification_action_message(
        cls,
        data: NewNotificationActionNotificationMessage,
    ) -> None:
        """Save a notification action message to the repository."""
        try:
            action_repository: NotificationActionNotificationMessageRepository = (
                get_default_notification_action_repository()
            )
            action_repository.create_notification_message(data=data)
        except NotificationMessageValidationError as err:
            extra = data.__dict__ if data else None
            _default_logger.info(
                "Validation error for new notification action message", exc_info=err, extra=extra
            )
        except Exception:
            # if there's an error trying to save a notification message, don't let that error block this flow
            # we already log at the repository layer, no need to log again here
            pass

    @classmethod
    def _get_notification_action_thread_ts(
        cls,
        organization: Organization,
        lifecycle: EventLifecycle,
        action: Action,
        event: GroupEvent,
        open_period_start: datetime | None,
        new_notification_message_object: NewNotificationActionNotificationMessage,
        thread_option_default: bool,
    ) -> str | None:
        """Find the thread in which to post a notification action notification as a reply.

        Return None to post the notification as a top-level message.
        """
        if not (
            OrganizationOption.objects.get_value(
                organization=organization,
                key="sentry:issue_alerts_thread_flag",
                default=thread_option_default,
            )
        ):
            return None

        try:
            action_repository: NotificationActionNotificationMessageRepository = (
                get_default_notification_action_repository()
            )
            parent_notification_message = action_repository.get_parent_notification_message(
                action=action,
                group=event.group,
                open_period_start=open_period_start,
            )
        except Exception as e:
            lifecycle.record_halt(e)
            return None

        if parent_notification_message is None:
            return None

        new_notification_message_object.parent_notification_message_id = (
            parent_notification_message.id
        )
        return parent_notification_message.message_identifier
