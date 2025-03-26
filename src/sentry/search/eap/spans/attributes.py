from sentry_protos.snuba.v1.trace_item_attribute_pb2 import VirtualColumnContext

from sentry.search.eap import constants
from sentry.search.eap.columns import (
    ResolvedAttribute,
    VirtualColumnDefinition,
    datetime_processor,
    project_context_constructor,
    project_term_resolver,
    simple_measurements_field,
    simple_sentry_field,
)
from sentry.search.eap.common_columns import COMMON_COLUMNS
from sentry.search.events.constants import (
    PRECISE_FINISH_TS,
    PRECISE_START_TS,
    SPAN_MODULE_CATEGORY_VALUES,
)
from sentry.search.events.types import SnubaParams
from sentry.search.utils import DEVICE_CLASS
from sentry.utils.validators import is_event_id, is_span_id


def validate_event_id(value: str | list[str]) -> bool:
    if isinstance(value, list):
        return all([is_event_id(item) for item in value])
    else:
        return is_event_id(value)


SPAN_ATTRIBUTE_DEFINITIONS = {
    column.public_alias: column
    for column in COMMON_COLUMNS
    + [
        ResolvedAttribute(
            public_alias="id",
            internal_name="sentry.span_id",
            search_type="string",
            validator=is_span_id,
        ),
        ResolvedAttribute(
            public_alias="parent_span",
            internal_name="sentry.parent_span_id",
            search_type="string",
            validator=is_span_id,
        ),
        ResolvedAttribute(
            public_alias="span.action",
            internal_name="sentry.action",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="span.description",
            internal_name="sentry.name",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="description",
            internal_name="sentry.name",
            search_type="string",
            secondary_alias=True,
        ),
        ResolvedAttribute(
            public_alias="sentry.normalized_description",
            internal_name="sentry.description",
            search_type="string",
        ),
        # Message maps to description, this is to allow wildcard searching
        ResolvedAttribute(
            public_alias="message",
            internal_name="sentry.name",
            search_type="string",
            secondary_alias=True,
        ),
        ResolvedAttribute(
            public_alias="span.domain",
            internal_name="sentry.domain",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="span.group",
            internal_name="sentry.group",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="span.op",
            internal_name="sentry.op",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="span.category",
            internal_name="sentry.category",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="span.self_time",
            internal_name="sentry.exclusive_time_ms",
            search_type="millisecond",
        ),
        ResolvedAttribute(
            public_alias="span.duration",
            internal_name="sentry.duration_ms",
            search_type="millisecond",
        ),
        ResolvedAttribute(
            public_alias="span.status",
            internal_name="sentry.status",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="span.status_code",
            internal_name="sentry.status_code",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="trace",
            internal_name="sentry.trace_id",
            search_type="string",
            validator=validate_event_id,
        ),
        ResolvedAttribute(
            public_alias="transaction",
            internal_name="sentry.segment_name",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="is_transaction",
            internal_name="sentry.is_segment",
            search_type="boolean",
        ),
        ResolvedAttribute(
            public_alias="transaction.span_id",
            internal_name="sentry.segment_id",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="profile.id",
            internal_name="sentry.profile_id",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="profiler.id",
            internal_name="profiler_id",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="thread.id",
            internal_name="thread.id",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="thread.name",
            internal_name="thread.name",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="replay.id",
            internal_name="sentry.replay_id",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="span.ai.pipeline.group",
            internal_name="sentry.ai_pipeline_group",
            search_type="string",
        ),
        ResolvedAttribute(
            public_alias="ai.total_tokens.used",
            internal_name="ai_total_tokens_used",
            search_type="number",
        ),
        ResolvedAttribute(
            public_alias="ai.total_cost",
            internal_name="ai.total_cost",
            search_type="number",
        ),
        ResolvedAttribute(
            public_alias="http.decoded_response_content_length",
            internal_name="http.decoded_response_content_length",
            search_type="byte",
        ),
        ResolvedAttribute(
            public_alias="http.response_content_length",
            internal_name="http.response_content_length",
            search_type="byte",
        ),
        ResolvedAttribute(
            public_alias="http.response_transfer_size",
            internal_name="http.response_transfer_size",
            search_type="byte",
        ),
        ResolvedAttribute(
            public_alias="sampling_rate",
            internal_name="sentry.sampling_factor",
            search_type="percentage",
        ),
        ResolvedAttribute(
            public_alias="timestamp",
            internal_name="sentry.timestamp",
            search_type="string",
            processor=datetime_processor,
        ),
        ResolvedAttribute(
            public_alias="cache.hit",
            internal_name="cache.hit",
            search_type="boolean",
        ),
        ResolvedAttribute(
            public_alias=PRECISE_START_TS,
            internal_name="sentry.start_timestamp",
            search_type="number",
        ),
        ResolvedAttribute(
            public_alias=PRECISE_FINISH_TS,
            internal_name="sentry.end_timestamp",
            search_type="number",
        ),
        ResolvedAttribute(
            public_alias="mobile.frames_delay",
            internal_name="frames.delay",
            search_type="second",
        ),
        ResolvedAttribute(
            public_alias="mobile.frames_slow",
            internal_name="frames.slow",
            search_type="number",
        ),
        ResolvedAttribute(
            public_alias="mobile.frames_frozen",
            internal_name="frames.frozen",
            search_type="number",
        ),
        ResolvedAttribute(
            public_alias="mobile.frames_total",
            internal_name="frames.total",
            search_type="number",
        ),
        # These fields are extracted from span measurements but were accessed
        # 2 ways, with + without the measurements. prefix. So expose both for compatibility.
        simple_measurements_field("cache.item_size", search_type="byte", secondary_alias=True),
        ResolvedAttribute(
            public_alias="cache.item_size",
            internal_name="cache.item_size",
            search_type="byte",
        ),
        simple_measurements_field(
            "messaging.message.body.size", search_type="byte", secondary_alias=True
        ),
        ResolvedAttribute(
            public_alias="messaging.message.body.size",
            internal_name="messaging.message.body.size",
            search_type="byte",
        ),
        simple_measurements_field(
            "messaging.message.receive.latency", search_type="millisecond", secondary_alias=True
        ),
        ResolvedAttribute(
            public_alias="messaging.message.receive.latency",
            internal_name="messaging.message.receive.latency",
            search_type="millisecond",
        ),
        simple_measurements_field("messaging.message.retry.count", secondary_alias=True),
        ResolvedAttribute(
            public_alias="messaging.message.retry.count",
            internal_name="messaging.message.retry.count",
            search_type="number",
        ),
        ResolvedAttribute(
            public_alias="spans.browser",
            internal_name="sentry.span_ops.ops.browser",
            search_type="millisecond",
        ),
        ResolvedAttribute(
            public_alias="spans.db",
            internal_name="sentry.span_ops.ops.db",
            search_type="millisecond",
        ),
        ResolvedAttribute(
            public_alias="spans.http",
            internal_name="sentry.span_ops.ops.http",
            search_type="millisecond",
        ),
        ResolvedAttribute(
            public_alias="spans.resource",
            internal_name="sentry.span_ops.ops.resource",
            search_type="millisecond",
        ),
        ResolvedAttribute(
            public_alias="spans.ui",
            internal_name="sentry.span_ops.ops.ui",
            search_type="millisecond",
        ),
        ResolvedAttribute(
            public_alias="span.system",
            internal_name="db.system",
            search_type="string",
            secondary_alias=True,
        ),
        simple_sentry_field("browser.name"),
        simple_sentry_field("environment"),
        simple_sentry_field("messaging.destination.name"),
        simple_sentry_field("messaging.message.id"),
        simple_sentry_field("platform"),
        simple_sentry_field("raw_domain"),
        simple_sentry_field("release"),
        simple_sentry_field("sdk.name"),
        simple_sentry_field("sdk.version"),
        simple_sentry_field("span_id"),
        simple_sentry_field("trace.status"),
        simple_sentry_field("transaction.method"),
        simple_sentry_field("transaction.op"),
        simple_sentry_field("user"),
        simple_sentry_field("user.email"),
        simple_sentry_field("user.geo.country_code"),
        simple_sentry_field("user.geo.subregion"),
        simple_sentry_field("user.id"),
        simple_sentry_field("user.ip"),
        simple_sentry_field("user.username"),
        simple_measurements_field("app_start_cold", "millisecond"),
        simple_measurements_field("app_start_warm", "millisecond"),
        simple_measurements_field("frames_frozen"),
        simple_measurements_field("frames_frozen_rate", "percentage"),
        simple_measurements_field("frames_slow"),
        simple_measurements_field("frames_slow_rate", "percentage"),
        simple_measurements_field("frames_total"),
        simple_measurements_field("time_to_initial_display", "millisecond"),
        simple_measurements_field("time_to_full_display", "millisecond"),
        simple_measurements_field("stall_count"),
        simple_measurements_field("stall_percentage", "percentage"),
        simple_measurements_field("stall_stall_longest_time"),
        simple_measurements_field("stall_stall_total_time"),
        simple_measurements_field("cls"),
        simple_measurements_field("fcp", "millisecond"),
        simple_measurements_field("fid", "millisecond"),
        simple_measurements_field("fp", "millisecond"),
        simple_measurements_field("inp", "millisecond"),
        simple_measurements_field("lcp", "millisecond"),
        simple_measurements_field("ttfb", "millisecond"),
        simple_measurements_field("ttfb.requesttime", "millisecond"),
        simple_measurements_field("score.cls"),
        simple_measurements_field("score.fcp"),
        simple_measurements_field("score.fid"),
        simple_measurements_field("score.fp"),
        simple_measurements_field("score.inp"),
        simple_measurements_field("score.lcp"),
        simple_measurements_field("score.ttfb"),
        simple_measurements_field("score.total"),
        simple_measurements_field("score.ratio.cls"),
        simple_measurements_field("score.ratio.fcp"),
        simple_measurements_field("score.ratio.fid"),
        simple_measurements_field("score.ratio.fp"),
        simple_measurements_field("score.ratio.inp"),
        simple_measurements_field("score.ratio.lcp"),
        simple_measurements_field("score.ratio.ttfb"),
        simple_measurements_field("score.ratio.total"),
        simple_measurements_field("score.weight.cls"),
        simple_measurements_field("score.weight.fcp"),
        simple_measurements_field("score.weight.fid"),
        simple_measurements_field("score.weight.fp"),
        simple_measurements_field("score.weight.inp"),
        simple_measurements_field("score.weight.lcp"),
        simple_measurements_field("score.weight.ttfb"),
    ]
}


def device_class_context_constructor(params: SnubaParams) -> VirtualColumnContext:
    # EAP defaults to lower case `unknown`, but in querybuilder we used `Unknown`
    value_map = {"": "Unknown"}
    for device_class, values in DEVICE_CLASS.items():
        for value in values:
            value_map[value] = device_class
    return VirtualColumnContext(
        from_column_name="sentry.device.class",
        to_column_name="device.class",
        value_map=value_map,
    )


def module_context_constructor(params: SnubaParams) -> VirtualColumnContext:
    value_map = {key: key for key in SPAN_MODULE_CATEGORY_VALUES}
    return VirtualColumnContext(
        from_column_name="sentry.category",
        to_column_name="span.module",
        value_map=value_map,
    )


SPAN_VIRTUAL_CONTEXTS = {
    "device.class": VirtualColumnDefinition(
        constructor=device_class_context_constructor,
        filter_column="sentry.device.class",
        # TODO: need to change this so the VCC is using it too, but would require rewriting the term_resolver
        default_value="Unknown",
    ),
    "span.module": VirtualColumnDefinition(
        constructor=module_context_constructor,
    ),
}

for key in constants.PROJECT_FIELDS:
    SPAN_VIRTUAL_CONTEXTS[key] = VirtualColumnDefinition(
        constructor=project_context_constructor(key),
        term_resolver=project_term_resolver,
        filter_column="project.id",
    )
