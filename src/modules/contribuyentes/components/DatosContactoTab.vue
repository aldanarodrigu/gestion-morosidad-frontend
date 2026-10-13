<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/modules/autenticacion/stores/auth.store'
import { EnvelopeIcon, PhoneIcon, MapPinIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import { guardarContacto, obtenerContactos } from '../services/contactoService'
import type { Contacto, ContactoRequest, TipoContacto } from '../services/contactoService'

const props = defineProps<{ cm: string }>()
const auth = useAuthStore()
const puedeEditar = computed(
  () => auth.tieneRol('ADMINISTRADOR') || auth.tieneRol('NOTIFICADOR') || auth.tieneRol('ANALISTA'),
)
const contactos = ref<Contacto[]>([])
const cargando = ref(false)
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
  API_PERSONAS: 'API Personas',
  API_GEOPAGOS: 'API GeoPagos',
  API_FACTURAS_PENDIENTES: 'API Facturas pendientes',
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
    const datos = await obtenerContactos(props.cm, ctrl.signal)
    if (!ctrl.signal.aborted) contactos.value = datos
  } catch (e) {
    if (!ctrl.signal.aborted) errorCarga.value = errorApi(e, 'No se pudieron cargar los contactos.')
  } finally {
    if (controller === ctrl) cargando.value = false
  }
}
watch(() => props.cm, cargar, { immediate: true })
onScopeDispose(() => controller?.abort())
function abrir(contacto?: Contacto) {
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
  if (!request.valor || !request.origen) {
    errorFormulario.value = 'Completá el valor y el origen del contacto.'
    return
  }
  if (request.valor.length > 255 || request.origen.length > 255) {
    errorFormulario.value = 'El valor y el origen admiten hasta 255 caracteres.'
    return
  }
  if (request.tipoContacto === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.valor)) {
    errorFormulario.value = 'Ingresá un correo electrónico válido.'
    return
  }
  const cm = props.cm
  const contexto = controller
  guardando.value = true
  try {
    const contacto = await guardarContacto(cm, request)
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
  <section class="contactos" aria-label="Datos de contacto">
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
    <p v-else-if="cargando" role="status" class="ayuda">Cargando contactos...</p>
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
              <PencilSquareIcon class="icono-editar" aria-hidden="true" />
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
      <form v-if="formulario && puedeEditar" class="formulario" @submit.prevent="guardar">
        <h3>{{ formulario.id ? 'Editar contacto' : 'Agregar contacto' }}</h3>
        <fieldset :disabled="guardando">
          <div class="campos">
            <div>
              <label for="contacto-tipo">Tipo de contacto</label>
              <select id="contacto-tipo" v-model="formulario.tipoContacto" required>
                <option v-for="tipo in tipos" :key="tipo.value" :value="tipo.value">
                  {{ tipo.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="contacto-valor">{{
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
              />
            </div>
            <div class="origen">
              <label for="contacto-origen">Origen de la información</label>
              <input
                id="contacto-origen"
                v-model="formulario.origen"
                list="contacto-fuentes"
                required
                maxlength="255"
                placeholder="Ej.: llamada telefónica, declaración jurada"
              />
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
            pertenece al contribuyente</label
          >
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
  font-size: 13px;
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
.icono-editar {
  width: 15px;
  height: 15px;
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
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}
.valor {
  margin: 12px 0 var(--spacing-md);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.ayuda {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 4px 0;
  overflow-wrap: anywhere;
}
.enlace {
  padding: 0;
  border: 0;
  color: var(--color-primary);
  background: none;
  font-size: 12px;
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
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.origen {
  grid-column: 1 / -1;
}
label {
  display: block;
  color: var(--color-text-secondary);
  font-size: 12px;
  margin-bottom: 6px;
}
input:not([type='checkbox']),
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
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
.secundario {
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}
.primario {
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary);
  font-weight: 600;
}
.primario:hover {
  background: var(--color-primary-dark);
}
.secundario {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.error {
  color: var(--color-tardia);
}
.confirmacion {
  color: var(--color-temprana);
  margin: 0;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
@media (max-width: 600px) {
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
