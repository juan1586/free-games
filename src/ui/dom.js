/**
 * Crea un elemento DOM. El texto siempre se asigna con textContent para no interpretar HTML
 * de datos que vienen del usuario (nombres de jugador o de dino).
 */
export function el(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  const { className, text, attrs, on, style } = options;
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text);
  if (style) {
    Object.entries(style).forEach(([property, value]) => {
      if (property.startsWith('--')) element.style.setProperty(property, value);
      else element.style[property] = value;
    });
  }
  if (attrs) {
    Object.entries(attrs).forEach(([name, value]) => {
      if (value === false || value === null || value === undefined) return;
      element.setAttribute(name, value === true ? '' : String(value));
    });
  }
  if (on) Object.entries(on).forEach(([eventName, handler]) => element.addEventListener(eventName, handler));
  children.filter(Boolean).forEach((child) => element.append(child));
  return element;
}

export function navigate(path) {
  window.location.hash = `#${path}`;
}
