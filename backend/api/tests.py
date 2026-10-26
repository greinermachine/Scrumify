import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APITestCase
from django.urls import reverse

from .models import Chore


class ChoreTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="alice-password")

    def test_save_and_get_chore(self):
        chore = Chore(
            description="Take out the trash",
            due_date=datetime.date(2026, 10, 20),
            status="todo",
            points=3,
            owner=self.user,
        )
        chore.save()

        saved = Chore.objects.get(id=chore.id)
        self.assertEqual(saved.description, "Take out the trash")
        self.assertEqual(saved.due_date, datetime.date(2026, 10, 20))
        self.assertEqual(saved.status, "todo")
        self.assertEqual(saved.points, 3)
        self.assertEqual(saved.owner, self.user)

    def test_default_status_and_points(self):
        chore = Chore.objects.create(
            description="Wash dishes",
            due_date=datetime.date(2026, 10, 21),
            owner=self.user,
        )
        saved = Chore.objects.get(id=chore.id)
        self.assertEqual(saved.status, "todo")
        self.assertEqual(saved.points, 0)

    def test_update_status(self):
        chore = Chore.objects.create(
            description="Vacuum",
            due_date=datetime.date(2026, 10, 22),
            points=5,
            owner=self.user,
        )
        chore.status = "done"
        chore.save()

        saved = Chore.objects.get(id=chore.id)
        self.assertEqual(saved.status, "done")

    def test_string_is_description(self):
        chore = Chore.objects.create(
            description="Do laundry",
            due_date=datetime.date(2026, 10, 23),
            owner=self.user,
        )
        self.assertEqual(str(chore), "Do laundry")


class ChoreApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="alice-password")
        self.bob = User.objects.create_user(username="bob", password="bob-password")
        self.chore = Chore.objects.create(
            description="Mow the lawn",
            due_date=datetime.date(2026, 10, 24),
            status="todo",
            points=2,
            owner=self.alice,
        )
        self.bobs_chore = Chore.objects.create(
            description="Feed the cat",
            due_date=datetime.date(2026, 10, 24),
            owner=self.bob,
        )
        # Sign in as Alice for every test unless the test says otherwise
        self.client.force_authenticate(user=self.alice)

    def test_list_chores(self):
        response = self.client.get("/api/chores/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["chores"]), 1)
        self.assertEqual(response.json()["chores"][0]["description"], "Mow the lawn")

    def test_edit_chore(self):
        new_values = {
            "description": "Mow the front lawn",
            "due_date": "2026-10-25",
            "status": "in_progress",
            "points": 4,
        }
        response = self.client.put(
            f"/api/chores/{self.chore.id}/",
            new_values,
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        # The same chore was changed, not replaced by a new one
        self.assertEqual(Chore.objects.filter(owner=self.alice).count(), 1)
        saved = Chore.objects.get(id=self.chore.id)
        self.assertEqual(saved.description, "Mow the front lawn")
        self.assertEqual(saved.due_date, datetime.date(2026, 10, 25))
        self.assertEqual(saved.status, "in_progress")
        self.assertEqual(saved.points, 4)
        self.assertEqual(saved.owner, self.alice)

    def test_edit_chore_with_bad_status(self):
        new_values = {
            "description": "Mow the lawn",
            "due_date": "2026-10-24",
            "status": "not_a_status",
            "points": 2,
        }
        response = self.client.put(
            f"/api/chores/{self.chore.id}/",
            new_values,
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        saved = Chore.objects.get(id=self.chore.id)
        self.assertEqual(saved.status, "todo")

    def test_edit_missing_chore(self):
        response = self.client.put("/api/chores/999/", {}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_cannot_read_other_users_chore(self):
        response = self.client.get(f"/api/chores/{self.bobs_chore.id}/")
        self.assertEqual(response.status_code, 404)

    def test_cannot_edit_other_users_chore(self):
        new_values = {
            "description": "Hacked",
            "due_date": "2026-10-24",
            "status": "done",
            "points": 100,
        }
        response = self.client.put(
            f"/api/chores/{self.bobs_chore.id}/",
            new_values,
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        saved = Chore.objects.get(id=self.bobs_chore.id)
        self.assertEqual(saved.description, "Feed the cat")

    def test_must_be_signed_in(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/chores/")
        self.assertEqual(response.status_code, 401)

    def test_login_gives_token(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/login/",
            {"username": "alice", "password": "alice-password"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.json())

    def test_login_with_wrong_password(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            "/api/login/",
            {"username": "alice", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_create_chore_belongs_to_signed_in_user(self):
        new_values = {"description": "Water plants", "due_date": "2026-10-26"}
        response = self.client.post("/api/chores/", new_values, format="json")
        self.assertEqual(response.status_code, 201)
        saved = Chore.objects.get(id=response.json()["id"])
        self.assertEqual(saved.owner, self.alice)


class ChoreDeleteTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="alice-password")
        self.client.force_authenticate(user=self.user)
        self.chore = Chore.objects.create(
            description="Wash dishes", due_date=datetime.date(2026, 10, 21), owner=self.user
        )
        self.delete_url = reverse("chore-delete", args=[self.chore.pk])

    def test_list_returns_chores(self):
        response = self.client.get(reverse("chore-list"))
        self.assertEqual(response.json()["chores"], [
            {
                "id": self.chore.pk,
                "description": self.chore.description,
                "due_date": "2026-10-21",
                "due_time": "12:00:00",
                "status": "todo",
                "points": 0,
            }
        ])

    def test_get_returns_chore(self):
        response = self.client.get(self.delete_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.chore.pk)

    def test_delete_updates_list_and_preserves_other_chores(self):
        other = Chore.objects.create(
            description="Vacuum", due_date=datetime.date(2026, 10, 22), owner=self.user
        )
        response = self.client.delete(self.delete_url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Chore.objects.filter(pk=self.chore.pk).exists())
        self.assertEqual(self.client.get(reverse("chore-list")).json()["chores"], [
            {
                "id": other.pk,
                "description": other.description,
                "due_date": "2026-10-22",
                "due_time": "12:00:00",
                "status": "todo",
                "points": 0,
            }
        ])

    def test_missing_chore_returns_404(self):
        url = reverse("chore-delete", args=[self.chore.pk + 1])
        self.assertEqual(self.client.delete(url).status_code, 404)
