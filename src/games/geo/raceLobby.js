import { getGameData } from '../../core/player.js';
import { mountRaceLobby } from '../../ui/raceLobby.js';
import { GEO_LEVELS } from './levels.js';
import { getSpeed } from './physics.js';
import { RACE_GAME, describeGeoConfig, geoLook, geoRaceRoute, parseGeoConfig, parseGeoLook } from './race.js';

/** Sala de espera de Salto Geométrico. levelIndex: nivel elegido antes (solo cuenta para quien crea la sala). */
export function mountGeoRaceLobby(root, { levelIndex }) {
  const data = getGameData('geo');
  return mountRaceLobby(root, {
    game: RACE_GAME,
    title: '🏁 Carrera con amigos',
    backPath: '/geo',
    hostConfig: {
      levelIndex: Math.max(0, Math.min(levelIndex, data.unlockedLevel, GEO_LEVELS.length - 1)),
      speedId: getSpeed(data.speed).id,
    },
    describeConfig: describeGeoConfig,
    parseConfig: parseGeoConfig,
    look: geoLook(),
    parseLook: parseGeoLook,
    routeFor: geoRaceRoute,
  });
}
