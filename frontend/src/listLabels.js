// Cómo se titula una lista en las vistas que la muestran de a muchas.
//
// Las listas automáticas nacen con el nombre "Lista Automática - 2026-09-22"
// (ver shopping_list_service.generate_auto_lists): lo único que distingue una
// de otra —la fecha— va al final y en formato ISO, así que al truncar el texto
// desaparece justo esa parte y todas se leen iguales. El título invierte el
// orden: primero la fecha en lenguaje corriente, y "automática" pasa a ser el
// dato secundario, que además ya se repite en la etiqueta contigua.
//
// Se reescribe únicamente el nombre exacto que genera el backend. Una lista
// que el usuario renombró conserva su nombre aunque siga marcada como
// is_auto_generated: esa marca no distingue un nombre propio de uno por
// omisión, y el patrón sí. Por eso el criterio es el patrón y no la marca.
//
// Lo que este módulo NO hace: tocar el nombre guardado. En el detalle de la
// lista el campo de edición sigue mostrando el nombre real, porque es lo que
// se está por modificar.

const AUTO_NAME = /^Lista Automática - (\d{4})-(\d{2})-(\d{2})$/

/**
 * Fecha de la semana que agrupa una lista automática, o null si el nombre no
 * es el que genera el backend.
 */
export function autoListDate(list) {
  const match = AUTO_NAME.exec(list?.name ?? '')
  if (!match) return null
  // La fecha se lee del propio nombre y no de list.date: esa llega en UTC y
  // pasarla a hora local puede caer en el día anterior, que es justamente el
  // dato que aquí se muestra.
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/**
 * Nombre por omisión de una lista fechada. Lo usan el título de las listas
 * automáticas y el nombre con que el catálogo crea una lista nueva, para que
 * una lista creada a mano y una generada no se llamen de formas distintas.
 */
export function defaultListName(date) {
  // El año solo se escribe cuando no es el actual: en el uso corriente todas
  // las listas son del año en curso y repetirlo alarga el nombre hasta que
  // vuelve a truncarse, que es el defecto que esto corrige.
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const day = date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  return `Lista del ${day}`
}

/** Título con que se muestra la lista. */
export function listTitle(list) {
  const date = autoListDate(list)
  if (!date) return list?.name ?? ''
  return defaultListName(date)
}
