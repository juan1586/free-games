/**
 * Las amigas en el parque: cada tablet manda su posición ~10 veces por segundo y lo que dice
 * (saludos, gritos, avisos al vigilante…). Aquí se dibujan con su ropa y su nombre, y se cuenta
 * qué está haciendo cada una. Si alguien se va o se cierra la sala, se sigue jugando sola.
 */
import { getSession, leaveRoom, onDisconnect, onLeave, onMessage, send } from '../../core/race.js';
import { createAvatar } from './avatar.js';
import { outfitFromIds } from './outfits.js';
import { SAYINGS, parseParkPos, parseSaying } from './race.js';

const SEND_EVERY = 0.1;
const FOLLOW_RATE = 10;
const DANCE_SECONDS = 2;
const FLASH_SECONDS = 2;

/**
 * onEvent({ type: 'say', friend, kind, rideId } | { type: 'left', friend } | { type: 'closed' }).
 * Devuelve null si no hay sala.
 */
export function createFriends({ kit, scene, onEvent }) {
  const session = getSession();
  if (!session) return null;
  const friends = new Map();
  let sendTimer = 0;

  session.meta.players
    .filter((player) => player.id !== session.myId)
    .forEach((player) => {
      const avatar = createAvatar(kit, outfitFromIds(player.look?.outfit));
      const label = kit.label(`${player.avatar} ${player.name}`, { background: '#7b5cff', color: '#ffffff', height: 0.45 });
      label.sprite.position.y = 2.95;
      const bubble = kit.label(' ', { bubble: true, height: 0.6, background: '#fff6c9' });
      bubble.sprite.position.y = 3.6;
      bubble.sprite.visible = false;
      avatar.root.add(label.sprite, bubble.sprite);
      avatar.root.visible = false;
      avatar.shadow.visible = false;
      scene.add(avatar.root, avatar.shadow);
      friends.set(player.id, {
        id: player.id,
        name: player.name,
        emoji: player.avatar,
        avatar,
        bubble,
        bubbleTimer: 0,
        target: null,
        x: 0,
        y: 0,
        z: 0,
        heading: 0,
        danceTimer: 0,
        flash: '',
        flashTimer: 0,
      });
    });

  function remove(friend) {
    scene.remove(friend.avatar.root, friend.avatar.shadow);
    friends.delete(friend.id);
  }

  function handleMessage(message) {
    const friend = friends.get(message.from);
    if (!friend) return;
    if (message.type === 'pos') {
      const pos = parseParkPos(message);
      if (!pos) return;
      if (!friend.target) Object.assign(friend, { x: pos.x, y: pos.y, z: pos.z, heading: pos.heading });
      friend.target = pos;
      return;
    }
    if (message.type !== 'say') return;
    const saying = parseSaying(message);
    if (!saying) return;
    friend.bubble.setText(SAYINGS[saying.kind].text);
    friend.bubble.sprite.visible = true;
    friend.bubbleTimer = 2.2;
    friend.flash = SAYINGS[saying.kind].text;
    friend.flashTimer = FLASH_SECONDS;
    if (saying.kind === 'dance') friend.danceTimer = DANCE_SECONDS;
    onEvent({ type: 'say', friend, ...saying });
  }

  const unsubscribers = [
    onMessage(handleMessage),
    onLeave((id) => {
      const friend = friends.get(id);
      if (!friend) return;
      remove(friend);
      onEvent({ type: 'left', friend });
    }),
    onDisconnect(() => {
      [...friends.values()].forEach(remove);
      onEvent({ type: 'closed' });
    }),
  ];

  return {
    /** me = { x, y, z, heading, speed, airborne, mode, rideId }. */
    update(delta, me) {
      sendTimer -= delta;
      if (sendTimer <= 0) {
        sendTimer = SEND_EVERY;
        send({ type: 'pos', x: me.x, y: me.y, z: me.z, h: me.heading, s: me.speed, a: me.airborne, m: me.mode, r: me.rideId });
      }
      const follow = Math.min(1, delta * FOLLOW_RATE);
      friends.forEach((friend) => {
        const { target, avatar } = friend;
        if (!target) return;
        friend.x += (target.x - friend.x) * follow;
        friend.y += (target.y - friend.y) * follow;
        friend.z += (target.z - friend.z) * follow;
        let turn = target.heading - friend.heading;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        friend.heading += turn * follow;
        // En una atracción no se la ve paseando (está montada).
        const visible = target.mode !== 'ride';
        avatar.root.visible = visible;
        avatar.shadow.visible = visible;
        friend.danceTimer -= delta;
        avatar.root.position.set(friend.x, friend.y, friend.z);
        avatar.root.rotation.y = friend.heading + (friend.danceTimer > 0 ? (1 - friend.danceTimer / DANCE_SECONDS) * Math.PI * 4 : 0);
        avatar.shadow.position.set(friend.x, 0.03, friend.z);
        avatar.update(delta, { speed: target.speed, airborne: target.airborne });
        if (friend.bubbleTimer > 0) {
          friend.bubbleTimer -= delta;
          if (friend.bubbleTimer <= 0) friend.bubble.sprite.visible = false;
        }
        friend.flashTimer -= delta;
      });
    },

    /** Avisa a las demás (kind: una clave de SAYINGS). */
    say(kind, rideId = '') {
      send({ type: 'say', kind, ride: rideId });
    },

    list: () => [...friends.values()],

    destroy() {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      leaveRoom();
    },
  };
}
