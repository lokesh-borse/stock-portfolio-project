import logging
import pandas as pd
import yfinance as yf

from celery import shared_task
from statsmodels.tsa.arima.model import ARIMA
from django.utils import timezone

from .models import BitcoinPrediction

logger = logging.getLogger(__name__)


@shared_task
def run_bitcoin_prediction():
    try:
        logger.info("Starting Bitcoin prediction task")

        # Fetch Bitcoin data
        btc = yf.download(
            "BTC-USD",
            interval="1h",
            period="60d",
            progress=False
        )

        if isinstance(btc.columns, pd.MultiIndex):
            data = btc[("Close", "BTC-USD")]
        else:
            data = btc["Close"]

        data = data.dropna()

        # Train ARIMA model
        model = ARIMA(data, order=(1, 1, 1))
        model_fit = model.fit()

        # Forecast next hour
        forecast = model_fit.forecast(steps=1)

        predicted_price = float(forecast.iloc[0])

        prediction_time = data.index[-1] + pd.Timedelta(hours=1)

        # Save to database
        BitcoinPrediction.objects.create(
            timestamp=prediction_time,
            predicted_price=predicted_price,
            model_used="ARIMA"
        )

        logger.info(f"Prediction saved: {predicted_price}")

        return predicted_price

    except Exception as e:
        logger.error(f"Prediction task failed: {str(e)}")
        raise