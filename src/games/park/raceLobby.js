import { mountRaceLobby } from '../../ui/raceLobby.js';
import { PARK_GAME, describeParkConfig, parkFriendsRoute, parkLook, parseParkConfig, parseParkLook } from './race.js';

/** Sala de espera para pasear por el parque con amigas (misma sala que las carreras). */
export function mountParkFriendsLobby(root) {
  return mountRaceLobby(root, {
    game: PARK_GAME,
    title: '👭 Parque con amigas',
    backPath: '/parque',
    hostConfig: { worldIndex: 0 },
    describeConfig: describeParkConfig,
    parseConfig: parseParkConfig,
    look: parkLook(),
    parseLook: parseParkLook,
    routeFor: parkFriendsRoute,
    labels: { create: 'Crear sala 🎡', start: '¡Entrar juntas al parque! 🎡' },
  });
}
