from django.db import models
from django.core.validators import RegexValidator
import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Create your models here.

class Cliente(models.Model):
    nombre = models.CharField(max_length= 100)
    apellido = models.CharField(max_length= 100)
    telefono = models.CharField(max_length= 100)
    email = models.EmailField(blank=True, null=True)
    dni = models.CharField(max_length= 8,
                           unique=True,
                           validators=[
                               RegexValidator(
                                   regex=r'^\d{8}$',
                                   message="El dni debe tener 8 digitos!"
                               )
                           ]
    )
    #Esto hace que valide que el dni no tenga mas ni menos que 8 digitos
    
    def __str__(self):
        return f"{self.nombre} {self.apellido} - DNI: {self.dni}"
    
    
FLUJO_ESTADOS = [
    "por revisar",
    "en revision",
    "presupuestado",
    "aceptado",
    "no aceptado",
    "esperando repuestos",
    "en reparacion",
    "finalizado",
    "entregado",  # camino normal
    "cancelado",  # camino alternativo
    "entregado (cancelado)",  # camino alternativo
]

def obtener_siguientes_estados(actual):
    for i, paso in enumerate(FLUJO_ESTADOS):
        if isinstance(paso, str):
            if paso == actual and i + 1 < len(FLUJO_ESTADOS):
                siguiente = FLUJO_ESTADOS[i + 1]
                if isinstance(siguiente, str):
                    return [siguiente]
                elif isinstance(siguiente, dict):
                    return siguiente.get(actual, [])
    return []

def obtener_estado_anterior(actual):
    anterior = None
    for paso in FLUJO_ESTADOS:
        if isinstance(paso, str):
            if paso == actual:
                return anterior
            anterior = paso
        elif isinstance(paso, dict):
            for clave, opciones in paso.items():
                if isinstance(opciones, str):
                    if opciones == actual:
                        return clave
                elif isinstance(opciones, list):
                    if actual in opciones:
                        return clave
    return None


class Producto(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    producto = models.CharField(max_length=100)
    marca = models.CharField(max_length=100, default="Desconocida")
    descripcion_problema = models.TextField()
    notas_tecnicas = models.TextField(blank=True, null=True)
    fecha_ingreso = models.DateField(auto_now_add=True)
    estado = models.CharField(max_length=30, choices=[
        ("por revisar", "Por revisar"),
        ("en revision", "En revisión"),
        ("presupuestado", "Presupuestado"),
        ("aceptado", "Aceptado"),
        ("no aceptado", "No aceptado"),
        ("esperando repuestos", "Esperando repuestos"),
        ("en reparacion", "En reparación"),
        ("finalizado", "Finalizado"),
        ("entregado", "Entregado"),
        ("cancelado", "Cancelado"),
    ], default="por revisar")
    
    def __str__(self):
        return f"{self.cliente} - {self.producto} - {self.estado}"


class ProductosConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("productos", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("productos", self.channel_name)

    async def enviar_actualizacion(self, event):
        await self.send(text_data=json.dumps(event["data"]))