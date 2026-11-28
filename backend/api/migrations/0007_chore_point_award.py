from itertools import batched

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def preserve_earned_points(apps, schema_editor):
    Chore = apps.get_model("api", "Chore")
    ChorePointAward = apps.get_model("api", "ChorePointAward")
    database = schema_editor.connection.alias

    completed = Chore.objects.using(database).filter(status="done").values_list(
        "pk", "owner_id", "points",
    )
    for chores in batched(completed.iterator(), 500):
        ChorePointAward.objects.using(database).bulk_create([
            ChorePointAward(chore_id=chore_id, owner_id=owner_id, points=points)
            for chore_id, owner_id, points in chores
        ])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_merge_20261127_1930"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ChorePointAward",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("points", models.IntegerField()),
                (
                    "chore",
                    models.OneToOneField(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="api.chore",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.RunPython(preserve_earned_points, migrations.RunPython.noop),
    ]
