from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

class AdminLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email_or_username = request.data.get("email")
        password = request.data.get("password")

        if not email_or_username or not password:
            return Response(
                {"detail": "Email/username and password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Nếu là email, tìm username tương ứng
        try:
            user_obj = User.objects.get(email=email_or_username)
            username = user_obj.username
        except User.DoesNotExist:
            username = email_or_username  # có thể là username luôn

        user = authenticate(username=username, password=password)

        if user and user.is_staff:
            return Response({
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name() or user.username,
                "role": "admin" if user.is_superuser else "manager",
            })

        return Response({"detail": "Invalid credentials or insufficient permissions"}, status=status.HTTP_401_UNAUTHORIZED)
