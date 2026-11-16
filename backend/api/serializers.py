from rest_framework import serializers
from .models import Chore, Freeze


class ChoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chore
        fields = ["id", "description", "due_date", "due_time", "status", "points"]
        read_only_fields = ["id"]


class FreezeSerializer(serializers.ModelSerializer):
    days = serializers.IntegerField(read_only=True)
    shifted_count = serializers.SerializerMethodField()

    class Meta:
        model = Freeze
        fields = ["start_date", "end_date", "days", "shifted_count"]

    def get_shifted_count(self, freeze):
        return freeze.shifted_chores.count()

    def validate(self, data):
        # A freeze has to end on or after the day it starts
        if data["end_date"] < data["start_date"]:
            raise serializers.ValidationError({"end_date": "The freeze must end on or after its start date."})
        return data


class EndFreezeSerializer(serializers.Serializer):
    # The user's local date, since the server's date may be different in another time zone
    today = serializers.DateField()
