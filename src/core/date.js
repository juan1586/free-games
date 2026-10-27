/** Fecha local (AAAA-MM-DD): sirve para lo que se renueva una vez al día (cofre, misiones). */
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
