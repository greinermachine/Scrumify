from django.db.models import Sum

from .models import ChorePointAward, RewardRedemption


REWARDS = {
    "coffee": {"name": "$5 coffee shop gift card", "points": 50},
    "grocery": {"name": "$10 grocery gift card", "points": 100},
    "online": {"name": "$15 online gift card", "points": 150},
}


def points_balance(owner):
    earned = ChorePointAward.objects.filter(owner=owner).aggregate(total=Sum("points", default=0))["total"]
    spent = RewardRedemption.objects.filter(owner=owner).aggregate(total=Sum("points", default=0))["total"]
    return earned - spent
