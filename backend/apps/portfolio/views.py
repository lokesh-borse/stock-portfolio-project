from datetime import date, timedelta

import pandas as pd
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Portfolio, PortfolioStock, TimeSeriesForecast
from .serializers import PortfolioSerializer
from .linear_regression import predict_next_close
from .logistic_regression import predict_next_direction
from .time_series import forecast_arima
from apps.stocks.models import Stock
from services.stock_service import get_stock_profile, get_history, get_live_quote

class PortfolioViewSet(viewsets.ModelViewSet):
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user).prefetch_related('holdings__stock', 'holdings__stock__prices').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _close_prices_for_regression(self, holding):
        history = get_history(holding.stock.symbol, period='1y', interval='1d') or []
        api_prices = [
            float(row['close_price'])
            for row in history
            if row.get('close_price') is not None
        ]
        if len(api_prices) >= 2:
            return api_prices, 'yfinance'

        return [], 'yfinance'

    def _close_prices_for_logistic(self, holding):
        history = get_history(holding.stock.symbol, period='1y', interval='1d') or []
        return [
            float(row['close_price'])
            for row in history
            if row.get('close_price') is not None
        ]


    @action(detail=True, methods=['POST'], url_path='add-stock')
    def add_stock(self, request, pk=None):
        portfolio = self.get_object()
        symbol = (request.data.get('symbol') or '').upper().strip()
        if not symbol:
            return Response({'detail': 'symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            quantity = int(request.data.get('quantity', 0))
        except (TypeError, ValueError):
            return Response({'detail': 'quantity must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
        purchase_price = request.data.get('purchase_price', 0)
        purchase_date = request.data.get('purchase_date')
        profile = get_stock_profile(symbol) or {}
        stock_defaults = {
            'name': profile.get('name') or symbol,
            'sector': profile.get('sector') or '',
            'industry': profile.get('industry') or '',
            'market_cap': profile.get('market_cap'),
            'pe_ratio': profile.get('pe_ratio'),
            'dividend_yield': profile.get('dividend_yield'),
            '_52_week_high': profile.get('52_week_high'),
            '_52_week_low': profile.get('52_week_low'),
        }
        stock, created = Stock.objects.get_or_create(symbol=symbol, defaults=stock_defaults)
        if not created:
            for field, value in stock_defaults.items():
                if value not in (None, ''):
                    setattr(stock, field, value)
            stock.save()
        holding, _ = PortfolioStock.objects.get_or_create(portfolio=portfolio, stock=stock)
        holding.quantity = quantity
        holding.purchase_price = purchase_price
        holding.purchase_date = purchase_date
        holding.save()
        portfolio.refresh_from_db()
        return Response(PortfolioSerializer(portfolio).data)

    @action(detail=True, methods=['DELETE', 'POST'], url_path='remove-stock')
    def remove_stock(self, request, pk=None):
        portfolio = self.get_object()
        symbol = (request.data.get('symbol') or '').upper().strip()
        if not symbol:
            return Response({'detail': 'symbol is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            stock = Stock.objects.get(symbol=symbol)
        except Stock.DoesNotExist:
            return Response({'detail': 'Stock not found'}, status=status.HTTP_400_BAD_REQUEST)
        PortfolioStock.objects.filter(portfolio=portfolio, stock=stock).delete()
        return Response(PortfolioSerializer(portfolio).data)

    @action(detail=True, methods=['GET'], url_path='linear-regression')
    def linear_regression(self, request, pk=None):
        portfolio = self.get_object()
        holdings = (
            portfolio.holdings
            .select_related('stock')
            .prefetch_related('stock__prices')
            .all()
        )

        predictions = []
        skipped = []
        for holding in holdings:
            prices, source = self._close_prices_for_regression(holding)
            if len(prices) < 2:
                skipped.append(
                    {
                        'symbol': holding.stock.symbol,
                        'reason': 'Need at least 2 historical close prices from yfinance',
                    }
                )
                continue

            result = predict_next_close(prices=prices, symbol=holding.stock.symbol)
            predictions.append(
                {
                    'symbol': result.symbol,
                    'points_used': result.points_used,
                    'slope': result.slope,
                    'intercept': result.intercept,
                    'latest_close': result.latest_close,
                    'predicted_next_close': result.predicted_next_close,
                    'predicted_change_percent': result.predicted_change_percent,
                    'data_source': source,
                }
            )

        return Response(
            {
                'portfolio_id': portfolio.id,
                'portfolio_name': portfolio.name,
                'model': 'linear_regression',
                'predictions': predictions,
                'skipped': skipped,
            }
        )

    @action(detail=True, methods=['GET'], url_path='logistic-regression')
    def logistic_regression(self, request, pk=None):
        portfolio = self.get_object()
        holdings = (
            portfolio.holdings
            .select_related('stock')
            .all()
        )

        predictions = []
        skipped = []
        for holding in holdings:
            prices = self._close_prices_for_logistic(holding)
            if len(prices) < 35:
                skipped.append(
                    {
                        'symbol': holding.stock.symbol,
                        'reason': 'Need at least 35 close prices from yfinance',
                    }
                )
                continue

            try:
                result = predict_next_direction(prices, symbol=holding.stock.symbol)
            except ValueError as exc:
                skipped.append(
                    {
                        'symbol': holding.stock.symbol,
                        'reason': str(exc),
                    }
                )
                continue

            predictions.append(
                {
                    'symbol': result.symbol,
                    'points_used': result.points_used,
                    'positive_days': result.positive_days,
                    'test_accuracy': result.test_accuracy,
                    'probability_up_next_close': result.probability_up_next_close,
                    'signal': result.signal,
                    'data_source': 'yfinance',
                }
            )

        return Response(
            {
                'portfolio_id': portfolio.id,
                'portfolio_name': portfolio.name,
                'model': 'logistic_regression',
                'predictions': predictions,
                'skipped': skipped,
            }
        )

    @action(detail=True, methods=['POST'], url_path='time-series-forecast')
    def time_series_forecast(self, request, pk=None):
        portfolio = self.get_object()
        symbol = (request.data.get('symbol') or '').upper().strip()
        horizon_days_raw = request.data.get('horizon_days', 1)

        if not symbol:
            return Response({'detail': 'symbol is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            horizon_days = int(horizon_days_raw)
        except (TypeError, ValueError):
            return Response({'detail': 'horizon_days must be an integer (1 or 7)'}, status=status.HTTP_400_BAD_REQUEST)

        if horizon_days not in (1, 7):
            return Response({'detail': 'horizon_days must be 1 or 7'}, status=status.HTTP_400_BAD_REQUEST)

        holding = (
            portfolio.holdings
            .select_related('stock')
            .filter(stock__symbol=symbol)
            .first()
        )
        if not holding:
            return Response({'detail': 'Selected stock is not part of this portfolio'}, status=status.HTTP_400_BAD_REQUEST)

        history = get_history(symbol, period='2y', interval='1d') or []
        history = [h for h in history if h.get('close_price') is not None]
        if len(history) < 30:
            return Response({'detail': 'Need at least 30 historical close prices from yfinance'}, status=status.HTTP_400_BAD_REQUEST)

        prices = [float(h['close_price']) for h in history]
        result = forecast_arima(prices=prices, symbol=symbol)

        last_date_str = history[-1].get('date')
        try:
            last_date = date.fromisoformat(last_date_str)
        except Exception:
            last_date = date.today()

        future_dates = [d.date().isoformat() for d in pd.bdate_range(start=last_date + timedelta(days=1), periods=7)]
        forecast_7_points = [
            {'date': future_dates[idx], 'predicted_close': result.forecast_7[idx]}
            for idx in range(7)
        ]

        selected_forecast_points = forecast_7_points[:horizon_days]
        selected_prediction = {
            'horizon_days': horizon_days,
            'predicted_close': result.ts_1_close if horizon_days == 1 else result.ts_7_close,
            'predicted_change_percent': result.ts_1_change_percent if horizon_days == 1 else result.ts_7_change_percent,
        }

        history_points = [
            {'date': h['date'], 'close': float(h['close_price'])}
            for h in history[-120:]
        ]

        current_quote = get_live_quote(symbol) or {}
        current_price = current_quote.get('price')
        if current_price is None:
            current_price = result.latest_close

        forecast_record = TimeSeriesForecast.objects.create(
            portfolio=portfolio,
            stock=holding.stock,
            model_name='ARIMA',
            horizon_days=horizon_days,
            points_used=result.points_used,
            latest_close=result.latest_close,
            predicted_close=selected_prediction['predicted_close'],
            predicted_change_percent=selected_prediction['predicted_change_percent'],
            historical_points=history_points,
            prediction_points=selected_forecast_points,
        )

        return Response(
            {
                'forecast_id': forecast_record.id,
                'portfolio_id': portfolio.id,
                'portfolio_name': portfolio.name,
                'symbol': symbol,
                'model': 'ARIMA',
                'order': list(result.order),
                'points_used': result.points_used,
                'history': history_points,
                'selected_horizon_days': horizon_days,
                'selected_forecast': selected_forecast_points,
                'selected_prediction': selected_prediction,
                'ts_1': {
                    'horizon_days': 1,
                    'predicted_close': result.ts_1_close,
                    'predicted_change_percent': result.ts_1_change_percent,
                },
                'ts_7': {
                    'horizon_days': 7,
                    'predicted_close': result.ts_7_close,
                    'predicted_change_percent': result.ts_7_change_percent,
                },
                'stock_info': {
                    'stock_id': holding.stock.id,
                    'symbol': holding.stock.symbol,
                    'name': holding.stock.name,
                    'sector': holding.stock.sector,
                    'industry': holding.stock.industry,
                    'pe_ratio': holding.stock.pe_ratio,
                    'current_price': current_price,
                    'latest_close': result.latest_close,
                    'week_52_high': holding.stock._52_week_high,
                    'week_52_low': holding.stock._52_week_low,
                },
                'created_at': forecast_record.created_at,
            }
        )
