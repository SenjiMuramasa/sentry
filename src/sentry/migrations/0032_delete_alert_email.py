# -*- coding: utf-8 -*-
# Generated by Django 1.11.27 on 2020-02-06 21:02

from django.db import migrations


def delete_alert_email_user_options(apps, schema_editor):
    """
    Processes user reports that are missing event data, and adds the appropriate data
    if the event exists in Clickhouse.
    """
    from sentry.utils.query import RangeQuerySetWrapperWithProgressBar

    UserOption = apps.get_model("sentry", "UserOption")

    """
    Seq Scan on sentry_useroption (cost=0.00..40142.93 rows=42564 width=65) (actual time=30.690..9720.536 rows=42407 loops=1)
    Filter: ((key)::text = 'alert_email'::text)
    Rows Removed by Filter: 1692315
    Planning time: 234.778 ms
    Execution time: 9730.608 ms
    """
    for user_option in RangeQuerySetWrapperWithProgressBar(UserOption.objects.all()):
        if user_option.key == "alert_email":
            user_option.delete()


class Migration(migrations.Migration):
    # This flag is used to mark that a migration shouldn't be automatically run in
    # production. We set this to True for operations that we think are risky and want
    # someone from ops to run manually and monitor.
    # General advice is that if in doubt, mark your migration as `is_dangerous`.
    # Some things you should always mark as dangerous:
    # - Large data migrations. Typically we want these to be run manually by ops so that
    #   they can be monitored. Since data migrations will now hold a transaction open
    #   this is even more important.
    # - Adding columns to highly active tables, even ones that are NULL.
    is_dangerous = False

    # This flag is used to decide whether to run this migration in a transaction or not.
    # By default we prefer to run in a transaction, but for migrations where you want
    # to `CREATE INDEX CONCURRENTLY` this needs to be set to False. Typically you'll
    # want to create an index concurrently when adding one to an existing table.
    atomic = False

    dependencies = [
        ("sentry", "0031_delete_alert_rules_and_incidents"),
    ]

    operations = [
        migrations.RunPython(delete_alert_email_user_options, migrations.RunPython.noop),
    ]
