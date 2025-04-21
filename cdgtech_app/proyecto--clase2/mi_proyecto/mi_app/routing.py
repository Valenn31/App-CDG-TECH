from django.urls import path
from .consumers import ProductosConsumer

websocket_urlpatterns = [
    path('ws/productos/', ProductosConsumer.as_asgi()),
]