from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Chore
from .serializers import ChoreSerializer


@api_view(["GET", "POST"])
def chore_list(request):
    # Only get the chores that belong to the signed-in user
    chores = Chore.objects.filter(owner=request.user).order_by("id")
    if request.method == "POST":
        serializer = ChoreSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    serializer = ChoreSerializer(chores, many=True)
    return Response({"chores": serializer.data})


@api_view(["GET", "PUT", "DELETE"])
def chore_detail(request, chore_id):
    # Look for the chore among the signed-in user's chores only
    # Treat another account's chore the same as a chore that doesn't exist
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

    # PUT: update the existing chore with the new values
    serializer = ChoreSerializer(chore, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)
