/**
 * Web Audio API synthesizer for VOLT sound effects and gym beats
 * No external MP3 files needed - 100% reliable, zero latency!
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isBeatPlaying = false;
  private beatInterval: number | null = null;
  private tempoBpm = 135;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play set checkmark sound (crisp rewarding chime)
  playSetDoneSound() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Rest timer countdown beep
  playTimerBeep(isFinal = false) {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = isFinal ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 440, now);
      if (isFinal) {
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.2); // D6
      }
      
      gain.gain.setValueAtTime(isFinal ? 0.4 : 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.4 : 0.15));
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + (isFinal ? 0.4 : 0.15));
    } catch {
      // Ignore
    }
  }

  // Workout completed fan-fare
  playCelebrationSound() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
      const now = this.ctx.currentTime;
      
      chords.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.25, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  // Toggle ambient workout pulse beat
  toggleBeat(bpm = 135, onPlayStateChange?: (playing: boolean) => void) {
    this.initContext();
    if (this.isBeatPlaying) {
      this.stopBeat();
      if (onPlayStateChange) onPlayStateChange(false);
      return false;
    } else {
      this.startBeat(bpm);
      if (onPlayStateChange) onPlayStateChange(true);
      return true;
    }
  }

  startBeat(bpm = 135) {
    this.initContext();
    if (this.beatInterval) clearInterval(this.beatInterval);
    this.tempoBpm = bpm;
    this.isBeatPlaying = true;
    let step = 0;

    const intervalMs = (60 / this.tempoBpm) * 1000 / 2; // 8th notes

    this.beatInterval = window.setInterval(() => {
      if (!this.ctx || !this.isBeatPlaying) return;
      const now = this.ctx.currentTime;

      // Kick on 1 and 3
      if (step % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      // Snare / clap on 2 and 4
      if (step % 4 === 2) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }

      // Hi-hat on every 8th
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      hatOsc.type = 'highpass' as unknown as OscillatorType;
      hatOsc.frequency.setValueAtTime(7000 + (step % 2 === 1 ? 800 : 0), now);
      hatGain.gain.setValueAtTime(0.03, now);
      hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      hatOsc.connect(hatGain);
      hatGain.connect(this.ctx.destination);
      hatOsc.start(now);
      hatOsc.stop(now + 0.04);

      step = (step + 1) % 16;
    }, intervalMs);
  }

  stopBeat() {
    this.isBeatPlaying = false;
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }

  isPlaying() {
    return this.isBeatPlaying;
  }
}

export const audioSynth = new AudioSynthesizer();
