# Revisión del manual frente a la vista por productos

Fecha: 2026-10-02. Revisión de solo lectura de
`apps/web/src/content/manual-usuario.ts`; no se modificó el manual original.

## Resultado

El manual ya refleja correctamente los cambios principales: la vista por
productos es opt-in, los administradores la ven como vista previa, existen los
inicios `/dashboard/articulos` y `/dashboard/redes`, las pantallas mantienen
sus rutas y el acceso por producto no bloquea mientras el interruptor está
apagado.

## Hallazgos

1. Falta documentar la nueva página **Mi acceso** (`/dashboard/mi-acceso`),
   disponible cuando está activa la vista por productos. Debe explicar que es
   informativa, que muestra Artículos/Redes y que los cambios los realiza el
   administrador.
2. La sección de Inicio describe las tres tarjetas como experiencia estándar,
   y después explica la vista por productos. No es incorrecto, pero conviene
   añadir una frase de enlace al inicio de esa sección para que la persona no
   confunda ambas experiencias.
3. La sección de Administración describe el panel Productos, pero aún no
   menciona el historial plegable de eventos ni el interruptor general de
   derechos. Añadirlo cuando los PR de interfaz correspondientes estén
   fusionados.

No encontré instrucciones que contradigan las rutas actuales ni referencias
al nombre provisional «Redes Totales» como nombre visible actual.
