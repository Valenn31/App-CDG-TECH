import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ProductosConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({
            'mensaje': '¡WebSocket conectado correctamente!'
        }))

    async def disconnect(self, close_code):
        print("WebSocket desconectado")

    async def receive(self, text_data):
        data = json.loads(text_data)
        mensaje = data.get('mensaje', '')
        print(f"Mensaje recibido del cliente: {mensaje}")

        # Responder al cliente
        await self.send(text_data=json.dumps({
            'respuesta': f"Servidor recibió: {mensaje}"
        }))
