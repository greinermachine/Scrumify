from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from .models import Chore
from .models import Reminder
from .serializers import ChoreSerializer
from .serializers import ReminderSerializer


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
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)
