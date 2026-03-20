from django.contrib.auth.models import User
from rest_framework import serializers

class UserSerializer(serializers.ModelSerializer):
    preferred_sector = serializers.CharField(source='profile.preferred_sector', allow_null=True, allow_blank=True, required=False)
    investment_goal = serializers.CharField(source='profile.investment_goal', allow_null=True, allow_blank=True, required=False)
    risk_tolerance = serializers.CharField(source='profile.risk_tolerance', allow_null=True, allow_blank=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'preferred_sector', 'investment_goal', 'risk_tolerance']

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=4)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()
