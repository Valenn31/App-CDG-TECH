import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import mi_proyecto.routing  # este archivo routing.py lo tenés que crear

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mi_proyecto.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            mi_proyecto.routing.websocket_urlpatterns
        )
    ),
})
