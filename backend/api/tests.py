import datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APITestCase
from django.urls import reverse

from .models import Chore, Freeze


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

    def test_completing_chores_adds_configured_points_to_the_owners_balance(self):
        url = reverse("chore-detail", args=[self.chore.pk])
        self.assertEqual(self.client.get(reverse("chore-list")).json()["points_balance"], 0)

        response = self.client.patch(url, {"status": "done"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "done")
        self.assertEqual(self.client.get(reverse("chore-list")).json()["points_balance"], 2)

        response = self.client.post(reverse("chore-create"), {
            "description": "Water plants",
            "due_date": "2026-10-26",
            "points": 5,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        second_url = reverse("chore-detail", args=[response.json()["id"]])
        response = self.client.put(second_url, {
            "description": "Water plants",
            "due_date": "2026-10-26",
            "status": "done",
            "points": 6,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(reverse("chore-list")).json()["points_balance"], 8)

        self.client.force_authenticate(user=self.bob)
        self.assertEqual(self.client.get(reverse("chore-list")).json()["points_balance"], 0)

    def test_award_survives_retries_edits_reopening_and_deletion(self):
        url = reverse("chore-detail", args=[self.chore.pk])
        list_url = reverse("chore-list")
        for changes in (
            {"status": "done"},
            {"status": "done"},
            {"points": 10},
            {"status": "todo"},
            {"status": "done"},
        ):
            with self.subTest(changes=changes):
                self.assertEqual(self.client.patch(url, changes, format="json").status_code, 200)
                self.assertEqual(self.client.get(list_url).json()["points_balance"], 2)

        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertEqual(self.client.get(list_url).json(), {"chores": [], "points_balance": 2})

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


class FreezeApiTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="alice-password")
        self.bob = User.objects.create_user(username="bob", password="bob-password")
        self.client.force_authenticate(user=self.alice)
        self.url = reverse("freeze")
        self.end_url = reverse("freeze-end")

    def make_chore(self, description, due, owner=None, status="todo"):
        return Chore.objects.create(
            description=description, due_date=due, owner=owner or self.alice, status=status
        )

    def start(self, start="2026-11-16", end="2026-11-22"):
        return self.client.post(self.url, {"start_date": start, "end_date": end}, format="json")

    def due(self, chore):
        chore.refresh_from_db()
        return chore.due_date

    def test_no_freeze_by_default(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"freeze": None})

    def test_start_freeze(self):
        self.make_chore("Vacuum", datetime.date(2026, 11, 20))
        response = self.start()
        self.assertEqual(response.status_code, 201)
        expected = {"start_date": "2026-11-16", "end_date": "2026-11-22", "days": 7, "shifted_count": 1}
        self.assertEqual(response.json(), expected)
        self.assertEqual(self.client.get(self.url).json(), {"freeze": expected})

    def test_start_pushes_unfinished_due_dates_back(self):
        during = self.make_chore("Vacuum", datetime.date(2026, 11, 20))
        first_day = self.make_chore("Dishes", datetime.date(2026, 11, 16))
        after = self.make_chore("Laundry", datetime.date(2026, 12, 1))
        self.start()
        # A 7 day freeze moves each due date 7 days later
        self.assertEqual(self.due(during), datetime.date(2026, 11, 27))
        self.assertEqual(self.due(first_day), datetime.date(2026, 11, 23))
        self.assertEqual(self.due(after), datetime.date(2026, 12, 8))

    def test_start_leaves_done_and_already_late_chores_alone(self):
        done = self.make_chore("Trash", datetime.date(2026, 11, 20), status="done")
        late = self.make_chore("Mow", datetime.date(2026, 11, 10))
        self.start()
        self.assertEqual(self.due(done), datetime.date(2026, 11, 20))
        self.assertEqual(self.due(late), datetime.date(2026, 11, 10))

    def test_start_leaves_other_users_chores_alone(self):
        bobs = self.make_chore("Feed the cat", datetime.date(2026, 11, 20), owner=self.bob)
        self.start()
        self.assertEqual(self.due(bobs), datetime.date(2026, 11, 20))

    def test_one_day_freeze_pushes_back_one_day(self):
        chore = self.make_chore("Vacuum", datetime.date(2026, 11, 16))
        response = self.start(end="2026-11-16")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.due(chore), datetime.date(2026, 11, 17))

    def test_end_before_start_is_rejected(self):
        chore = self.make_chore("Vacuum", datetime.date(2026, 11, 20))
        response = self.start(end="2026-11-15")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Freeze.objects.exists())
        self.assertEqual(self.due(chore), datetime.date(2026, 11, 20))

    def test_missing_dates_are_rejected(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_cannot_start_while_frozen(self):
        chore = self.make_chore("Vacuum", datetime.date(2026, 11, 20))
        self.start()
        response = self.start(start="2026-11-18", end="2026-11-25")
        self.assertEqual(response.status_code, 400)
        # The first freeze is untouched and the chore was only pushed back once
        self.assertEqual(Freeze.objects.get(owner=self.alice).end_date, datetime.date(2026, 11, 22))
        self.assertEqual(self.due(chore), datetime.date(2026, 11, 27))

    def test_expired_freeze_is_replaced_and_keeps_its_shift(self):
        chore = self.make_chore("Vacuum", datetime.date(2026, 11, 3))
        self.start(start="2026-11-01", end="2026-11-02")
        self.assertEqual(self.due(chore), datetime.date(2026, 11, 5))
        response = self.start(start="2026-11-16", end="2026-11-17")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Freeze.objects.filter(owner=self.alice).count(), 1)
        # Already late by the second freeze, so only the first freeze moved it
        self.assertEqual(self.due(chore), datetime.date(2026, 11, 5))

    def test_end_early_gives_back_unused_days(self):
        chore = self.make_chore("Vacuum", datetime.date(2026, 11, 20))
        self.start()  # Nov 16 to 22, pushed to Nov 27
        # Ending on Nov 19 means Nov 16, 17, and 18 were used
        response = self.client.post(self.end_url, {"today": "2026-11-19"}, format="json")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Freeze.objects.filter(owner=self.alice).exists())
        self.assertEqual(self.due(chore), datetime.date(2026, 11, 23))

    def test_end_on_start_day_undoes_the_freeze(self):
        chore = self.make_chore("Vacuum", datetime.date(2026, 11, 20))
        self.start()
        self.client.post(self.end_url, {"today": "2026-11-16"}, format="json")
        self.assertEqual(self.due(chore), datetime.date(2026, 11, 20))

    def test_end_after_freeze_finished_keeps_full_shift(self):
        chore = self.make_chore("Vacuum", datetime.date(2026, 11, 20))
        self.start()
        self.client.post(self.end_url, {"today": "2026-11-30"}, format="json")
        self.assertEqual(self.due(chore), datetime.date(2026, 11, 27))

    def test_end_early_skips_chores_added_or_rescheduled_during_freeze(self):
        moved = self.make_chore("Vacuum", datetime.date(2026, 11, 20))
        self.start()
        added = self.make_chore("New chore", datetime.date(2026, 11, 25))
        # The user picks a new due date by hand during the freeze
        self.client.patch(f"/api/chores/{moved.id}/", {"due_date": "2026-11-28"}, format="json")
        self.client.post(self.end_url, {"today": "2026-11-17"}, format="json")
        self.assertEqual(self.due(moved), datetime.date(2026, 11, 28))
        self.assertEqual(self.due(added), datetime.date(2026, 11, 25))

    def test_end_needs_today(self):
        self.start()
        response = self.client.post(self.end_url, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Freeze.objects.filter(owner=self.alice).exists())

    def test_ending_without_a_freeze_is_fine(self):
        response = self.client.post(self.end_url, {"today": "2026-11-16"}, format="json")
        self.assertEqual(response.status_code, 204)

    def test_freeze_only_affects_its_owner(self):
        Freeze.objects.create(
            owner=self.bob, start_date=datetime.date(2026, 11, 16), end_date=datetime.date(2026, 11, 22)
        )
        # Alice can't see Bob's freeze
        self.assertEqual(self.client.get(self.url).json(), {"freeze": None})
        # Alice ending her freeze doesn't end Bob's
        self.client.post(self.end_url, {"today": "2026-11-16"}, format="json")
        self.assertTrue(Freeze.objects.filter(owner=self.bob).exists())

    def test_must_be_signed_in(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(self.client.post(self.url, {}, format="json").status_code, 401)
        self.assertEqual(self.client.post(self.end_url, {}, format="json").status_code, 401)
