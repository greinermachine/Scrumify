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
