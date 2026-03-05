from tvDatafeed import TvDatafeed, Interval
import pandas as pd
import warnings
from statsmodels.tsa.arima.model import ARIMA

# Suppress warnings
warnings.filterwarnings("ignore")

print("Fetching Bitcoin 15-minute data from TradingView...")

# 1. Connect to TradingView
tv = TvDatafeed()

# 2. Download BTC 15-minute candles
btc = tv.get_hist(
    symbol='BTCUSDT',
    exchange='BINANCE',
    interval=Interval.in_15_minute,
    n_bars=500
)

# 3. Extract close price
data = btc['close'].dropna()

# 4. Ensure proper frequency
data = data.asfreq('15min')

print("Training ARIMA model (this may take a few seconds)...")

# 5. Train ARIMA
model = ARIMA(data, order=(1,1,1))
model_fit = model.fit()

# 6. Predict next 15 minutes
forecast = model_fit.forecast(steps=1)

# 7. Clean output
forecast_df = forecast.reset_index()
forecast_df.columns = ['Time', 'Predicted Price (USDT)']
forecast_df['Predicted Price (USDT)'] = forecast_df['Predicted Price (USDT)'].round(2)

print("\n--- Bitcoin Price Prediction (Next 15 Minutes) ---")
print(forecast_df.to_string(index=False))