# gestion-morosidad-frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

## Docker

La imagen compila la app y la sirve con nginx (sin root, puerto 8080), redirigiendo `/api` al backend.
El sistema completo (Postgres + API + frontend) se levanta con el `docker-compose.yml` del repo
`gestion-morosidad-api`; ver su README.

Para `npm run dev` apuntando a la API del compose:

```sh
API_PROXY_TARGET=http://localhost:9080 npm run dev
```


## Gestiones

El detalle del contribuyente incluye un historial **por deuda**, el padrón/CM como dato fijo y
un formulario de registro. Las acciones disponibles y las gestiones se consultan al backend;
la fecha y el autor se asignan en el servidor. El formulario conserva los datos si falla el guardado,
bloquea envíos simultáneos y actualiza el historial y el contador al guardar.

```sh
npm test
npm run build
npm run dev
```

`npm test` verifica selección de deuda, cambio de historial, respuestas tardías, registro,
cancelación, fallos de red y validaciones. Solo Notificador registra gestiones; Analista consulta
el historial. Administrador también accede a cartera e historial, sin registrar gestiones.

## Datos de contacto

En Cartera, abrir un contribuyente y entrar a **Datos de contacto**. La pantalla consulta
los contactos guardados en la base mediante el CM vinculado a ese contribuyente.
Los contactos se comparten entre sus deudas y padrones.

Administrador, Notificador y Analista pueden consultar, agregar y editar correo, telefono y domicilio, indicando su origen.
Cada contacto exige valor y origen (hasta 255 caracteres), e indica si pertenece al
contribuyente o a un tercero. El origen admite texto libre, por ejemplo una llamada,
una declaracion jurada o atencion presencial. Los contactos importados muestran su fuente.

Se utilizan `GET /api/contribuyentes/{cm}/contactos` y
`PUT /api/contribuyentes/{cm}/contactos`: sin ID se crea, con ID se modifica.
La sincronizacion conserva los contactos existentes. No se muestra un estado de validacion
ni una localidad de contacto porque no existen esos campos en el modelo actual.

`npm test` incluye pruebas de consulta, alta, edicion, cancelacion, origen obligatorio,
correo invalido, reintento, envios duplicados y cambio de contribuyente.

## Configuracion de usuarios

En **Configuracion > Usuarios**, un administrador puede crear cuentas, asignar uno o
varios roles y activar/desactivar usuarios. Se muestran nombre, roles y estado.
Los roles disponibles son Administrador, Notificador y Analista, y sus permisos se suman.
Por ejemplo, Notificador + Administrador permite administrar acciones y usuarios.
No se editan permisos individuales en esta etapa.

La cuenta debe tener al menos un rol; la contrasena inicial tiene de 8 a 72 caracteres.
La edicion de roles y estado conserva la contrasena y el nombre de usuario.
La sesion y el navbar muestran todos los roles. Al navegar se consulta `/api/auth/me`
para actualizar los permisos; el backend verifica los roles actuales en cada solicitud.

Reiniciar el backend para aplicar la migracion de roles antes de usar esta pantalla.
`npm test` incluye pruebas de alta con varios roles, permisos, cambios de estado,
validacion, cancelacion y reintentos.

## Tipos de Tributo

Configuracion > Tipos de Tributo consulta los codigos y descripciones reales de la base.
Administrador puede agregar tributos, completar o editar su descripcion y eliminarlos
con confirmacion. Los demas roles tienen acceso de consulta. El codigo de un tributo
existente no se modifica. Si esta asociado a deudas, el sistema impide eliminarlo y explica
el motivo. Una sincronizacion posterior puede reincorporar un codigo eliminado si la API
vuelve a enviarlo. Reiniciar el backend para disponer de los nuevos endpoints de administracion.

## Periodos de Mora por tributo

La pestaña muestra la base como referencia (0-90, 91-365, desde 366) y permite seleccionar
un tipo de tributo para consultar o personalizar sus limites. Sin configuracion propia,
se aplican los rangos base. Solo Administrador puede editar. Los inicios se calculan a partir
del limite anterior mas uno y el ultimo segmento no tiene limite superior.

Al guardar se envian los tres rangos juntos con el `tributoId`. Los demas tributos conservan
sus configuraciones. **Usar rangos base** retira la personalizacion y conserva el historial.
Las deudas no canceladas se reclasifican al guardar o restaurar. Una deuda con varios tributos
toma el segmento mas avanzado de todos ellos: Tardia > Inicial > Temprana.

Reiniciar el backend para aplicar la migracion de rangos por tributo antes de usar la pantalla.

## Navegacion y permisos

Administrador accede a todas las secciones y consultas, incluyendo Cartera, Convenios,
Reportes y el detalle del contribuyente. La cartera es accesible para los tres roles.
El registro de gestiones requiere Notificador; Administrador y Analista consultan el historial
sin formulario de registro. Los tres roles pueden agregar y editar contactos, indicando
el origen de la información.

Los permisos de multiples roles se suman. Administrador + Notificador mantiene ambos accesos;
Administrador + Analista puede consultar cartera y editar contactos, pero no registrar gestiones.
Las consultas de catalogos de configuracion siguen disponibles para los tres roles; solo
Administrador modifica configuracion. El backend aplica las mismas restricciones.

## Crear acciones

En Configuracion > Acciones, **Crear accion** abre un formulario con nombre y segmento
(Mora Temprana, Inicial o Tardia, consultados al backend). Solo Administrador puede crear.
La accion queda activa y asignada a la mora elegida; sus moras se muestran debajo del nombre
en el catalogo. No se usa descripcion de accion en esta etapa.

El formulario conserva los datos si falla el guardado, impide envios duplicados y permite
cancelar o reintentar si no se cargan los segmentos. Reiniciar el backend para disponer
del alta con `segmentoId`. No requiere otra migracion.


## Agrupar cartera por contribuyente

El checkbox **Agrupar por: Contribuyente** está desactivado por defecto. Al activarlo consulta `GET /api/deudas/agrupadas`.
La identidad se determina por documento, conservando ceros iniciales. Nombres iguales
con documentos diferentes se muestran separados. Sin documento, se conserva la identidad
por ID de contribuyente.

Cada fila muestra documento, nombres, cantidad de deudas, segmento más avanzado,
máximo de días vencidos e importe total. **Ver deudas** despliega sus CM, padrones y
acciones; desde cada deuda se abre su propio historial de gestiones.

Los filtros de nombre/documento/CM, segmento, tributo y contacto se envían al backend antes de
agrupar. Los totales corresponden a las deudas filtradas. La paginación cuenta contribuyentes
y nunca divide sus deudas entre páginas. El orden por importe usa el total del grupo.
Al desmarcar el checkbox se recupera el listado individual. La URL conserva el modo
(`agrupar=true` para el agrupado; sin parámetro para el individual), filtros y página. La exportación de la página visible
respeta el modo agrupado o individual.

Las pruebas de cartera verifican las consultas, el cambio de modo, el reinicio de página,
la restauración desde URL, respuestas tardías y enlaces al historial de cada deuda.


## Filtro Con contacto / Sin contacto

El selector envía `conContacto=true` o `conContacto=false` al backend, tanto con agrupación
como sin ella. Al elegir la opción general se omite el parámetro. El cambio vuelve a la
primera página y se conserva en la URL como `contacto=con` o `contacto=sin`.

La cartera muestra los resultados y totales que devuelve el servidor: no filtra solo las
filas de la página visible. Cuenta cualquier correo, teléfono o domicilio con valor guardado
para el contribuyente, incluyendo contactos de terceros y cualquiera sea el origen.
Los contactos vacíos no cuentan. El campo `conContacto` de cada deuda refleja su
 disponibilidad real en la base, sin usar un valor fijo del frontend.


## CM en el detalle y en Gestiones

La cabecera y el historial utilizan la misma deuda seleccionada en cartera (`?deuda=ID`).
También se aceptan enlaces anteriores con `deudaId`; si llegan ambos, prevalece `deuda`.
El CM de la cabecera corresponde al padrón de esa deuda. El importe total y los contadores
siguen resumiendo todas las deudas del contribuyente.

Si hay varias deudas y no se identifica una selección válida, no se muestra el CM de una
deuda arbitraria ni se consulta su historial. Con una sola deuda, se selecciona automáticamente.
Los contactos siguen siendo consultables por pertenecer al contribuyente.

`ContribuyenteDetalleView.test.ts` verifica coincidencia entre cabecera e historial,
cambio de deuda, enlaces anteriores, ausencia de selección y el ID usado al guardar una gestión.
