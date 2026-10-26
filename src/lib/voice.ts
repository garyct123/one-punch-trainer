// 語音、提示音、震動。全部可關閉，不支援時安靜降級。
let audioCtx: AudioContext | null = null;
let zhVoice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  if (typeof speechSynthesis === 'undefined') return;
  const vs = speechSynthesis.getVoices();
  zhVoice = vs.find((v) => /zh[-_]TW/i.test(v.lang)) ?? vs.find((v) => /zh/i.test(v.lang)) ?? null;
}

if (typeof speechSynthesis !== 'undefined') {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export const speechSupported = () => typeof speechSynthesis !== 'undefined';

/** iOS 需要在使用者點擊時先解鎖音訊與語音 */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC && !audioCtx) audioCtx = new AC();
    audioCtx?.resume();
    if (speechSupported()) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  } catch {
    /* 忽略 */
  }
}

export function speak(text: string, enabled: boolean): boolean {
  if (!enabled || !speechSupported()) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    if (zhVoice) u.voice = zhVoice;
    u.rate = 1.05;
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function beep(enabled: boolean, freq = 880, ms = 150) {
  if (!enabled) return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    const ctx = audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch {
    /* 忽略 */
  }
}

export function vibrate(enabled: boolean, pattern: number | number[] = 80) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iOS Safari 不支援，忽略 */
  }
}

// 螢幕常亮（支援的瀏覽器才啟用）
let wakeLock: any = null;
export async function keepAwake(on: boolean) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      wakeLock.addEventListener?.('release', () => (wakeLock = null));
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}
