import { isMuted } from './player.js';

let audioContext = null;

function getContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function playTone({ frequency, endFrequency = frequency, duration = 0.12, type = 'square', volume = 0.12, delay = 0 }) {
  if (isMuted()) return;
  const context = getContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playMelody(notes, type = 'triangle') {
  notes.forEach(([frequency, delay, duration = 0.12]) => playTone({ frequency, delay, duration, type, volume: 0.1 }));
}

export const sounds = {
  click: () => playTone({ frequency: 660, endFrequency: 880, duration: 0.06, type: 'triangle', volume: 0.08 }),
  jump: () => playTone({ frequency: 380, endFrequency: 760, duration: 0.15, type: 'square', volume: 0.06 }),
  coin: () => playMelody([[988, 0, 0.07], [1319, 0.07, 0.15]], 'square'),
  hit: () => playTone({ frequency: 220, endFrequency: 60, duration: 0.35, type: 'sawtooth', volume: 0.12 }),
  move: () => playTone({ frequency: 300, duration: 0.03, type: 'triangle', volume: 0.05 }),
  rotate: () => playTone({ frequency: 520, endFrequency: 620, duration: 0.05, type: 'triangle', volume: 0.06 }),
  drop: () => playTone({ frequency: 180, endFrequency: 90, duration: 0.1, type: 'square', volume: 0.08 }),
  lineClear: () => playMelody([[523, 0], [659, 0.08], [784, 0.16], [1047, 0.24, 0.2]]),
  levelUp: () => playMelody([[523, 0], [784, 0.1], [1047, 0.2], [1319, 0.3, 0.3]]),
  win: () => playMelody([[784, 0], [988, 0.12], [1175, 0.24], [1568, 0.36, 0.4]]),
  gameOver: () => playMelody([[392, 0, 0.2], [330, 0.2, 0.2], [262, 0.4, 0.4]], 'sawtooth'),
};
