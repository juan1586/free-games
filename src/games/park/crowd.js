/**
 * Visitantes ficticios del parque: pasean, hacen fila en las atracciones, se suben y vuelven a salir.
 * También hay un vigilante en cada fila y, a veces, alguien que se cuela delante de la jugadora.
 */
import { createAvatar } from './avatar.js';
import { EXTRAS, HATS, PANTS, SHIRTS, SKIN_TONES, randomLook } from './outfits.js';
import { MAX_QUEUE, createQueue, cutInFront, isFull, joinQueue, leaveQueue, playerIndex, slotPosition, stepQueue } from './queue.js';
import { getRide } from './worlds.js';

export const NAMES = [
  'Valen', 'Sofi', 'Mateo', 'Juanjo', 'Sara', 'Tomás', 'Mariana', 'Emilio', 'Luciana', 'Samuel',
  'Isa', 'Martín', 'Abuela Rosa', 'Don Pacho', 'Tía Lucy', 'Nico', 'Gabi', 'Simón', 'Ema', 'Majo',
];
const CHATTER = [
  '¡Qué emoción!', '¿Falta mucho?', '¡Quiero montar!', '¡Yuju!', 'Me da un poquito de miedo',
  '¡Otra vez!', 'Tengo hambre 🍦', '¡Qué calor!', '¡Mira qué alto!', '¡Vamos, vamos!',
];
const NPC_COUNT = 22;
/** Sin la jugadora en la fila, la fila avanza más despacio (así nunca se queda vacía). */
const BACKGROUND_QUEUE_PACE = 0.3;
/** Probabilidad de volver a la misma fila al bajarse («¡otra vez!»). */
const REQUEUE_CHANCE = 0.55;
const WALK_SPEED = 2.4;
const PLAZA_RING = 9;
/** Cada cuánto alguien de una fila dice algo. */
const CHATTER_EVERY = 3.5;
const GUARD_SPEED = 4.2;
/** Lo que dura la regañada antes de que el colado se vaya al final de la fila. */
const SCOLD_SECONDS = 1.6;
/** Respuestas de los visitantes cercanos a los saludos de la jugadora. */
const REPLIES = {
  wave: ['👋 ¡Hola!', '👋 ¡Holi!', '¡Hola, hola! 😊'],
  follow: ['¡Voy! 🏃', '¿A dónde vamos? 🤔'],
  laugh: ['😂 ¡Jajaja!', '🤣'],
  heart: ['🥰', '❤️ ¡Gracias!'],
  dance: ['💃 ¡Yo también!', '🕺 ¡Eso!'],
};
const REPLY_DISTANCE = 7;
const GUARD_LOOK = {
  skin: SKIN_TONES[3],
  shirt: SHIRTS[1],
  pants: PANTS[1],
  hat: { ...HATS[1], color: '#2b2140' },
  extra: EXTRAS[0],
};

const angleOf = (x, z) => Math.atan2(x, z);
const ringPoint = (angle, radius = PLAZA_RING) => ({ x: Math.sin(angle) * radius, z: Math.cos(angle) * radius });
const perpendicular = (dir) => ({ x: -dir.z, z: dir.x });

/** Camino entre dos puntos pasando por el anillo de la plaza (para rodear la taza gigante). */
function routeVia(from, to) {
  const start = angleOf(from.x, from.z);
  const end = angleOf(to.x, to.z);
  let diff = end - start;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steps = Math.max(1, Math.ceil(Math.abs(diff) / (Math.PI / 2)));
  const route = [];
  for (let step = 0; step <= steps; step += 1) route.push(ringPoint(start + (diff * step) / steps));
  route.push(to);
  return route;
}

export function createCrowd({ kit, scene, random, rides }) {
  const queues = new Map(rides.map((ride) => [ride.id, createQueue(ride)]));
  const npcs = [];
  const guards = new Map();
  const playerEntry = { kind: 'player' };
  let chatterTimer = CHATTER_EVERY;
  let onPlayerBoard = null;

  function makePerson(name, look) {
    const avatar = createAvatar(kit, look);
    const label = kit.label(name, { height: 0.42 });
    label.sprite.position.y = 2.95;
    avatar.root.add(label.sprite);
    const bubble = kit.label(' ', { bubble: true, height: 0.6, background: '#fff6c9' });
    bubble.sprite.position.y = 3.6;
    bubble.sprite.visible = false;
    avatar.root.add(bubble.sprite);
    scene.add(avatar.root, avatar.shadow);
    return { name, avatar, bubble, bubbleTimer: 0, x: 0, z: 0, heading: 0, speed: 0 };
  }

  function say(person, text, seconds = 2.5) {
    person.bubble.setText(text);
    person.bubble.sprite.visible = true;
    person.bubbleTimer = seconds;
  }

  function strollTarget() {
    if (random() < 0.5) return { x: (random() - 0.5) * 4, z: 16 + random() * 36 };
    return ringPoint(random() * Math.PI * 2, 10 + random() * 2.5);
  }

  /** Elige a dónde va: casi siempre a una fila corta, a veces a pasear. */
  function chooseDestination(npc) {
    const openRides = rides.filter((ride) => queues.get(ride.id).people.length < MAX_QUEUE - 3);
    if (openRides.length && random() < 0.75) {
      const ride = openRides[Math.floor(random() * openRides.length)];
      const back = slotPosition(ride, MAX_QUEUE);
      npc.goal = { rideId: ride.id };
      npc.route = routeVia(npc, back);
    } else {
      npc.goal = null;
      npc.route = routeVia(npc, strollTarget());
    }
    npc.state = 'walk';
  }

  function placeInQueue(npc, rideId) {
    const queue = queues.get(rideId);
    if (isFull(queue)) return false;
    joinQueue(queue, { kind: 'npc', npc });
    npc.state = 'queue';
    npc.rideId = rideId;
    return true;
  }

  // Visitantes: unos ya en la fila, otros paseando.
  for (let index = 0; index < NPC_COUNT; index += 1) {
    const npc = makePerson(NAMES[index % NAMES.length], randomLook(random));
    npc.route = [];
    const ride = rides[index % rides.length];
    if (index < rides.length * 3) {
      placeInQueue(npc, ride.id);
      const slot = slotPosition(ride, queues.get(ride.id).people.length - 1);
      npc.x = slot.x;
      npc.z = slot.z;
    } else {
      const start = random() < 0.5 ? ringPoint(random() * Math.PI * 2, 11) : { x: (random() - 0.5) * 4, z: 18 + random() * 30 };
      npc.x = start.x;
      npc.z = start.z;
      chooseDestination(npc);
    }
    npcs.push(npc);
  }

  // Vigilantes, a un lado de cada entrada.
  rides.forEach((ride) => {
    const guard = makePerson('Vigilante', GUARD_LOOK);
    const side = perpendicular(ride.queueDir);
    guard.x = ride.entrance.x + side.x * 1.9 - ride.queueDir.x * 0.6;
    guard.z = ride.entrance.z + side.z * 1.9 - ride.queueDir.z * 0.6;
    guard.heading = angleOf(ride.queueDir.x, ride.queueDir.z);
    guard.home = { x: guard.x, z: guard.z, heading: guard.heading };
    guard.task = null;
    guards.set(ride.id, guard);
  });

  function walkTowards(person, target, delta, speed = WALK_SPEED) {
    const dx = target.x - person.x;
    const dz = target.z - person.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.05) {
      person.speed = 0;
      return true;
    }
    const step = Math.min(distance, speed * delta);
    person.x += (dx / distance) * step;
    person.z += (dz / distance) * step;
    person.speed = step / delta;
    turnTowards(person, Math.atan2(dx, dz), delta);
    return distance - step < 0.05;
  }

  function turnTowards(person, heading, delta) {
    let diff = heading - person.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    person.heading += diff * Math.min(1, delta * 8);
  }

  function boardRide(entry, ride) {
    if (entry.kind === 'player') {
      onPlayerBoard?.(ride, 'queue');
      return;
    }
    const { npc } = entry;
    npc.state = 'riding';
    npc.timer = 6 + random() * 3;
    npc.avatar.root.visible = false;
    npc.avatar.shadow.visible = false;
    npc.cutter = false;
  }

  function leaveRide(npc) {
    const ride = getRide(npc.rideId);
    const side = perpendicular(ride.queueDir);
    npc.x = ride.entrance.x + side.x * 3 + ride.queueDir.x * 2;
    npc.z = ride.entrance.z + side.z * 3 + ride.queueDir.z * 2;
    npc.avatar.root.visible = true;
    npc.avatar.shadow.visible = true;
    npc.rideId = null;
    if (random() < REQUEUE_CHANCE && !isFull(queues.get(ride.id))) {
      say(npc, '¡Otra vez! 🤩');
      npc.goal = { rideId: ride.id };
      npc.route = [slotPosition(ride, MAX_QUEUE)];
      npc.state = 'walk';
      return;
    }
    if (random() < 0.3) say(npc, '¡Qué chévere!');
    chooseDestination(npc);
  }

  function updateNpc(npc, delta) {
    if (npc.state === 'riding') {
      npc.timer -= delta;
      if (npc.timer <= 0) leaveRide(npc);
      return;
    }
    if (npc.state === 'queue') {
      const queue = queues.get(npc.rideId);
      const index = queue.people.findIndex((entry) => entry.npc === npc);
      const ride = queue.ride;
      const slot = slotPosition(ride, index);
      const arrived = walkTowards(npc, slot, delta, npc.cutter ? WALK_SPEED * 1.6 : WALK_SPEED);
      if (arrived) turnTowards(npc, angleOf(-ride.queueDir.x, -ride.queueDir.z), delta);
      return;
    }
    if (npc.state === 'caught') {
      // Quieto mientras llega el vigilante (lo mueve updateGuard).
      npc.speed = 0;
      return;
    }
    if (npc.state === 'idle') {
      npc.speed = 0;
      npc.timer -= delta;
      if (npc.timer <= 0) chooseDestination(npc);
      return;
    }
    // Caminando por la ruta.
    const target = npc.route[0];
    if (!target) {
      if (npc.goal && placeInQueue(npc, npc.goal.rideId)) return;
      npc.state = 'idle';
      npc.timer = 1 + random() * 3;
      return;
    }
    if (walkTowards(npc, target, delta)) npc.route.shift();
  }

  function syncPerson(person, delta) {
    const { root, shadow } = person.avatar;
    root.position.set(person.x, 0, person.z);
    root.rotation.y = person.heading;
    shadow.position.set(person.x, 0.03, person.z);
    person.avatar.update(delta, { speed: person.speed });
    if (person.bubbleTimer > 0) {
      person.bubbleTimer -= delta;
      if (person.bubbleTimer <= 0 && !person.cutter) person.bubble.sprite.visible = false;
    }
  }

  /** El vigilante va hasta el colado, lo regaña, lo manda al final de la fila y vuelve a su puesto. */
  function updateGuard(guard, delta) {
    const { task } = guard;
    if (!task) return;
    const { npc } = task;
    if (task.phase === 'go') {
      const reached = walkTowards(guard, { x: npc.x + (guard.home.x - npc.x) * 0.15, z: npc.z + (guard.home.z - npc.z) * 0.15 }, delta, GUARD_SPEED);
      turnTowards(npc, Math.atan2(guard.x - npc.x, guard.z - npc.z), delta);
      if (reached || Math.hypot(guard.x - npc.x, guard.z - npc.z) < 1.3) {
        task.phase = 'scold';
        task.timer = SCOLD_SECONDS;
        guard.speed = 0;
        say(guard, '¡A la fila! 👮', SCOLD_SECONDS + 0.4);
        say(npc, '😳 ¡Perdón!', SCOLD_SECONDS + 0.6);
      }
    } else if (task.phase === 'scold') {
      turnTowards(guard, Math.atan2(npc.x - guard.x, npc.z - guard.z), delta);
      turnTowards(npc, Math.atan2(guard.x - npc.x, guard.z - npc.z), delta);
      task.timer -= delta;
      if (task.timer <= 0) {
        // Se va al final de la fila, como todo el mundo.
        const ride = getRide(task.rideId);
        npc.goal = { rideId: task.rideId };
        npc.route = [slotPosition(ride, MAX_QUEUE)];
        npc.state = 'walk';
        task.phase = 'back';
      }
    } else if (walkTowards(guard, guard.home, delta, GUARD_SPEED)) {
      guard.heading = guard.home.heading;
      guard.speed = 0;
      guard.task = null;
    }
  }

  function chatter() {
    const queued = npcs.filter((npc) => npc.state === 'queue' && !npc.cutter);
    if (!queued.length) return;
    say(queued[Math.floor(random() * queued.length)], CHATTER[Math.floor(random() * CHATTER.length)]);
  }

  return {
    npcs,
    queues,
    getQueue: (rideId) => queues.get(rideId),
    playerIndex: (rideId) => playerIndex(queues.get(rideId)),

    /** La jugadora se pone al final de la fila. `onBoard(ride, via)` se llama al subir ('queue' o 'fastpass'). */
    joinPlayer(rideId, onBoard) {
      onPlayerBoard = onBoard;
      joinQueue(queues.get(rideId), playerEntry);
    },
    leavePlayer(rideId) {
      leaveQueue(queues.get(rideId), playerEntry);
    },
    /** Pase rápido: la jugadora sube ya. */
    boardPlayerNow(rideId) {
      const queue = queues.get(rideId);
      leaveQueue(queue, playerEntry);
      queue.timer = queue.ride.secondsPerPerson;
      onPlayerBoard?.(queue.ride, 'fastpass');
    },

    /** Alguien se cuela justo delante de la jugadora. Devuelve el visitante o null. */
    startCutter(rideId) {
      const queue = queues.get(rideId);
      const ride = queue.ride;
      const candidates = npcs.filter((npc) => npc.state === 'walk' || npc.state === 'idle');
      if (!candidates.length || playerIndex(queue) < 1) return null;
      const back = slotPosition(ride, playerIndex(queue));
      const npc = candidates.reduce((best, other) =>
        Math.hypot(other.x - back.x, other.z - back.z) < Math.hypot(best.x - back.x, best.z - back.z) ? other : best,
      );
      cutInFront(queue, { kind: 'npc', npc }, playerEntry);
      npc.state = 'queue';
      npc.rideId = rideId;
      npc.cutter = true;
      npc.route = [];
      say(npc, '😜 ¡Me colé!', 999);
      return npc;
    },
    /** El vigilante saca al que se coló: sale de la fila enseguida y el vigilante va a regañarlo. */
    expelCutter(npc) {
      const rideId = npc.rideId;
      const queue = queues.get(rideId);
      leaveQueue(queue, queue.people.find((entry) => entry.npc === npc));
      const guard = guards.get(rideId);
      say(guard, '¡Voy! 👮', 1.2);
      npc.cutter = false;
      say(npc, '😬 ¡Uy!', 1.5);
      npc.rideId = null;
      npc.goal = null;
      npc.route = [];
      npc.state = 'caught';
      guard.task = { phase: 'go', npc, rideId };
    },
    giveUpCutter(npc) {
      npc.cutter = false;
      npc.bubbleTimer = 0.01;
    },

    update(delta) {
      queues.forEach((queue) => {
        const hasPlayer = playerIndex(queue) >= 0;
        const boarded = stepQueue(queue, hasPlayer ? delta : delta * BACKGROUND_QUEUE_PACE);
        if (boarded) boardRide(boarded, queue.ride);
      });
      npcs.forEach((npc) => {
        updateNpc(npc, delta);
        if (npc.avatar.root.visible) syncPerson(npc, delta);
      });
      guards.forEach((guard) => {
        updateGuard(guard, delta);
        syncPerson(guard, delta);
      });
      chatterTimer -= delta;
      if (chatterTimer <= 0) {
        chatterTimer = CHATTER_EVERY * (0.6 + random() * 0.8);
        chatter();
      }
    },

    /** Alguien cerca contesta al saludo de la jugadora. */
    reactTo(position, kind) {
      const lines = REPLIES[kind];
      if (!lines) return;
      const near = npcs.filter(
        (npc) => npc.avatar.root.visible && !npc.cutter && npc.state !== 'caught' && Math.hypot(npc.x - position.x, npc.z - position.z) < REPLY_DISTANCE,
      );
      if (!near.length) return;
      const npc = near[Math.floor(random() * near.length)];
      npc.heading = Math.atan2(position.x - npc.x, position.z - npc.z);
      say(npc, lines[Math.floor(random() * lines.length)], 2);
    },

    /** Posiciones para que la jugadora no atraviese a la gente. */
    bodies() {
      const list = npcs.filter((npc) => npc.avatar.root.visible && npc.state !== 'queue').map((npc) => ({ x: npc.x, z: npc.z }));
      guards.forEach((guard) => list.push({ x: guard.x, z: guard.z }));
      return list;
    },
  };
}

export const PERSON_RADIUS = 0.45;
