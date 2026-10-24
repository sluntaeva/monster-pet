export type SoundEffect = 'feed' | 'play' | 'rest' | 'start' | 'catch' | 'miss' | 'finish' | 'reward' | 'buy';
const melodies: Record<SoundEffect, number[]> = {
  feed: [440, 330, 440, 520], play: [392, 523, 659], rest: [392, 330, 262],
  start: [330, 440, 660], catch: [660, 880], miss: [180, 110],
  finish: [523, 440, 392], reward: [523, 659, 784, 1047], buy: [740, 988],
};
export class PetSound {
  private context?: AudioContext;
  private disabled = false;
  private sources = new Set<OscillatorNode>();
  get muted(): boolean { return this.disabled; }
  set muted(value: boolean) {
    this.disabled = value;
    if (value) for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } }
  }
  // Invoke directly in a tap handler, before waiting for the server, for mobile audio.
  async unlock(): Promise<boolean> {
    if (this.muted || document.hidden) return false;
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== 'running') await this.context.resume();
      return this.context.state === 'running' && !this.muted && !document.hidden;
    } catch { return false; }
  }
  private tone(frequency: number, when: number, duration: number, type: OscillatorType, volume: number, endFrequency = frequency): void {
    const context = this.context!;
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
    gain.gain.setValueAtTime(0, when); gain.gain.linearRampToValueAtTime(volume, when + .012);
    gain.gain.exponentialRampToValueAtTime(.001, when + duration);
    oscillator.connect(gain); gain.connect(context.destination); this.sources.add(oscillator);
    oscillator.onended = () => { this.sources.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(when); oscillator.stop(when + duration + .02);
  }
  async effect(effect: SoundEffect): Promise<boolean> {
    if (!await this.unlock()) return false;
    const context = this.context!; const notes = melodies[effect];
    const step = effect === 'rest' ? .18 : .09;
    notes.forEach((note, index) => this.tone(note, context.currentTime + index * step, step + .04, 'triangle', .12));
    return true;
  }
  async play(angry: boolean): Promise<boolean> {
    if (!await this.unlock()) return false;
    this.tone(angry ? 240 : 260, this.context!.currentTime, .8, angry ? 'sawtooth' : 'triangle', angry ? .09 : .2, angry ? 100 : 190);
    return true;
  }
  close(): void { this.muted = true; void this.context?.close(); }
}
