from django.conf import settings
from django.contrib.auth.models import User
from django.db import models

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    preferred_sector = models.CharField(max_length=128, blank=True)
    investment_goal = models.CharField(max_length=256, blank=True)
    risk_tolerance = models.CharField(max_length=64, blank=True)

    def __str__(self):
        return self.user.username
