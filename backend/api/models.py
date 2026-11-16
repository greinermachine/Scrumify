from django.contrib.auth.models import User
from django.db import models
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

    def __str__(self):
        return self.description


class Freeze(models.Model):
    # A user's routine freeze, while it is active late chores are paused instead of overdue
    # Starting a freeze pushes unfinished chores' due dates back by the length of the freeze
    # Past freezes are kept, so chores that were due during one are never penalized
    # A user has at most one current freeze, the one with the latest start date
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="freezes")
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
