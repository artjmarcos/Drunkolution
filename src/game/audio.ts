export function playTone(frequency = 440, duration = 0.12) {
  if (typeof window === "undefined") {
    return;
  }

  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const audio = new AudioCtx();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.02;

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    audio.close();
  }, duration * 1000);
}
