# mi_app/urls.py
from django.urls import path
from . import views
from .views import CustomLoginView
from django.contrib.auth.views import LogoutView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('productos/', views.lista_productos, name='lista_productos'),
    path('eliminar/<int:orden_id>/', views.eliminar_orden, name='eliminar_orden'),
    path('editar_orden/<int:producto_id>/', views.editar_orden, name='editar_orden'),
    path('guardar_notas/<int:id>/', views.guardar_notas, name='guardar_notas'),
    path('crear_cliente/', views.crear_cliente, name='crear_cliente'),
    path("agregar_producto/", views.agregar_producto, name="agregar_producto"),
    path('buscar_cliente/', views.buscar_cliente, name='buscar_cliente'),
    path('generar_pdf/<int:producto_id>/', views.generar_pdf_producto, name='generar_pdf'),
    path('cambiar-estado/', views.cambiar_estado, name='cambiar_estado'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('', views.lista_productos, name='home'),
    path('productos/', views.lista_productos, name='lista_productos'),
    path('editar_cliente/<int:cliente_id>/', views.editar_cliente, name='editar_cliente'),
    path("verificar_dni/", views.verificar_dni, name="verificar_dni"),

] 
