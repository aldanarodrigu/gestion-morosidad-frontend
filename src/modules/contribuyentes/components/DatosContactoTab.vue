<script setup lang="ts">
import { vEnfocar } from '@/shared/directives/enfocar'
import { computed, onScopeDispose, ref, watch, reactive } from 'vue'
import { isAxiosError } from 'axios'
import AvisoCarga from '@/shared/components/esqueleto/AvisoCarga.vue'
import SkeletonBloque from '@/shared/components/esqueleto/SkeletonBloque.vue'
import { useEsqueleto } from '@/shared/composables/useEsqueleto'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/vue/24/outline'
import { guardarContacto, obtenerContactos } from '../services/contactoService'
import type { Contacto, ContactoRequest, TipoContacto } from '../services/contactoService'
import type { OrigenDatos } from '@/modules/cartera/types/cartera'

const props = withDefaults(defineProps<{ cm: string; origen?: OrigenDatos }>(), {
  origen: 'INTENDENCIA',
})
const auth = useAuthStore()
const puedeEditar = computed(
  () => auth.tieneRol('ADMINISTRADOR') || auth.tieneRol('NOTIFICADOR') || auth.tieneRol('ANALISTA'),
)
const contactos = ref<Contacto[]>([])
const cargando = ref(false)
const errores = reactive<{ valor?: string; origen?: string }>({})
const esqueleto = useEsqueleto(() => cargando.value)
const guardando = ref(false)
const errorCarga = ref('')
const errorFormulario = ref('')
const mensaje = ref('')
const formulario = ref<ContactoRequest | null>(null)
const tipos: { value: TipoContacto; label: string }[] = [
  { value: 'EMAIL', label: 'Correo electrónico' },
  { value: 'TELEFONO', label: 'Teléfono' },
  { value: 'DOMICILIO', label: 'Domicilio' },
]
const iconos = { EMAIL: EnvelopeIcon, TELEFONO: PhoneIcon, DOMICILIO: MapPinIcon }
const fuentes: Record<string, string> = {
  API_PERSONAS: 'Registro de personas',
  API_GEOPAGOS: 'GeoPagos',
  API_FACTURAS_PENDIENTES: 'Facturas pendientes',
  API_GEOPAT_PERSONAS: 'GeoPat · Personas',
  API_GEOPAT_PENDIENTES: 'GeoPat · Facturas pendientes',
  MANUAL: 'Carga manual',
}
let controller: AbortController | null = null
function errorApi(e: unknown, defecto: string) {
  return isAxiosError<{ mensaje?: string }>(e) ? (e.response?.data?.mensaje ?? defecto) : defecto
}
async function cargar() {
  controller?.abort()
  const ctrl = new AbortController()
  controller = ctrl
  contactos.value = []
  formulario.value = null
  errorCarga.value = ''
  errorFormulario.value = ''
  mensaje.value = ''
  if (!props.cm) {
    cargando.value = false
    return
  }
  cargando.value = true
  try {
    const datos =
      props.origen === 'SUCIVE'
        ? await obtenerContactos(props.cm, ctrl.signal, props.origen)
        : await obtenerContactos(props.cm, ctrl.signal)
    if (!ctrl.signal.aborted) contactos.value = datos
  } catch (e) {
    if (!ctrl.signal.aborted) errorCarga.value = errorApi(e, 'No se pudieron cargar los contactos.')
  } finally {
    if (controller === ctrl) cargando.value = false
  }
}
watch(() => [props.cm, props.origen], cargar, { immediate: true })
onScopeDispose(() => controller?.abort())
function abrir(contacto?: Contacto) {
  errores.valor = errores.origen = undefined
  if (!puedeEditar.value) return
  formulario.value = contacto
    ? { ...contacto }
    : {
        tipoContacto: 'EMAIL',
        valor: '',
        origen: '',
        esDeContribuyente: true,
      }
  errorFormulario.value = ''
  mensaje.value = ''
}
function cancelar() {
  formulario.value = null
  errorFormulario.value = ''
}
async function guardar() {
  if (guardando.value || !formulario.value || !puedeEditar.value) return
  const request = {
    ...formulario.value,
    valor: formulario.value.valor.trim(),
    origen: formulario.value.origen.trim(),
  }
  errorFormulario.value = ''
  errores.valor = !request.valor
    ? 'Completá el dato de contacto.'
    : request.valor.length > 255
      ? 'Admite hasta 255 caracteres.'
      : request.tipoContacto === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.valor)
        ? 'Ingresá un correo electrónico válido.'
        : undefined
  errores.origen = !request.origen
    ? 'Completá de dónde se obtuvo la información.'
    : request.origen.length > 255
      ? 'Admite hasta 255 caracteres.'
      : undefined
  if (errores.valor || errores.origen) return
  const cm = props.cm
  const contexto = controller
  guardando.value = true
  try {
    const contacto =
      props.origen === 'SUCIVE'
        ? await guardarContacto(cm, request, props.origen)
        : await guardarContacto(cm, request)
    if (controller !== contexto || contexto?.signal.aborted) return
    const indice = contactos.value.findIndex((c) => c.id === contacto.id)
    if (indice < 0) contactos.value.push(contacto)
    else contactos.value[indice] = contacto
    cancelar()
    mensaje.value = 'Contacto guardado correctamente.'
  } catch (e) {
    if (controller === contexto && !contexto?.signal.aborted)
      errorFormulario.value = errorApi(
        e,
        'No se pudo guardar el contacto. Revisá los datos antes de reintentar.',
      )
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <section class="contactos" aria-label="Datos de contacto" :aria-busy="cargando || undefined">
    <AvisoCarga :activo="cargando" texto="Cargando contactos" />
    <header class="cabecera">
      <h3>Información de contacto</h3>
      <button
        v-if="puedeEditar && !cargando && !errorCarga && cm && !formulario"
        class="enlace"
        type="button"
        @click="abrir()"
      >
        + Agregar contacto
      </button>
    </header>
    <p v-if="!cm" class="ayuda">No se pudo identificar al contribuyente.</p>
    <template v-else-if="cargando">
      <ul v-if="esqueleto" class="lista" aria-hidden="true">
        <li v-for="n in 2" :key="n" class="contacto">
          <div class="titulo-contacto">
            <div class="tipo-contenedor">
              <SkeletonBloque forma="circulo" class="icono-tipo" />
              <span class="tipo"><SkeletonBloque ancho="5em" /></span>
            </div>
          </div>
          <p class="valor"><SkeletonBloque :ancho="n === 1 ? '14em' : '10em'" /></p>
          <div class="detalle-contacto">
            <p class="ayuda"><SkeletonBloque ancho="9em" /></p>
            <p class="ayuda"><SkeletonBloque ancho="11em" /></p>
          </div>
        </li>
      </ul>
    </template>
    <div v-else-if="errorCarga" role="alert" class="error">
      <p>{{ errorCarga }}</p>
      <button type="button" class="secundario" @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <p v-if="mensaje" role="status" class="confirmacion">{{ mensaje }}</p>
      <ul v-if="contactos.length" class="lista">
        <li v-for="contacto in contactos" :key="contacto.id" class="contacto">
          <div class="titulo-contacto">
            <div class="tipo-contenedor">
              <component
                :is="iconos[contacto.tipoContacto]"
                class="icono-tipo"
                aria-hidden="true"
              />
              <span class="tipo">{{
                tipos.find((t) => t.value === contacto.tipoContacto)?.label ?? contacto.tipoContacto
              }}</span>
            </div>
            <button
              type="button"
              v-if="puedeEditar"
              class="enlace editar"
              :disabled="guardando"
              :aria-label="`Editar contacto: ${contacto.valor}`"
              @click="abrir(contacto)"
            >
              Editar
            </button>
          </div>
          <p class="valor">{{ contacto.valor }}</p>
          <div class="detalle-contacto">
            <p class="ayuda">
              <span class="etiqueta-detalle">Origen: </span
              >{{ fuentes[contacto.origen] ?? contacto.origen }}
            </p>
            <p class="ayuda">
              <span class="etiqueta-detalle">Pertenece a: </span
              >{{ contacto.esDeContribuyente ? 'Contribuyente' : 'Contacto de un tercero' }}
            </p>
          </div>
        </li>
      </ul>
      <p v-else class="ayuda">No hay contactos registrados para este contribuyente.</p>
      <form v-enfocar v-if="formulario && puedeEditar" class="formulario" @submit.prevent="guardar">
        <h3>{{ formulario.id ? 'Editar contacto' : 'Agregar contacto' }}</h3>
        <fieldset :disabled="guardando">
          <div class="campos">
            <div>
              <label for="contacto-tipo" class="requerido">Tipo de contacto</label>
              <select id="contacto-tipo" v-model="formulario.tipoContacto" required>
                <option v-for="tipo in tipos" :key="tipo.value" :value="tipo.value">
                  {{ tipo.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="contacto-valor" class="requerido">{{
                tipos.find((t) => t.value === formulario?.tipoContacto)?.label
              }}</label>
              <input
                id="contacto-valor"
                v-model="formulario.valor"
                :type="
                  formulario.tipoContacto === 'EMAIL'
                    ? 'email'
                    : formulario.tipoContacto === 'TELEFONO'
                      ? 'tel'
                      : 'text'
                "
                required
                maxlength="255"
                :aria-invalid="!!errores.valor"
                :aria-describedby="errores.valor ? 'contacto-valor-error' : undefined"
              />
              <p v-if="errores.valor" id="contacto-valor-error" role="alert" class="error-campo">
                {{ errores.valor }}
              </p>
            </div>
            <div class="origen">
              <label for="contacto-origen" class="requerido">Origen de la información</label>
              <input
                id="contacto-origen"
                v-model="formulario.origen"
                list="contacto-fuentes"
                required
                maxlength="255"
                placeholder="Ej.: llamada telefónica, declaración jurada"
                :aria-invalid="!!errores.origen"
                :aria-describedby="errores.origen ? 'contacto-origen-error' : undefined"
              />
              <p v-if="errores.origen" id="contacto-origen-error" role="alert" class="error-campo">
                {{ errores.origen }}
              </p>
              <datalist id="contacto-fuentes">
                <option value="Llamada telefónica" />
                <option value="Declaración jurada" />
                <option value="Atención presencial" />
                <option value="Correo del contribuyente" />
              </datalist>
            </div>
          </div>
          <label class="propietario"
            ><input v-model="formulario.esDeContribuyente" type="checkbox" /> Este contacto
            pertenece al propietario</label
          >
          <p class="aviso-obligatorios">Los campos con * son obligatorios.</p>
        </fieldset>
        <p v-if="errorFormulario" role="alert" class="error">{{ errorFormulario }}</p>
        <div class="botones">
          <button type="button" class="secundario" :disabled="guardando" @click="cancelar">
            Cancelar
          </button>
          <button type="submit" class="primario" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar contacto' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.contactos {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  font-size: var(--texto-base);
}
.cabecera,
.titulo-contacto {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h3 {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}
.lista {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--spacing-md);
  margin: 0;
  padding: 0;
  list-style: none;
}
.contacto {
  min-width: 0;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.tipo-contenedor {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}
.icono-tipo {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--color-primary);
}
.editar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-height: 32px;
}
.detalle-contacto {
  display: grid;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}
.detalle-contacto .ayuda {
  margin: 0;
}
.etiqueta-detalle {
  font-weight: 500;
}
.tipo {
  color: var(--color-text-secondary);
  font-size: var(--texto-xs);
  font-weight: 600;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}
.valor {
  margin: 12px 0 var(--spacing-md);
  font-size: var(--titulo-panel);
  font-weight: 600;
  color: var(--color-text);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.ayuda {
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
  margin: 4px 0;
  overflow-wrap: anywhere;
}
.enlace {
  padding: 0;
  border: 0;
  color: var(--color-primary);
  background: none;
  font-size: var(--texto-sm);
}
.formulario {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}
.formulario h3 {
  margin-bottom: 20px;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.campos {
  display: grid;
  /* Tantas columnas como entren (mín. 220px); una sola en móvil */
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.origen {
  grid-column: 1 / -1;
}
label {
  display: block;
  color: var(--color-text-secondary);
  font-size: var(--texto-sm);
  margin-bottom: 6px;
}
input:not([type='checkbox']) {
  width: 100%;
}
select {
  width: 100%;
}
.propietario {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 18px 0 0;
}
.botones {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: var(--spacing-lg);
}
.botones button,
.confirmacion {
  color: var(--color-temprana);
  margin: 0;
}
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (max-width: 599px) {
  .lista,
  .campos {
    grid-template-columns: 1fr;
  }
  .cabecera {
    align-items: flex-start;
  }
  .formulario {
    padding: 16px;
  }
}
</style>
