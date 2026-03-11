from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import UserProfile
from .serializers import UserSerializer, RegisterSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    if User.objects.filter(username=data['username']).exists():
        return Response({'detail': 'Username exists'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(email=data['email']).exists():
        return Response({'detail': 'Email exists'}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.create_user(username=data['username'], email=data['email'], password=data['password'])
    UserProfile.objects.create(user=user)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data})

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response({'detail': 'Logged out'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    return Response(UserSerializer(request.user).data)
