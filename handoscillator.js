class HandOscillator {
  constructor(side) {
    this.side = side; 
    // Inizializzazione LFO per l'effetto tremolo
    this.lfo = new p5.Oscillator('sine');
    this.lfo.disconnect();
    this.lfo.freq(0);
    this.lfo.start();

    // Configurazione oscillatori e decadimento riverbero in base alla mano (Left/Right)
    if (this.side === "Left") {
      this.osc1 = new p5.Oscillator('square');  
      this.osc2 = new p5.Oscillator('sawtooth');
      this.decay = 6; 
    } else {
      this.osc1 = new p5.Oscillator('sawtooth'); 
      this.osc2 = new p5.Oscillator('square'); 
      this.decay = 2.5;
    }

    // Routing audio: connessione degli oscillatori al filtro passa-basso
    this.filter = new p5.LowPass();
    this.osc1.disconnect();
    this.osc2.disconnect();
    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);

    // Applicazione del riverbero al segnale filtrato
    this.reverb = new p5.Reverb();
    this.reverb.process(this.filter, this.decay, 2);
    if (typeof this.reverb.drywet === 'function') {
      this.reverb.drywet(0.4);
    }
    this.playing = false;
  }

  update(xPos, yPos, apertura) {
    let baseFreq, amp, filterFreq, resValue;
    let tremoloSpeed = 0, tremoloAmount = 0;

    // Calcolo dinamico del tremolo basato sulla chiusura della mano
    if (apertura < 100) {
      tremoloSpeed = map(apertura, 100, 20, 0, 18); 
      tremoloAmount = map(apertura, 100, 20, 0, 0.5);
    }
    this.lfo.freq(tremoloSpeed, 0.1);

    // Mappatura parametri sonori (frequenza, filtro, ampiezza) differenziata per lato
    if (this.side === "Left") {
      baseFreq = map(yPos, height, 0, 40, 250);  
      filterFreq = map(apertura, 20, 250, 120, 3500);
      resValue = 6;     
      amp = constrain(map(apertura, 20, 250, 0.2, 1.0), 0.2, 1.0); 
    } else {
      let jitter = random(-2, 2);
      baseFreq = map(yPos, height, 0, 200, 850) + jitter; 
      filterFreq = map(apertura, 20, 250, 450, 4000); 
      resValue = 12;                                  
      amp = constrain(map(apertura, 20, 250, 0.08, 0.45), 0.08, 0.45);
    }

    // Applicazione dei parametri di sintesi e attivazione oscillatori
    if (!window.audioEnabled) {
      if (this.playing) {
        this.stop();
      }
      return;
    }

    let currentAmp = amp * (1 - tremoloAmount + (this.lfo.getAmp() * tremoloAmount));
    const masterVolume = 0.45;
    currentAmp *= masterVolume;
    this.filter.freq(filterFreq, 0.1);
    this.filter.res(resValue);

    if (!this.playing) {
      this.osc1.start();
      this.osc2.start();
      this.playing = true;
    }

    // Gestione frequenze (con detune), panning spaziale e volume finale
    this.osc1.freq(baseFreq, 0.1);
    let detune = (this.side === "Left") ? 1.012 : 2.02; 
    this.osc2.freq(baseFreq * detune, 0.1);
    
    let panValue = map(xPos, 0, width, -0.7, 0.7);
    this.osc1.pan(panValue, 0.1);
    this.osc2.pan(panValue, 0.1);
    
    this.osc1.amp(currentAmp, 0.05);
    this.osc2.amp(currentAmp * 0.75, 0.05); 
  }

  stop() {
    // Spegnimento graduale (fade-out) degli oscillatori
    if (this.playing) {
      this.osc1.amp(0, 0.05);
      this.osc2.amp(0, 0.05);
      if (this.reverb && typeof this.reverb.drywet === 'function') {
        this.reverb.drywet(0);
      }
      this.osc1.stop();
      this.osc2.stop();
      this.playing = false;
    }
  }
}