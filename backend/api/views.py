import datetime

from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Chore, Freeze, Reminder
from .serializers import (
    ChoreSerializer,
    EndFreezeSerializer,
    FreezeSerializer,
    ReminderSerializer,
)


@api_view(["GET", "POST"])
def chore_list(request):
    chores = Chore.objects.filter(owner=request.user).order_by("id")
    if request.method == "POST":
        serializer = ChoreSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    serializer = ChoreSerializer(chores, many=True)
    return Response({"chores": serializer.data})
    
    
@api_view(["GET", "POST"])
def reminder_list(request):
    reminders = Reminder.objects.filter(
        owner=request.user
    ).select_related("chore").order_by("id")

    if request.method == "POST":
        serializer = ReminderSerializer(data=request.data)

        if serializer.is_valid():
            chore_id = serializer.validated_data["chore"].id

            try:
                chore = Chore.objects.get(
                    id=chore_id,
                    owner=request.user
                )
            except Chore.DoesNotExist:
                return Response(
                    {"error": "Chore not found"},
                    status=404
                )

            if Reminder.objects.filter(chore=chore).exists():
                return Response(
                    {"error": "This chore already has a reminder"},
                    status=400
                )

            with transaction.atomic():
                serializer.save(owner=request.user)

            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)

    serializer = ReminderSerializer(reminders, many=True)
    return Response({"reminders": serializer.data})


@api_view(["GET", "PUT", "PATCH", "DELETE"])
def chore_detail(request, chore_id):
    try:
        chore = Chore.objects.get(id=chore_id, owner=request.user)
    except Chore.DoesNotExist:
        return Response({"error": "Chore not found"}, status=404)

    if request.method == "GET":
        serializer = ChoreSerializer(chore)
        return Response(serializer.data)

    if request.method == "DELETE":
        chore.delete()
        return Response(status=204)

    serializer = ChoreSerializer(chore, data=request.data, partial=request.method == "PATCH")
    if serializer.is_valid():
        # A due date the user picks by hand shouldn't be moved again when a freeze ends early
        new_due = serializer.validated_data.get("due_date", chore.due_date)
        if new_due != chore.due_date:
            chore.frozen_by.clear()
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


def shift_due_dates(chores, days):
    for chore in chores:
        chore.due_date += datetime.timedelta(days=days)
        chore.save(update_fields=["due_date"])


@api_view(["GET", "POST"])
def freeze(request):
    # The signed-in user's freeze, or None if they have never started one
    current = Freeze.objects.filter(owner=request.user).first()

    if request.method == "GET":
        return Response({"freeze": FreezeSerializer(current).data if current else None})

    # POST starts a freeze
    serializer = FreezeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    if current and current.end_date >= serializer.validated_data["start_date"]:
        return Response({"error": "End your current freeze before starting a new one."}, status=400)

    with transaction.atomic():
        # An expired freeze already ran its full length, so its shifted due dates stay as they are
        if current:
            current.delete()
        new_freeze = serializer.save(owner=request.user)
        # Push back every unfinished chore that is due during or after the freeze
        # Chores that were already late before the freeze stay where they are and show as paused
        chores = list(Chore.objects.filter(
            owner=request.user, due_date__gte=new_freeze.start_date
        ).exclude(status="done"))
        shift_due_dates(chores, new_freeze.days)
        new_freeze.shifted_chores.set(chores)
    return Response(FreezeSerializer(new_freeze).data, status=201)


@api_view(["POST"])
def end_freeze(request):
    # Ends the freeze early, moving due dates forward by the days that weren't used
    serializer = EndFreezeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    today = serializer.validated_data["today"]

    current = Freeze.objects.filter(owner=request.user).first()
    if current is None:
        return Response(status=204)

    with transaction.atomic():
        # Tracking resumes today, so only the days before today were used
        # Ending on the day it started undoes the freeze completely
        used = min(max((today - current.start_date).days, 0), current.days)
        unused = current.days - used
        if unused:
            shift_due_dates(current.shifted_chores.all(), -unused)
        current.delete()
    return Response(status=204)
