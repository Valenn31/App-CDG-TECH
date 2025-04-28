from django.contrib import admin
from mi_app.models import Cliente,Producto

from django.contrib.auth.admin import UserAdmin
from .models import Usuario
# Register your models here.

admin.site.register(Cliente)
admin.site.register(Producto)

class UsuarioAdmin(UserAdmin):
    # Campos que van a aparecer en el admin
    list_display = ('username', 'email', 'first_name', 'last_name', 'rol', 'is_staff')
    list_filter = ('rol', 'is_staff', 'is_superuser', 'is_active')

    # Campos editables en la ficha del usuario
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Información personal', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permisos', {'fields': ('rol', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas importantes', {'fields': ('last_login', 'date_joined')}),
    )

    # Campos para agregar un usuario nuevo
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'rol', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )

    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)

admin.site.register(Usuario, UsuarioAdmin)