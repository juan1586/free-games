/**
 * Mapa del Mundo Mágico: los parques como paradas del tren con lo que se ha completado de cada uno
 * y las mascotas abiertas. Lo usan la pantalla previa (para elegir parque) y el parque (para viajar).
 * Sin three.js.
 */
import { el } from '../../ui/dom.js';
import { sounds } from '../../core/audio.js';
import { PARK_WORLDS, isWorldOpen, totalProgress, worldProgress } from './worlds.js';
import { PETS, isOwned, openPets, petUnlockText } from './outfits.js';

/**
 * - `currentIndex`: parque donde se está (📍), o null.
 * - `selectedIndex`: parque elegido (resaltado), opcional.
 * - `onPick(index)`: al tocar un parque abierto (sin `onPick`, las paradas solo se miran).
 * - `note`: texto bajo el título (p. ej. por qué no se puede viajar).
 * - `onClose` / `closeLabel`: botón para cerrar (en el parque).
 * Devuelve { element, select(index) }.
 */
export function createWorldMap({ data, currentIndex = null, selectedIndex = null, onPick, note, onClose, closeLabel = 'Seguir aquí ▶' }) {
  const total = totalProgress(data);

  const stops = PARK_WORLDS.map((world, index) => {
    const isOpen = isWorldOpen(world, data);
    const progress = worldProgress(world, data);
    const complete = progress.percent >= 100;
    const isHere = index === currentIndex;
    const badge = isHere ? '📍' : complete ? '👑' : '';
    const button = el(
      'button',
      {
        className: `world-map__stop ${isOpen ? '' : 'is-locked'} ${complete ? 'is-complete' : ''} ${isHere ? 'is-here' : ''}`,
        attrs: { type: 'button', disabled: !isOpen || !onPick, 'aria-label': `${world.name}: ${isOpen ? `${progress.percent}%` : 'cerrado'}` },
        on: {
          click: () => {
            if (!isOpen || !onPick) return;
            sounds.click();
            onPick(index);
          },
        },
      },
      [
        el('span', { className: 'world-map__ring', style: { '--percent': isOpen ? progress.percent : 0 } }, [
          el('span', { className: 'world-map__emoji', text: isOpen ? world.emoji : '🔒', attrs: { 'aria-hidden': 'true' } }),
          badge ? el('span', { className: 'world-map__badge', text: badge, attrs: { 'aria-hidden': 'true' } }) : null,
        ].filter(Boolean)),
        el('span', { className: 'world-map__info' }, [
          el('strong', { className: 'world-map__name', text: world.name }),
          isOpen
            ? el('span', {
                className: 'world-map__counts',
                text: `🎢 ${progress.ridesDone}/${progress.rides} · ${world.treasure.icon} ${progress.found}/${progress.treasures} · ${progress.hasKey ? '🗝️' : '❔'}`,
              })
            : null,
          el('small', { className: 'world-map__missing', text: isOpen ? `${progress.percent}% · ${progress.missing}` : world.unlock.hint }),
        ].filter(Boolean)),
      ],
    );
    return button;
  });

  const owned = openPets(data);
  const petNote = el('p', { className: 'world-map__pet-note', text: 'Toca una mascota para ver cómo se consigue.' });
  const pets = PETS.filter((pet) => pet.unlock).map((pet) => {
    const isOpen = isOwned(data, pet);
    return el('button', {
      className: `world-map__pet ${isOpen ? 'is-open' : ''}`,
      text: isOpen ? pet.icon : '❔',
      attrs: { type: 'button', title: isOpen ? pet.name : pet.unlock.text, 'aria-label': isOpen ? pet.name : `Mascota secreta: ${pet.unlock.text}` },
      on: {
        click: () => {
          sounds.click();
          petNote.textContent = isOpen ? `${pet.icon} ${pet.name}: ¡ya es tuya! Póntela en el vestidor.` : `❔ ${petUnlockText(data, pet)}`;
        },
      },
    });
  });

  const element = el('section', { className: 'world-map', attrs: { 'aria-label': 'Mapa del Mundo Mágico' } }, [
    el('header', { className: 'world-map__header' }, [
      el('strong', { className: 'world-map__title', text: `🌍 Mundo Mágico · ${total}%` }),
      el('span', { className: 'world-map__bar', attrs: { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(total) } }, [
        el('span', { className: 'world-map__bar-fill', style: { width: `${total}%` } }),
      ]),
    ]),
    note ? el('p', { className: 'world-map__note', text: note }) : null,
    el('div', { className: 'world-map__track' }, stops),
    el('div', { className: 'world-map__pets' }, [
      el('strong', { text: `🐾 Mascotas ${owned.length}/${pets.length}` }),
      el('div', { className: 'world-map__pet-row' }, pets),
      petNote,
    ]),
    onClose ? el('button', { className: 'btn btn--primary btn--lg world-map__close', text: closeLabel, attrs: { type: 'button' }, on: { click: () => onClose() } }) : null,
  ].filter(Boolean));

  function select(index) {
    stops.forEach((stop, stopIndex) => {
      stop.classList.toggle('is-selected', stopIndex === index);
      stop.setAttribute('aria-pressed', String(stopIndex === index));
    });
  }
  if (selectedIndex != null) select(selectedIndex);

  return { element, select };
}
