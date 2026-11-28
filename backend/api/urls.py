from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from . import views

urlpatterns = [
    path("login/", obtain_auth_token),
    path("freeze/", views.freeze, name="freeze"),
    path("freeze/end/", views.end_freeze, name="freeze-end"),
    path("chores/", views.chore_list),
    path("chores/<int:chore_id>/", views.chore_detail),
    path("chores/", views.chore_list, name="chore-create"),
    path("chores/", views.chore_list, name="chore-list"),
    path("chores/<int:chore_id>/", views.chore_detail, name="chore-detail"),
    path("chores/<int:chore_id>/", views.chore_detail, name="chore-delete"),
    path("reminders/", views.reminder_list, name="reminder-list"),
    path("rewards/", views.rewards, name="rewards"),
]
