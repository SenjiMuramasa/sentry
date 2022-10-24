from sentry import features
from sentry.dynamic_sampling.utils import DEFAULT_BIASES


class DynamicSamplingFeatureMultiplexer:
    """
    This class is used to route Dynamic Sampling behaviour according to the feature flags listed here
    Essentially the logic is as follows:
    - The `organizations:server-side-sampling` feature flag is the main flag enabled for dynamic sampling both in
    sentry and in relay
    - The  `organizations:server-side-sampling-ui` feature flag is the flag that enables the old dynamic sampling
    behaviour which needs to be supported for backwards compatibility but is deprecated
    - The `organizations:dynamic-sampling-basic` feature flag is the flag that enables the new adaptive sampling
    """

    def __init__(self, project, user):
        # Feature flag that informs us that relay is handling DS rules
        self.allow_dynamic_sampling = features.has(
            "organizations:server-side-sampling", project.organization, actor=user
        )
        # Feature flag that informs us that the org is on the new AM2 plan and thereby have adaptive sampling enabled
        # TODO(ahmed): This needs to be renamed to `organizations:dynamic-sampling`
        self.current_dynamic_sampling = features.has(
            "organizations:dynamic-sampling-basic", project.organization, actor=user
        )
        # Flag responsible to inform us if the org was in the original LA/EA Dynamic Sampling
        # TODO(ahmed): This needs to be renamed to `organizations:dynamic-sampling-deprecated`
        self.deprecated_dynamic_sampling = features.has(
            "organizations:server-side-sampling-ui", project.organization, actor=user
        )

    @property
    def is_on_dynamic_sampling_deprecated(self):
        return (
            self.allow_dynamic_sampling
            and self.deprecated_dynamic_sampling
            and not self.current_dynamic_sampling
        )

    @property
    def is_on_dynamic_sampling(self):
        return self.allow_dynamic_sampling and self.current_dynamic_sampling

    @staticmethod
    def get_user_biases(user_set_biases):
        if user_set_biases is None:
            return DEFAULT_BIASES

        id_to_user_bias = {bias["id"]: bias for bias in user_set_biases}
        returned_biases = []
        for bias in DEFAULT_BIASES:
            if bias["id"] in id_to_user_bias:
                returned_biases.append(id_to_user_bias[bias["id"]])
            else:
                returned_biases.append(bias)
        return returned_biases

    @staticmethod
    def get_supported_biases_ids():
        return {bias["id"] for bias in DEFAULT_BIASES}
