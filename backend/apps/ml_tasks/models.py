from django.db import models


class BitcoinPrediction(models.Model):
    timestamp = models.DateTimeField()
    predicted_price = models.FloatField()
    model_used = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.timestamp} - {self.predicted_price}"