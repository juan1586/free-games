import { getGameData } from '../../core/player.js';
import { mountRaceLobby } from '../../ui/raceLobby.js';
import { DINO_WORLDS } from './worlds.js';
import { RACE_GAME, describeDinoConfig, dinoLook, dinoRaceRoute, parseDinoConfig, parseDinoLook } from './race.js';

/** Sala de espera de Dino Corre. worldIndex: mundo elegido antes (solo cuenta para quien crea la sala). */
export function mountDinoRaceLobby(root, { worldIndex }) {
  const data = getGameData('dino');
  return mountRaceLobby(root, {
    game: RACE_GAME,
    title: '🏁 Carrera de dinos',
    backPath: '/dino',
    hostConfig: { worldIndex: Math.max(0, Math.min(worldIndex, data.unlockedWorld, DINO_WORLDS.length - 1)) },
    describeConfig: describeDinoConfig,
    parseConfig: parseDinoConfig,
    look: dinoLook(),
    parseLook: parseDinoLook,
    routeFor: dinoRaceRoute,
  });
}
