from collections.abc import Mapping, MutableMapping, Sequence
from typing import Any, cast

from django.contrib.auth.models import AnonymousUser

from sentry.models.organizationmember import OrganizationMember
from sentry.users.models.user import User
from sentry.users.services.user.model import RpcUser

from ..base import OrganizationMemberSerializer
from ..response import OrganizationMemberWithTeamsResponse
from ..utils import get_teams_by_organization_member_id


class OrganizationMemberWithTeamsSerializer(OrganizationMemberSerializer):
    def get_attrs(
        self,
        item_list: Sequence[OrganizationMember],
        user: User | RpcUser | AnonymousUser,
        **kwargs: Any,
    ) -> MutableMapping[OrganizationMember, MutableMapping[str, Any]]:
        attrs = super().get_attrs(item_list, user)
        teams, teams_with_role = get_teams_by_organization_member_id(item_list)

        for item in item_list:
            try:
                attrs[item]["teams"] = teams.get(item.id, [])  # Deprecated
                attrs[item]["teamRoles"] = teams_with_role.get(item.id, [])
            except KeyError:
                attrs[item] = {
                    "teams": teams,  # Deprecated
                    "teamRoles": teams_with_role,
                }

        return attrs

    def serialize(
        self,
        obj: OrganizationMember,
        attrs: Mapping[str, Any],
        user: User | RpcUser | AnonymousUser,
        **kwargs: Any,
    ) -> OrganizationMemberWithTeamsResponse:
        d = cast(OrganizationMemberWithTeamsResponse, super().serialize(obj, attrs, user))
        d["teams"] = attrs.get("teams", [])  # Deprecated
        d["teamRoles"] = attrs.get("teamRoles", [])
        return d
