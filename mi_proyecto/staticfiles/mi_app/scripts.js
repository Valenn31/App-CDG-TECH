

document.addEventListener("DOMContentLoaded", function() {

function cambiarTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab[onclick="cambiarTab('${tab}')"]`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}


function toggleFormulario(id) {
    const form = document.getElementById(id);
    form.style.display = form.style.display === 'none' || form.style.display === '' ? 'block' : 'none';
}


function toggleDetalles(id) {
    const detalle = document.getElementById(`detalle-${id}`);
    const fila = document.getElementById(`fila-${id}`);

    // Evitar que el clic provenga de un botón dentro de la fila
    if (event.target.tagName === 'BUTTON' || event.target.closest('form') || event.target.classList.contains('icono-info')) {
        return;
    }

    if (detalle.style.display === 'none' || detalle.style.display === '') {
        detalle.style.display = 'block';
    } else {
        detalle.style.display = 'none';
    }
}


function mostrarFormulario(id) {
    const form = document.getElementById(`form-editar-${id}`);
    form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
}


function guardarNotasTecnicas(event, id) {
    event.preventDefault();
    const notas = document.getElementById(`notas-${id}`).value;

    fetch(`/guardar_notas/${id}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ notas_tecnicas: notas })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Notas guardadas ✅');

            // 🔁 ACTUALIZAR contenido del tooltip sin recargar
            const tooltip = document.querySelector(`#fila-${id} .tooltip-contenido`);
            if (tooltip) {
                tooltip.textContent = notas;
            }
        } else {
            alert('Error al guardar las notas ❌');
        }
    });
}


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Django CSRF
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


function enviarFormulario(event, id) {
    event.preventDefault();
    const form = document.getElementById(`form-editar-${id}`);
    const producto = form.querySelector('input[name="producto"]').value;
    const marca = form.querySelector('input[name="marca"]').value;
    const descripcion = form.querySelector('textarea[name="descripcion_problema"]').value;

    fetch(`/editar_orden/${id}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ producto, marca, descripcion })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Actualiza los valores de la fila en el DOM
            const filaProducto = document.getElementById(`fila-${id}`);
            if (filaProducto) {
                // Actualiza las celdas correspondientes
                filaProducto.querySelector(`#prod-nombre-${id}`).textContent = producto;
                filaProducto.querySelector(`#estado-${id}`).textContent = data.estado || 'Estado desconocido';
                filaProducto.querySelector(`#estado-${id}`).className = `estado ${data.estado | slugify}`; // Si el estado cambia
            }

            // Feedback visual para el botón de guardar
            const botonGuardar = document.querySelector(`#btn-guardar-${id}`);
            if (botonGuardar) {
                botonGuardar.textContent = 'Guardado ✅';
                botonGuardar.disabled = true;
                setTimeout(() => {
                    botonGuardar.textContent = 'Guardar';
                    botonGuardar.disabled = false;
                }, 1500);
            }

            alert("Cambios guardados correctamente.");
        } else {
            alert("No se pudo guardar.");
        }
    })
    .catch(error => {
        console.error("Error al guardar:", error);
        alert("Hubo un error al guardar.");
    });
}


document.querySelectorAll('.btn-guardar').forEach(button => {
    button.addEventListener('click', (event) => {
        event.preventDefault();

        const productoId = button.dataset.id;
        console.log(`Botón presionado para el producto ID: ${productoId}`);

        const form = document.getElementById(`form-editar-${productoId}`);
        if (!form) {
            console.error("Formulario no encontrado");
            return;
        }

        const producto = form.querySelector('input[name="producto"]').value;
        const marca = form.querySelector('input[name="marca"]').value;
        const descripcion = form.querySelector('textarea[name="descripcion_problema"]').value;

        fetch(`/editar_orden/${productoId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')  // Solo si usás CSRF token
            },
            body: JSON.stringify({ producto, marca, descripcion })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // ✅ Feedback visual sin modificar tamaño
                button.classList.add("guardado");
                button.textContent = "Guardado ✅";
                button.disabled = true;

                setTimeout(() => {
                    button.textContent = "Guardar";
                    button.disabled = false;
                    button.classList.remove("guardado");
                }, 1500);

                // 🔄 Actualiza DOM
                actualizarInformacionProducto(productoId, producto, marca, descripcion, data.estado);

                // 🔔 Enviar mensaje por WebSocket si está disponible
                if (typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ tipo: 'actualizacion', id: productoId }));
                }
            } else {
                alert("Error al guardar: " + (data.error || "Respuesta no exitosa."));
            }
        })
        .catch(error => {
            console.error("Error al enviar la solicitud:", error);
            alert("Hubo un error al guardar.");
        });
    });
});


function actualizarInformacionProducto(productoId, producto, marca, descripcion) {
    // Actualiza los elementos visuales que muestran la información del producto sin recargar la página

    // Actualiza los campos del formulario si es necesario
    const productoElement = document.querySelector(`#producto-${productoId}`);
    if (productoElement) {
        productoElement.textContent = producto;  // Asumiendo que esta es la celda que muestra el nombre del producto
    }

    const marcaElement = document.querySelector(`#marca-${productoId}`);
    if (marcaElement) {
        marcaElement.textContent = marca;  // Similar para la marca
    }

    const descripcionElement = document.querySelector(`#descripcion-${productoId}`);
    if (descripcionElement) {
        descripcionElement.textContent = descripcion;  // Para la descripción
    }
}


function crearProducto(event) {
    event.preventDefault();

    const form = document.getElementById('form-nuevo-producto');
    const dni = form.querySelector('input[name="dni"]').value;
    const producto = form.querySelector('input[name="producto"]').value;
    const marca = form.querySelector('input[name="marca"]').value;
    const descripcion = form.querySelector('textarea[name="descripcion_problema"]').value;

    fetch('/agregar_producto/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            dni: dni,
            producto: producto,
            marca: marca,
            descripcion_problema: descripcion
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("Producto agregado correctamente ✅");
            window.location.reload(); // o actualizas dinámicamente si preferís
        } else {
            alert("Error al agregar el producto: " + data.error);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Ocurrió un error al procesar la solicitud.");
    });
                
}

function crearCliente(event) {
    event.preventDefault();  // Evita que la página se recargue al enviar el formulario

    const form = document.getElementById('form-nuevo-cliente');
    const nombre = form.querySelector('input[name="nombre"]').value;
    const apellido = form.querySelector('input[name="apellido"]').value;
    const telefono = form.querySelector('input[name="telefono"]').value;
    const email = form.querySelector('input[name="email"]').value;
    const dni = form.querySelector('input[name="dni"]').value;

    fetch('/crear_cliente/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            nombre: nombre,
            apellido: apellido,
            telefono: telefono,
            email: email,
            dni: dni
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Cliente agregado correctamente ✅');

            // Aquí, puedes agregar el nuevo cliente a la tabla sin recargar la página
            const tablaClientes = document.querySelector('.tabla-clientes');
            const nuevaFila = document.createElement('div');
            nuevaFila.classList.add('fila');
            nuevaFila.innerHTML = `
                <div>${data.cliente.id}</div>
                <div>${data.cliente.nombre}</div>
                <div>${data.cliente.apellido}</div>
                <div>${data.cliente.telefono}</div>
                <div>${data.cliente.email}</div>
            `;
            tablaClientes.appendChild(nuevaFila);

            // Limpiar el formulario después de agregar el cliente
            form.reset();
        } else {
            alert("Error al agregar el cliente: " + data.error);
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Ocurrió un error al procesar la solicitud.");
    });
}


document.getElementById('cliente-buscar').addEventListener('input', function(event) {
    const query = event.target.value;
    if (query.length > 0) { // Solo hacer búsqueda si hay más de 2 caracteres
        fetch(`/buscar_cliente/?query=${query}`)
            .then(response => response.json())
            .then(data => {
                const resultadosDiv = document.getElementById('clientes-busqueda-resultados');
                resultadosDiv.innerHTML = ''; // Limpiar resultados previos
                if (data.clientes.length > 0) {
                    resultadosDiv.style.display = 'block';
                    data.clientes.forEach(cliente => {
                        const div = document.createElement('div');
                        div.textContent = `${cliente.nombre} ${cliente.apellido} - DNI: ${cliente.dni}`;
                        div.onclick = () => {
                            document.getElementById('cliente-buscar').value = `${cliente.nombre} ${cliente.apellido}`;
                            document.querySelector('input[name="dni"]').value = cliente.dni;
                            resultadosDiv.style.display = 'none';
                        };
                        resultadosDiv.appendChild(div);
                    });
                } else {
                    resultadosDiv.style.display = 'none';
                }
            });
    } else {
        document.getElementById('clientes-busqueda-resultados').style.display = 'none';
    }
});


function cambiarEstado(productoId, direccion) {
    const dir = direccion === 'avanzar' ? 'siguiente' : 'anterior';

    fetch('/cambiar-estado/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            producto_id: productoId,
            direccion: dir
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.nuevo_estado) {
            const texto = data.nuevo_estado.charAt(0).toUpperCase() + data.nuevo_estado.slice(1);

            // Cambia el texto visible
            const estadoFila = document.getElementById(`estado-${productoId}`);
            if (estadoFila) estadoFila.textContent = texto;

            const estadoDetalle = document.getElementById(`estado-detalle-${productoId}`);
            if (estadoDetalle) estadoDetalle.textContent = texto;

            // Cambia el color visual de la fila
            actualizarEstadoVisual(productoId, data.nuevo_estado);
        } else if (data.error) {
            alert(data.error);
        }
    })
    .catch(error => console.error('Error:', error));
}


function actualizarEstadoVisual(productoId, nuevoEstado) {
    const fila = document.getElementById(`fila-${productoId}`);
    if (!fila) return;

    // Quita clases anteriores que empiecen con "estado-"
    fila.className = fila.className
        .split(' ')
        .filter(c => !c.startsWith('estado-'))
        .join(' ');

    // Agrega la clase correspondiente
    fila.classList.add(`estado-${slugify(nuevoEstado)}`);
}


function slugify(texto) {
    return texto.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}


document.addEventListener('click', function(event) {
    const form = document.getElementById('form-nuevo-cliente');

    // Verificamos si el formulario está visible
    if (form && form.style.display === 'block') {
        // Si se hizo clic fuera del formulario, lo ocultamos
        if (!form.contains(event.target) && event.target.className !== 'boton_agregar') {
            form.style.display = 'none';
        }
    }
});

document.addEventListener('click', function(event) {
    const form = document.getElementById('form-nuevo-producto');
    // Verificamos si el formulario está visible
    if (form && form.style.display === 'block') {
        // Si se hizo clic fuera del formulario, lo ocultamos
        if (!form.contains(event.target) && event.target.className !== 'boton_agregar') {
            form.style.display = 'none';
        }
    }
});

function toggleDetallesCliente(clienteId) {
    const detalle = document.getElementById(`detalle-cliente-${clienteId}`);
    detalle.style.display = detalle.style.display === "none" ? "block" : "none";
}

function editarCliente(event, clienteId) {
    event.preventDefault();
    const form = event.target;
    
    // Datos a enviar al servidor
    const data = {
        nombre: form.nombre.value,
        apellido: form.apellido.value,
        dni: form.dni.value,
        telefono: form.telefono.value,
        email: form.email.value
    };

    // Animar el botón de guardar
    const botonGuardar = form.querySelector("button");
    botonGuardar.disabled = true; // Desactivar el botón
    botonGuardar.textContent = "Guardando... ⏳"; // Cambiar texto del botón

    fetch(`/editar_cliente/${clienteId}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": form.querySelector('[name=csrfmiddlewaretoken]').value
        },
        body: JSON.stringify(data)
    })
    .then(async resp => {
        if (!resp.ok) {
            const text = await resp.text(); // Leer como texto por si es HTML de error
            throw new Error(`Error del servidor (${resp.status}): ${text}`);
        }
        return resp.json();
    })
    .then(response => {
        if (response.success) {
            // Actualizar los valores del cliente en la vista
            document.getElementById(`cliente-nombre-${clienteId}`).innerText = `${data.nombre} ${data.apellido}`;
            document.getElementById(`cliente-dni-${clienteId}`).innerText = data.dni;
            document.getElementById(`cliente-telefono-${clienteId}`).innerText = data.telefono;
            document.getElementById(`cliente-email-${clienteId}`).innerText = data.email;

            // Cambiar texto del botón a "Guardado ✅"
            botonGuardar.textContent = "Guardado ✅";
            setTimeout(() => {
                botonGuardar.textContent = "Guardar cambios 💾";
                botonGuardar.disabled = false; // Rehabilitar el botón
            }, 1500);

            toggleDetallesCliente(clienteId); // Colapsar los detalles del cliente
            alert("Cliente actualizado ✅");
        } else {
            botonGuardar.textContent = "Guardar cambios 💾";
            botonGuardar.disabled = false;
            alert("⚠️ " + (response.error || "No se pudo actualizar"));
        }
    })
    .catch(error => {
        console.error("Error:", error);
        botonGuardar.textContent = "Guardar cambios 💾";
        botonGuardar.disabled = false;
        alert("⚠️ Ocurrió un error al actualizar el cliente.");
    });
}



const socket = new WebSocket("ws://" + window.location.host + "/ws/productos/");

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.tipo === "cliente_actualizado") {
        const id = data.id;
        document.getElementById(`cliente-nombre-${id}`).innerText = `${data.nombre} ${data.apellido}`;
        document.getElementById(`cliente-dni-${id}`).innerText = data.dni;
        document.getElementById(`cliente-telefono-${id}`).innerText = data.telefono;
        document.getElementById(`cliente-email-${id}`).innerText = data.email;
        console.log("Cliente actualizado por WebSocket");
    }
};

function validarDni(clienteId) {
    const dniInput = document.getElementById(`dni-input-${clienteId}`);
    const guardarBtn = document.getElementById(`btn-guardar-${clienteId}`);
    const errorText = document.getElementById(`dni-error-${clienteId}`);
    const dni = dniInput.value;

    // Si no tiene 8 dígitos, ni consultamos
    if (!/^\d{8}$/.test(dni)) {
        dniInput.classList.add("input-error");
        errorText.innerText = "El DNI debe tener 8 dígitos.";
        guardarBtn.disabled = true;
        guardarBtn.classList.add("disabled-btn");
        return;
    }

    fetch(`/verificar_dni/?dni=${dni}&cliente_id=${clienteId}`)
        .then(resp => resp.json())
        .then(data => {
            if (data.existe) {
                dniInput.classList.add("input-error");
                errorText.innerText = "⚠️ Este DNI ya está registrado.";
                guardarBtn.disabled = true;
                guardarBtn.classList.add("disabled-btn");
            } else {
                dniInput.classList.remove("input-error");
                errorText.innerText = "";
                guardarBtn.disabled = false;
                guardarBtn.classList.remove("disabled-btn");
            }
        });
}



// Verifica si el socket se conecta correctamente



window.validarDni = validarDni; // Exponer la función para que pueda ser llamada desde el HTML
window.editarCliente = editarCliente;
window.toggleDetallesCliente = toggleDetallesCliente;
window.actualizarInformacionProducto = actualizarInformacionProducto;
window.enviarFormulario = enviarFormulario;
window.cambiarTab = cambiarTab;
window.toggleDetalles = toggleDetalles;
window.toggleFormulario = toggleFormulario;
window.mostrarFormulario = mostrarFormulario;
window.enviarFormulario = enviarFormulario;
window.guardarNotasTecnicas = guardarNotasTecnicas;
window.crearProducto = crearProducto;
window.crearCliente = crearCliente;
window.cambiarEstado = cambiarEstado;


});