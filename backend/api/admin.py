from django.contrib import admin
from .models import Chore
from .models import Reminder

@admin.register(Chore)
class ChoreAdmin(admin.ModelAdmin):
    list_display = ("description", "due_date", "due_time", "status", "points", "owner")
    fields = ("description", "due_date", "due_time", "status", "points", "owner")

@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ("chore", "owner", "created_at", "updated_at")
    fields = ("chore", "owner")
