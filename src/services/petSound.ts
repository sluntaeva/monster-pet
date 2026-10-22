export class PetSound {
  private context?: AudioContext;
  muted = false;
  async play(angry: boolean): Promise<boolean> {
    if (this.muted) return false;
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      await context.resume();
      if (context.state !== 'running' || this.muted) return false;
        const oscillator = context.createOscillator();
        const volume = context.createGain();
        const wobble = context.createOscillator();
        const depth = context.createGain();
        // A triangle and higher fundamental remain audible on small phone speakers.
        oscillator.type = angry ? 'sawtooth' : 'triangle';
        oscillator.frequency.setValueAtTime(angry ? 240 : 260, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(angry ? 100 : 190, context.currentTime + .75);
        wobble.frequency.value = angry ? 18 : 24; depth.gain.value = angry ? 35 : 25;
        wobble.connect(depth); depth.connect(oscillator.frequency);
        volume.gain.setValueAtTime(0, context.currentTime);
        volume.gain.linearRampToValueAtTime(angry ? .13 : .25, context.currentTime + .05);
        volume.gain.setValueAtTime(angry ? .13 : .25, context.currentTime + .5);
        volume.gain.exponentialRampToValueAtTime(.001, context.currentTime + .85);
        oscillator.connect(volume); volume.connect(context.destination);
        oscillator.start(); wobble.start(); oscillator.stop(context.currentTime + .9); wobble.stop(context.currentTime + .9);
        oscillator.onended = () => { oscillator.disconnect(); wobble.disconnect(); depth.disconnect(); volume.disconnect(); };
        return true;
    } catch { return false; }
  }
  close(): void { void this.context?.close(); }
}
