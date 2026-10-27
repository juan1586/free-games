import { getGameData } from '../../core/player.js';
import { mountRaceLobby } from '../../ui/raceLobby.js';
import { PARK_WORLDS, isWorldOpen } from './worlds.js';
import { PARK_GAME, describeParkConfig, parkFriendsRoute, parkLook, parseParkConfig, parseParkLook } from './race.js';

/**
 * Sala de espera para pasear por el parque con amigas (misma sala que las carreras).
 * worldIndex: parque elegido antes (solo cuenta para quien crea la sala; las invitadas entran aunque no lo tengan abierto).
 */
export function mountParkFriendsLobby(root, { worldIndex = 0 } = {}) {
  const world = PARK_WORLDS[worldIndex];
  const hostWorld = world && isWorldOpen(world, getGameData('park')) ? worldIndex : 0;
  return mountRaceLobby(root, {
    game: PARK_GAME,
    title: '👭 Parque con amigas',
    backPath: '/parque',
    hostConfig: { worldIndex: hostWorld },
    describeConfig: describeParkConfig,
    parseConfig: parseParkConfig,
    look: parkLook(),
    parseLook: parseParkLook,
    routeFor: parkFriendsRoute,
    labels: { create: 'Crear sala 🎡', start: '¡Entrar juntas al parque! 🎡' },
  });
}
