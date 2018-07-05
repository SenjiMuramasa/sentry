const PROMOTED_TAGS = [
  {name: 'level', type: 'string'},
  {name: 'logger', type: 'string'},
  {name: 'server_name', type: 'string'},
  {name: 'transaction', type: 'string'},
  {name: 'environment', type: 'string'},
  {name: 'site', type: 'string'},
  {name: 'url', type: 'string'},
  {name: 'app_device', type: 'string'},
  {name: 'device', type: 'string'},
  {name: 'device_family', type: 'string'},
  {name: 'runtime', type: 'string'},
  {name: 'runtime_name', type: 'string'},
  {name: 'browser', type: 'string'},
  {name: 'browser_name', type: 'string'},
  {name: 'os', type: 'string'},
  {name: 'os_name', type: 'string'},
  {name: 'os_rooted', type: 'number'},
];

const COLUMNS = [
  {name: 'os_build', type: 'string'},
  {name: 'os_kernel_version', type: 'string'},
  {name: 'device_name', type: 'string'},
  {name: 'device_brand', type: 'string'},
  {name: 'device_locale', type: 'string'},
  {name: 'device_uuid', type: 'string'},
  {name: 'device_model_id', type: 'string'},
  {name: 'device_arch', type: 'string'},
  {name: 'device_battery_level', type: 'number'},
  {name: 'device_orientation', type: 'string'},
  {name: 'device_simulator', type: 'string'},
  {name: 'device_online', type: 'string'},
  {name: 'device_charging', type: 'string'},
  {name: 'event_id', type: 'string'},
  {name: 'project_id', type: 'string'},
  {name: 'timestamp', type: 'string'}, // TODO: handling datetime as string for now
  {name: 'deleted', type: 'number'},
  {name: 'retention_days', type: 'number'},
  {name: 'platform', type: 'string'},
  {name: 'message', type: 'string'},
  {name: 'primary_hash', type: 'string'},
  {name: 'received', type: 'string'}, // TODO: handling datetime as string for now
  {name: 'user_id', type: 'string'},
  {name: 'username', type: 'string'},
  {name: 'email', type: 'string'},
  {name: 'ip_address', type: 'string'},
  {name: 'sdk_name', type: 'string'},
  {name: 'sdk_version', type: 'string'},
  {name: 'tags.key', type: 'string'},
  {name: 'tags.value', type: 'string'},
  {name: 'contexts.key', type: 'string'},
  {name: 'contexts.value', type: 'string'},
  {name: 'http_method', type: 'string'},
  {name: 'http_referer', type: 'string'},
  {name: 'exception_stacks.type', type: 'string'},
  {name: 'exception_stacks.value', type: 'string'},
  {name: 'exception_stacks.mechanism_type', type: 'string'},
  {name: 'exception_stacks.mechanism_handled', type: 'string'},
  {name: 'exception_frames.abs_path', type: 'string'},
  {name: 'exception_frames.filename', type: 'string'},
  {name: 'exception_frames.package', type: 'string'},
  {name: 'exception_frames.module', type: 'string'},
  {name: 'exception_frames.function', type: 'string'},
  {name: 'exception_frames.in_app', type: 'number'},
  {name: 'exception_frames.colno', type: 'number'},
  {name: 'exception_frames.lineno', type: 'number'},
  {name: 'exception_frames.stack_level', type: 'string'},
];

const CONDITION_OPERATORS = [
  '>',
  '<',
  '>=',
  '<=',
  '=',
  '!=',
  // 'IN', commented out since condition input doesn't support arrays yet :(
  'IS NULL',
  'IS NOT NULL',
  'LIKE',
];

const TOPK_COUNTS = [5, 10, 20, 50, 100];

export {COLUMNS, PROMOTED_TAGS, CONDITION_OPERATORS, TOPK_COUNTS};
