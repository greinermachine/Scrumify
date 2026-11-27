from django.contrib.auth.models import User
from django.db import models, router, transaction
import datetime


class Chore(models.Model):
    STATUS_CHOICES = [
        ("todo", "To Do"),
        ("in_progress", "In Progress"),
        ("done", "Done"),
    ]

    description = models.CharField(max_length=255)
    due_date = models.DateField()
    due_time = models.TimeField(default=datetime.time(12, 0))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="todo")
    points = models.IntegerField(default=0)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    def save(self, *, force_insert=False, force_update=False, using=None, update_fields=None):
        using = using or router.db_for_write(type(self), instance=self)
        with transaction.atomic(using=using):
            super().save(
                force_insert=force_insert, force_update=force_update,
                using=using, update_fields=update_fields,
            )
            # Use the stored values because a partial save can leave other fields untouched.
            completed = Chore.objects.using(using).filter(pk=self.pk, status="done").values(
                "owner_id", "points"
            ).first()
            if completed is not None:
                ChorePointAward.objects.using(using).get_or_create(
                    chore_id=self.pk, defaults=completed,
                )

    def __str__(self):
        return self.description


class ChorePointAward(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    # Keep earned points in the balance even if the completed chore is deleted.
    chore = models.OneToOneField(Chore, on_delete=models.SET_NULL, null=True)
    points = models.IntegerField()


class Reminder(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    chore = models.OneToOneField(
        Chore,
        on_delete=models.CASCADE,
        related_name="reminder",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Reminder for {self.chore}"

class Freeze(models.Model):
    # A user's routine freeze, while it is active late chores are paused instead of overdue
    # Starting a freeze pushes unfinished chores' due dates back by the length of the freeze
    # Each user has at most one freeze, an expired one is replaced by the next
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name="freeze")
    start_date = models.DateField()
    end_date = models.DateField()
    # The chores whose due dates this freeze pushed back, so ending early can move them forward again
    shifted_chores = models.ManyToManyField(Chore, blank=True, related_name="frozen_by")

    @property
    def days(self):
        # Both dates are included, so a freeze from Monday to Monday is 1 day
        return (self.end_date - self.start_date).days + 1

    def __str__(self):
        return f"{self.owner} frozen {self.start_date} to {self.end_date}"
