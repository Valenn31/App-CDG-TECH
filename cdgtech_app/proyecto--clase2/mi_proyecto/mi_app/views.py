from django.shortcuts import render, get_object_or_404, redirect
from mi_app.models import Producto, Cliente
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth.views import LoginView
from django.contrib.auth.decorators import login_required
import json
from reportlab.pdfgen import canvas
from django.urls import reverse_lazy

class CustomLoginView(LoginView):
    template_name = 'mi_app/login.html'


@login_required
def lista_productos(request):
    productos = Producto.objects.all()
    clientes = Cliente.objects.all()
    return render(request, "mi_app/lista_productos.html", {
        "productos": productos,
        "clientes": clientes,
    })


@login_required
def eliminar_orden(request, orden_id):
    producto = get_object_or_404(Producto, id=orden_id)
    producto.delete()
    return redirect('lista_productos')


@csrf_exempt
@login_required
def editar_orden(request, producto_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            producto = Producto.objects.get(id=producto_id)

            producto.producto = data.get('producto', producto.producto)
            producto.marca = data.get('marca', producto.marca)
            producto.descripcion_problema = data.get('descripcion', producto.descripcion_problema)

            producto.save()
            return JsonResponse({'success': True})
        except Producto.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Producto no encontrado'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@login_required
def guardar_notas(request, id):
    try:
        data = json.loads(request.body)
        notas = data.get('notas_tecnicas')
        producto = Producto.objects.get(pk=id)
        producto.notas_tecnicas = notas
        producto.save()
        return JsonResponse({'success': True})
    except Producto.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Producto no encontrado'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@login_required
def crear_cliente(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            nombre = data.get("nombre")
            apellido = data.get("apellido")
            telefono = data.get("telefono")
            email = data.get("email")
            dni = data.get("dni")

            if not (nombre and apellido and telefono and dni):
                return JsonResponse({"success": False, "error": "Faltan campos obligatorios."})

            if Cliente.objects.filter(dni=dni).exists():
                return JsonResponse({"success": False, "error": "Ya existe un cliente con ese DNI."})

            cliente = Cliente.objects.create(
                nombre=nombre,
                apellido=apellido,
                telefono=telefono,
                email=email,
                dni=dni
            )

            return JsonResponse({
                "success": True,
                "cliente": {
                    "id": cliente.id,
                    "nombre": cliente.nombre,
                    "apellido": cliente.apellido,
                    "telefono": cliente.telefono,
                    "email": cliente.email,
                    "dni": cliente.dni
                }
            })
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})
    return JsonResponse({"success": False, "error": "Método no permitido."})


@csrf_exempt
@login_required
def agregar_producto(request):
    if request.method == "POST":
        data = json.loads(request.body)
        dni = data.get("dni")
        producto = data.get("producto")
        marca = data.get("marca")
        descripcion = data.get("descripcion_problema")

        if not (dni and producto and marca and descripcion):
            return JsonResponse({"success": False, "error": "Faltan campos obligatorios."})

        try:
            cliente = Cliente.objects.get(dni=dni)
        except Cliente.DoesNotExist:
            return JsonResponse({"success": False, "error": "Cliente no encontrado."})

        nuevo_producto = Producto.objects.create(
            cliente=cliente,
            producto=producto,
            marca=marca,
            descripcion_problema=descripcion
        )

        return JsonResponse({"success": True, "producto_id": nuevo_producto.id})
    return JsonResponse({"success": False, "error": "Método no permitido."})


@login_required
def buscar_cliente(request):
    query = request.GET.get('query', '')
    clientes = Cliente.objects.filter(nombre__icontains=query) | Cliente.objects.filter(dni__icontains=query)
    clientes_data = [{"id": cliente.id, "nombre": cliente.nombre, "apellido": cliente.apellido, "dni": cliente.dni} for cliente in clientes]
    return JsonResponse({"clientes": clientes_data})


@login_required
def generar_pdf_producto(request, producto_id):
    producto = Producto.objects.get(pk=producto_id)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="producto_{producto.id}.pdf"'

    p = canvas.Canvas(response)
    y = 800
    lineas = [
        f"ID: {producto.id}",
        f"Cliente: {producto.cliente.nombre} {producto.cliente.apellido}",
        f"DNI: {producto.cliente.dni}",
        f"Producto: {producto.producto}",
        f"Marca: {producto.marca}",
        f"Descripción del problema: {producto.descripcion_problema}",
        f"Notas técnicas: {producto.notas_tecnicas or 'Sin notas'}",
        f"Fecha de ingreso: {producto.fecha_ingreso.strftime('%d/%m/%Y')}",
        f"Estado: {producto.estado.title()}",
    ]

    for linea in lineas:
        p.drawString(100, y, linea)
        y -= 20

    p.showPage()
    p.save()
    return response


FLUJO_ESTADOS = [
    "por revisar",
    "en revision",
    "presupuestado",
    "aceptado",
    "no aceptado",
    "esperando repuestos",
    "en reparacion",
    "finalizado",
    "entregado",
    "cancelado",
    "entregado (cancelado)",
    {"cancelado": ["entregado (cancelado)"]}
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
    return None


@csrf_exempt
@login_required
def cambiar_estado(request):
    if request.method == "POST":
        data = json.loads(request.body)
        producto_id = data.get("producto_id")
        direccion = data.get("direccion")

        try:
            producto = Producto.objects.get(pk=producto_id)
        except Producto.DoesNotExist:
            return JsonResponse({"error": "Producto no encontrado"}, status=404)

        estado_actual = producto.estado

        if direccion == "siguiente":
            siguientes = obtener_siguientes_estados(estado_actual)
            if siguientes:
                producto.estado = siguientes[0]
                producto.save()
                return JsonResponse({"nuevo_estado": producto.estado})
            else:
                return JsonResponse({"error": "No hay más estados disponibles"})
        elif direccion == "anterior":
            anterior = obtener_estado_anterior(estado_actual)
            if anterior:
                producto.estado = anterior
                producto.save()
                return JsonResponse({"nuevo_estado": producto.estado})
            else:
                return JsonResponse({"error": "No se puede retroceder más"})
        else:
            return JsonResponse({"error": "Dirección no válida"})



@csrf_exempt
def editar_cliente(request, cliente_id):
    if request.method == "POST":
        datos = json.loads(request.body)
        try:
            cliente = Cliente.objects.get(id=cliente_id)
            nuevo_dni = datos.get("dni", cliente.dni)

            # Validar que el nuevo DNI no esté en otro cliente
            if Cliente.objects.filter(dni=nuevo_dni).exclude(id=cliente.id).exists():
                return JsonResponse({
                    "success": False,
                    "error": "Ya existe un cliente con ese DNI."
                })

            cliente.nombre = datos.get("nombre", cliente.nombre)
            cliente.apellido = datos.get("apellido", cliente.apellido)
            cliente.dni = nuevo_dni
            cliente.telefono = datos.get("telefono", cliente.telefono)
            cliente.email = datos.get("email", cliente.email)
            cliente.save()

            # WebSocket
            canal = get_channel_layer()
            async_to_sync(canal.group_send)(
                "productos",
                {
                    "type": "enviar_actualizacion",
                    "data": {
                        "tipo": "cliente_actualizado",
                        "id": cliente.id,
                        "nombre": cliente.nombre,
                        "apellido": cliente.apellido,
                        "dni": cliente.dni,
                        "telefono": cliente.telefono,
                        "email": cliente.email,
                    },
                }
            )

            return JsonResponse({"success": True})
        except Cliente.DoesNotExist:
            return JsonResponse({"success": False, "error": "Cliente no encontrado"})
    return JsonResponse({"success": False, "error": "Método no permitido"})



@require_GET
def verificar_dni(request):
    dni = request.GET.get("dni")
    cliente_id = request.GET.get("cliente_id")

    existe = Cliente.objects.filter(dni=dni).exclude(id=cliente_id).exists()
    return JsonResponse({"existe": existe})
