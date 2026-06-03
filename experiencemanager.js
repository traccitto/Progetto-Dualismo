class ExperienceManager {
  constructor() {
    // Inizializzazione stati, timer di standby e variabili per effetti visivi (fade/flash)
    this.stato = "MENU";
    this.ultimaAttivita = millis();
    this.timeoutStandby = 10000;
    this.fadeAlpha = 0;
    this.transizioneInCorso = false;
    this.prossimoStato = "";
    
    // Variabili per la gestione dei potenziamenti (PowerUp) e collisioni tra mani
    this.powerUpSX = 0;
    this.powerUpDX = 0;
    this.timerPowerUp = 0;
    this.durataPowerUp = 5000; 
    this.scontroAvvenuto = false;
    this.triggerFlashGlobale = false; // Flag per il flash sincronizzato
  }

  updateTransitions() {
    // Gestione dell'animazione di dissolvenza (fade) durante il cambio di stato
    if (this.transizioneInCorso) {
      this.fadeAlpha += 10;
      if (this.fadeAlpha >= 255) {
        this.stato = this.prossimoStato;
        this.transizioneInCorso = false;
      }
    } else if (this.fadeAlpha > 0) {
      this.fadeAlpha -= 10;
    }
  }

  cambiaStato(nuovo) {
    // Avvio della procedura di transizione verso un nuovo stato dell'esperienza
    if (this.stato !== nuovo && !this.transizioneInCorso) {
      this.transizioneInCorso = true;
      this.prossimoStato = nuovo;
    }
  }

  resetPowerUps() {
    // Controllo del timer per azzerare i PowerUp allo scadere della durata
    if (this.stato !== "PLAY") return;
    if (millis() - this.timerPowerUp > this.durataPowerUp) {
      this.powerUpSX = 0;
      this.powerUpDX = 0;
    }
  }

  gestisciCollisione(hands) {
    // Rilevamento vicinanza tra gli indici delle mani per attivare PowerUp e flash
    if (hands.length >= 2) {
      let p1 = hands[0].keypoints[8];
      let p2 = hands[1].keypoints[8];
      
      if (dist(p1.x, p1.y, p2.x, p2.y) < 50) {
        if (!this.scontroAvvenuto) {
          this.timerPowerUp = millis(); 
          this.triggerFlashGlobale = true; // Attiva il flash globale per il draw
          
          // Incremento del livello PowerUp in base alla posizione X dello scontro
          let puntoX = (p1.x + p2.x) / 2;
          if (puntoX > 320) {
            this.powerUpDX = min(this.powerUpDX + 1, 2);
          } else {
            this.powerUpSX = min(this.powerUpSX + 1, 2);
          }
          this.scontroAvvenuto = true;
        }
      } else {
        // Reset del flag per permettere una nuova collisione dopo il distanziamento
        this.scontroAvvenuto = false;
      }
    }
  }
}