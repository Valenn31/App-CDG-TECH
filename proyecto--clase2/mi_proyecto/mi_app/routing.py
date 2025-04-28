from django.urls import re_path
from . import consumers

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter([
        re_path(r"^ws/productos/$", consumers.ProductoConsumer.as_asgi()),
    ]),
})