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
  portal: () => playTone({ frequency: 300, endFrequency: 1200, duration: 0.3, type: 'sine', volume: 0.1 }),
  orb: () => playTone({ frequency: 700, endFrequency: 1400, duration: 0.12, type: 'triangle', volume: 0.08 }),
  pad: () => playTone({ frequency: 200, endFrequency: 900, duration: 0.2, type: 'triangle', volume: 0.1 }),
  flip: () => playTone({ frequency: 520, endFrequency: 260, duration: 0.1, type: 'triangle', volume: 0.07 }),
  checkpoint: () => playMelody([[880, 0, 0.06], [1175, 0.06, 0.1]], 'triangle'),
  turbo: () => playTone({ frequency: 180, endFrequency: 720, duration: 0.25, type: 'sawtooth', volume: 0.05 }),
  achievement: () => playMelody([[659, 0], [784, 0.1], [988, 0.2], [1319, 0.3], [1568, 0.42, 0.35]]),
  scream: () => {
    playTone({ frequency: 520, endFrequency: 1300, duration: 0.3, type: 'sawtooth', volume: 0.05 });
    playTone({ frequency: 1300, endFrequency: 700, duration: 0.35, type: 'sawtooth', volume: 0.05, delay: 0.28 });
  },
  whoosh: () => playTone({ frequency: 900, endFrequency: 110, duration: 1, type: 'sine', volume: 0.1 }),
  shutter: () => playTone({ frequency: 2200, endFrequency: 700, duration: 0.06, type: 'square', volume: 0.05 }),
  pop: () => playTone({ frequency: 950, endFrequency: 180, duration: 0.14, type: 'triangle', volume: 0.12 }),
  honk: () => playMelody([[392, 0, 0.14], [392, 0.18, 0.24]], 'square'),
  splash: () => playTone({ frequency: 420, endFrequency: 90, duration: 0.3, type: 'triangle', volume: 0.1 }),
  bump: () => playTone({ frequency: 150, endFrequency: 55, duration: 0.18, type: 'square', volume: 0.12 }),
  cash: () => playMelody([[1319, 0, 0.06], [1760, 0.06, 0.06], [2093, 0.12, 0.2]], 'square'),
  alert: () => playMelody([[880, 0, 0.1], [660, 0.13, 0.1], [880, 0.26, 0.12]], 'square'),
};

const NOTE_OFFSETS = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** Convierte 'A4', 'C#5'... en frecuencia (Hz). */
export function noteFrequency(name) {
  const match = /^([A-G])(#?)(\d)$/.exec(name);
  if (!match) return 0;
  const [, letter, sharp, octave] = match;
  const semitones = NOTE_OFFSETS[letter] + (sharp ? 1 : 0) + (Number(octave) - 4) * 12;
  return 440 * 2 ** (semitones / 12);
}

const MUSIC_LOOKAHEAD_SECONDS = 0.2;
const MUSIC_TICK_MS = 50;

/**
 * Bucle musical sencillo en corcheas. melody y bass son cadenas de notas separadas por
 * espacios ('C5 E5 - G5'); '-' es silencio. El silencio global se respeta nota a nota.
 */
export function createMusicLoop({ bpm, melody, bass = '' }) {
  const melodyNotes = melody.split(/\s+/).map(noteFrequency);
  const bassNotes = bass.split(/\s+/).filter(Boolean).map(noteFrequency);
  const stepSeconds = 60 / bpm / 2;
  let timer = null;
  let stepIndex = 0;
  let nextTime = 0;

  function schedule() {
    const context = getContext();
    if (!context) return;
    while (nextTime < context.currentTime + MUSIC_LOOKAHEAD_SECONDS) {
      const delay = Math.max(0, nextTime - context.currentTime);
      const lead = melodyNotes[stepIndex % melodyNotes.length];
      if (lead) playTone({ frequency: lead, delay, duration: stepSeconds * 0.9, type: 'triangle', volume: 0.045 });
      const bassNote = bassNotes.length && stepIndex % 2 === 0 ? bassNotes[(stepIndex / 2) % bassNotes.length] : 0;
      if (bassNote) playTone({ frequency: bassNote, delay, duration: stepSeconds * 1.6, type: 'sine', volume: 0.07 });
      nextTime += stepSeconds;
      stepIndex += 1;
    }
  }

  return {
    start() {
      const context = getContext();
      if (!context || timer) return;
      stepIndex = 0;
      nextTime = context.currentTime + 0.05;
      schedule();
      timer = setInterval(schedule, MUSIC_TICK_MS);
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
  };
}
