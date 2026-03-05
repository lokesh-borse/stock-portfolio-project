from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Portfolio, PortfolioStock
from .serializers import PortfolioSerializer
from .linear_regression import predict_next_close
from .logistic_regression import predict_next_direction
from apps.stocks.models import Stock
from services.stock_service import get_stock_profile, get_history

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
