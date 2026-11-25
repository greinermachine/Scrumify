from rest_framework import serializers
from .models import Chore
from .models import Reminder

class ChoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chore
        fields = ["id", "description", "due_date", "due_time", "status", "points"]
        read_only_fields = ["id"]


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = [
            "id",
            "chore",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
