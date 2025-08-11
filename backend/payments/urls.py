from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    path('create-checkout-session/', views.create_checkout_session, name='create_checkout_session'),
    path('create-checkout-session-from-cart/', views.create_checkout_session_from_cart, name='create_checkout_session_from_cart'),
    path('continue-payment/', views.continue_payment, name='continue_payment'),
    path('verify-payment/', views.verify_payment_and_create_order, name='verify_payment_and_create_order'),
    path('webhook/', views.stripe_webhook, name='stripe_webhook'),
    path('status/<str:order_id>/', views.payment_status, name='payment_status'),
    path('refund/', views.process_full_refund, name='process_full_refund'),
    path('refund-status/<str:order_id>/', views.refund_status, name='refund_status'),
]
