from django.utils.translation import gettext_lazy as _
from rest_framework import serializers, status
from rest_framework.request import Request
from rest_framework.response import Response

from sentry.api.api_publish_status import ApiPublishStatus
from sentry.api.base import region_silo_endpoint
from sentry.api.bases.organization_request_change import OrganizationRequestChangeEndpoint
from sentry.api.serializers.rest_framework import CamelSnakeSerializer
from sentry.utils.email import MessageBuilder
from sentry.utils.http import absolute_uri


class OrganizationRequestProjectCreationSerializer(CamelSnakeSerializer):
    target_user_email = serializers.EmailField(required=True)


@region_silo_endpoint
class OrganizationRequestProjectCreation(OrganizationRequestChangeEndpoint):
    publish_status = {
        "POST": ApiPublishStatus.PRIVATE,
    }

    def post(self, request: Request, organization) -> Response:
        """
        Send an email requesting a project be created
        """

        if not request.user.is_authenticated:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        serializer = OrganizationRequestProjectCreationSerializer(data=request.data)
        if not serializer.is_valid():
            return self.respond(serializer.errors, status=400)

        requester_name = request.user.get_display_name()
        requester_link = absolute_uri(
            f"/organizations/{organization.slug}/projects/new/?referrer=request_project&category=mobile"
        )

        subject = _("%s thinks Sentry can help monitor your mobile app")

        msg = MessageBuilder(
            subject=subject % (requester_name),
            template="sentry/emails/requests/organization-project.txt",
            html_template="sentry/emails/requests/organization-project.html",
            type="organization.project.request",
            context={
                "requester_name": requester_name,
                "requester_link": requester_link,
            },
        )

        msg.send_async([serializer.validated_data["target_user_email"]])

        return self.respond(status=201)
