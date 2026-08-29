import { ResourceType } from '../types/game';

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  // Helper to create gain node with master volume
  private createMasterGain(): GainNode | null {
    if (this.isMuted || !this.ctx) return null;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    gain.connect(this.ctx.destination);
    return gain;
  }

  // 1. Sword Slash / Swing
  public playSwordSwing() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  // 2. Entity Hit / Punch Sound
  public playHitSound(isCrit = false) {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const baseFreq = isCrit ? 220 : 160;
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);

    if (isCrit) {
      // Extra crisp pop for critical hit
      const critOsc = this.ctx.createOscillator();
      const critGain = this.ctx.createGain();
      critOsc.type = 'sine';
      critOsc.frequency.setValueAtTime(880, this.ctx.currentTime);
      critOsc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.08);
      critGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      critGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      critOsc.connect(critGain);
      critGain.connect(master);
      critOsc.start();
      critOsc.stop(this.ctx.currentTime + 0.08);
    }
  }

  // 3. Arrow Hit Ding (Hypixel style high pitch ding)
  public playArrowDing() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, this.ctx.currentTime); // C6
    osc.frequency.exponentialRampToValueAtTime(1318.5, this.ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
  }

  // 4. Bow Shoot Twang
  public playBowShoot() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // 5. Block Place
  public playBlockPlace(type?: string) {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let freq = 120;
    if (type?.includes('wool')) freq = 90;
    else if (type?.includes('endstone') || type?.includes('obsidian')) freq = 200;
    else if (type?.includes('wood')) freq = 150;

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.07);
  }

  // 6. Block Break
  public playBlockBreak() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    // Noise burst simulation
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    noise.start();
  }

  // 7. Resource Pickup (Iron, Gold, Diamond, Emerald with escalating pitches)
  public playPickup(type: ResourceType) {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let pitch = 587.33; // Iron: D5
    if (type === 'gold') pitch = 783.99; // G5
    else if (type === 'diamond') pitch = 987.77; // B5
    else if (type === 'emerald') pitch = 1318.51; // E6

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(master);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 8. Bed Destroy Dramatic Fanfare
  public playBedBreak() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const notes = [220, 293.66, 220, 164.81]; // Epic warning chord
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(master);

      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.4);
    });
  }

  // 9. Explosion (TNT / Fireball)
  public playExplosion() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    // Sub bass drop + white noise
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.5);
    oscGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    osc.connect(oscGain);
    oscGain.connect(master);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
  }

  // 10. TNT Fuse Hiss
  public playTNTFuse() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500, this.ctx.currentTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start();
  }

  // 11. Buy Item / Cash register
  public playBuySound() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    [783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.06 + 0.1);
      osc.connect(gain);
      gain.connect(master);
      osc.start(this.ctx.currentTime + idx * 0.06);
      osc.stop(this.ctx.currentTime + idx * 0.06 + 0.1);
    });
  }

  // 12. Potion Drink
  public playPotionDrink() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300 + Math.random() * 200, this.ctx.currentTime + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + i * 0.08 + 0.06);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.08 + 0.06);
      osc.connect(gain);
      gain.connect(master);
      osc.start(this.ctx.currentTime + i * 0.08);
      osc.stop(this.ctx.currentTime + i * 0.08 + 0.06);
    }
  }

  // 13. Teleport (Ender Pearl)
  public playTeleport() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  // 14. Victory Fanfare
  public playVictory() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.15);
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.15 + 0.6);
      osc.connect(gain);
      gain.connect(master);
      osc.start(this.ctx.currentTime + idx * 0.15);
      osc.stop(this.ctx.currentTime + idx * 0.15 + 0.6);
    });
  }

  // 15. Footstep
  public playFootstep() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 30, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // 16. Insufficient Currency / Error Buzzer
  public playErrorSound() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, this.ctx.currentTime);
    osc.frequency.setValueAtTime(100, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.19);
  }

  // 17. Team Upgrade Chime
  public playUpgradeSound() {
    this.initContext();
    const master = this.createMasterGain();
    if (!master || !this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C E G C E
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.05);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.05 + 0.2);
      osc.connect(gain);
      gain.connect(master);
      osc.start(this.ctx.currentTime + idx * 0.05);
      osc.stop(this.ctx.currentTime + idx * 0.05 + 0.22);
    });
  }
}

export const soundManager = new SoundManager();
