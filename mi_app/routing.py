from django.urls import re_path
from mi_proyecto import consumers

websocket_urlpatterns = [
    re_path(r'ws/productos/$', consumers.ProductosConsumer.as_asgi()),
]
