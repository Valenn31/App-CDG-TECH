from channels.generic.websocket import AsyncWebsocketConsumer

class ProductoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data="¡WebSocket conectado!")

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        # Procesar mensajes entrantes
        pass