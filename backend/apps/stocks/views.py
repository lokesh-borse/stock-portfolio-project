from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from django.db.models import Q
from .models import Stock
from .serializers import StockSerializer
from services.stock_service import get_live_quote, get_history, search_symbols, get_stock_profile

class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all().order_by('symbol')
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return super().get_permissions()

@api_view(['GET'])
@permission_classes([AllowAny])
def stocks_search(request):
    q = request.query_params.get('q', '')
    qs = Stock.objects.filter(Q(symbol__icontains=q) | Q(name__icontains=q))[:20]
    return Response(StockSerializer(qs, many=True).data)

@api_view(['GET'])
@permission_classes([AllowAny])
def live_search(request):
    q = request.query_params.get('q', '')
    limit = int(request.query_params.get('limit', 10))
    results = search_symbols(q, limit=limit)
    return Response(results)

@api_view(['GET'])
@permission_classes([AllowAny])
def live_detail(request):
    symbol = request.query_params.get('symbol')
    if not symbol:
        return Response({'detail': 'symbol required'}, status=status.HTTP_400_BAD_REQUEST)
    live_data = get_live_quote(symbol)
    profile_data = get_stock_profile(symbol)
    if not live_data and not profile_data:
        return Response({'detail': 'no data'}, status=status.HTTP_404_NOT_FOUND)
    return Response({**(profile_data or {}), **(live_data or {})})

@api_view(['GET'])
@permission_classes([AllowAny])
def historical(request):
    symbol = request.query_params.get('symbol')
    period = request.query_params.get('period', '1y')
    interval = request.query_params.get('interval', '1d')
    if not symbol:
        return Response({'detail': 'symbol required'}, status=status.HTTP_400_BAD_REQUEST)
    data = get_history(symbol, period=period, interval=interval)
    return Response({'symbol': symbol, 'period': period, 'interval': interval, 'prices': data})
