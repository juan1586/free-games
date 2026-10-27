import { showModal } from './modal.js';
import { navigate } from './dom.js';

const MEDALS = ['🥇', '🥈', '🥉', '🏅'];
// Al llegar a la meta se suele seguir pulsando "saltar" un rato: el podio tarda más en aceptar teclas.
const PODIUM_KEY_ARM_DELAY_MS = 1500;

export const formatRaceTime = (ms) => (ms === undefined ? '—' : `${(ms / 1000).toFixed(1)} s`);

/** Texto corto del puesto para el marcador (1º, 2º…). */
export const placeLabel = (place) => `${place}º`;

/** Tabla de posiciones: medalla, avatar, nombre y tiempo (o si sigue corriendo o se fue). */
function standingsStats(match) {
  let place = 0;
  return match.standings().map((entry) => {
    let medal = '';
    let value = entry.gone ? '👋 Se fue' : '🏃 Corriendo…';
    if (entry.ms !== undefined) {
      medal = MEDALS[place];
      place += 1;
      value = formatRaceTime(entry.ms);
    }
    return { label: `${medal} ${entry.avatar} ${entry.isMe ? 'Tú' : entry.name}`.trim(), value };
  });
}

function winnersTitle(match) {
  const winners = match.result ?? [];
  if (match.didWin()) return winners.length > 1 ? '¡Empate en primer lugar!' : '¡Ganaste la carrera!';
  const names = winners.map((id) => match.playerName(id));
  if (names.length === 1) return `¡${names[0]} ganó!`;
  return `¡${names.slice(0, -1).join(', ')} y ${names.at(-1)} ganaron!`;
}

/**
 * Podio al llegar a la meta: posiciones de todos (se vuelve a llamar cuando llega alguien más).
 * La revancha reinicia la carrera de todos, así que solo se ofrece cuando ya no hay nadie corriendo
 * (o tras un rato) y si queda alguien en la sala. Devuelve los ms hasta poder ofrecerla.
 */
export function showRacePodium({ match, extraMessage = '', trophies, onRematch, exitPath }) {
  const iWon = match.didWin();
  const myPlace = match.standings().findIndex((entry) => entry.isMe);
  const hasRivals = match.activeRivals.length > 0;
  const rematchIn = hasRivals ? match.rematchReadyIn() : Infinity;
  const canRematch = rematchIn === 0;
  const cheer = iWon ? '¡Ganaste una copa! 🏆' : '¡Qué buena carrera! La próxima puede ser tuya.';
  const waitNote = hasRivals && !canRematch ? 'Cuando lleguen todos podrán jugar la revancha.' : '';
  showModal({
    emoji: iWon ? '🏆' : MEDALS[myPlace] ?? '🏁',
    title: winnersTitle(match),
    message: [cheer, extraMessage, waitNote].filter(Boolean).join(' '),
    tone: iWon ? 'success' : 'neutral',
    keyArmDelayMs: PODIUM_KEY_ARM_DELAY_MS,
    stats: [...standingsStats(match), { label: '🏆 Tus copas', value: trophies }],
    actions: [
      canRematch ? { label: '¡Revancha! 🔁', variant: 'primary', onClick: onRematch } : null,
      { label: 'Salir', variant: canRematch ? 'secondary' : 'primary', onClick: () => navigate(exitPath) },
    ].filter(Boolean),
  });
  return rematchIn;
}

/** Cuando ya no queda nadie en la sala. */
export function showRaceEnded({ title, message, stats = [], newRacePath, exitPath }) {
  showModal({
    emoji: '👋',
    title,
    message,
    stats,
    actions: [
      { label: 'Nueva carrera 🏁', variant: 'primary', onClick: () => navigate(newRacePath) },
      { label: 'Salir', onClick: () => navigate(exitPath) },
    ],
  });
}
