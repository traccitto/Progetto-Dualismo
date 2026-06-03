// --- VARIABILI GLOBALI ---
let video, handPose, hands = [];
let port, connectBtn, particlePool = [], oscSX, oscDX, pinchGif, mgr;
let gradImg; 

// Monitoraggio livelli per flash selettivo
let livSXPrec = 0;
let livDXPrec = 0;

function preload() {
  handPose = ml5.handPose();
  pinchGif = loadImage('pinch.gif');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  mgr = new ExperienceManager();
  
  video = createCapture(VIDEO); 
  video.size(640, 480); 
  video.hide();
  video.style('display', 'none');
  
  port = createSerial();
  connectBtn = createButton('');
  connectBtn.class('connect-arduino-btn');
  connectBtn.html('<img src="Arduino.svg" alt="Arduino" class="arduino-logo">');
  connectBtn.attribute('title', 'Connetti Arduino');
  connectBtn.mousePressed(() => { 
    if (!port.opened()) port.open(9600); 
    userStartAudio(); 
  });
  
  handPose.detectStart(video, (results) => hands = results);
  
  // Creazione pool di 1500 particelle
  for (let i = 0; i < 1500; i++) particlePool.push(new EnergyParticle(i));
  
  oscSX = new HandOscillator('Left'); 
  oscDX = new HandOscillator('Right'); 

  // Gradiente per lo sfondo del menu
  gradImg = createGraphics(256, 1);
  for (let i = 0; i < 256; i++) {
    let inter = map(i, 0, 255, 0, 1);
    let c = lerpColor(color(0, 100, 255), color(255, 50, 0), inter);
    gradImg.stroke(c);
    gradImg.line(i, 0, i, 1);
  }
}

function draw() {
  mgr.updateTransitions(); 
  mgr.resetPowerUps();
  
  // --- GESTIONE SCRITTE HTML (VS e FOOTER) ---
  let footer = select('#footer-text'); 
  let vs = select('#vs-overlay');
  
  // Se siamo in PLAY, nascondi le scritte, altrimenti mostrale
  if (mgr.stato === "PLAY") {
    if(footer) footer.removeClass('show-footer');
    if(vs) vs.removeClass('show-vs');
  } else {
    if(footer) footer.addClass('show-footer');
    if(vs) vs.addClass('show-vs');
  }

  if (mgr.stato === "PLAY") {
    connectBtn.hide(); 
    background(5, 5, 15);
    
    // Logica collisioni
    mgr.gestisciCollisione(hands);

    // Flash globale allo scontro (trigger dal manager)
    if (mgr.triggerFlashGlobale) {
      particlePool.forEach(p => p.flash());
      mgr.triggerFlashGlobale = false;
    }

    // Flash selettivo per i livelli PowerUp
    if (mgr.powerUpSX > livSXPrec) particlePool.filter(p => p.id < 750).forEach(p => p.flash());
    if (mgr.powerUpDX > livDXPrec) particlePool.filter(p => p.id >= 750).forEach(p => p.flash());
    
    livSXPrec = mgr.powerUpSX;
    livDXPrec = mgr.powerUpDX;
    
    eseguiEsperienza();
    
    // Controllo inattività
    if (!hands.some(h => h.confidence > 0.1) && millis() - mgr.ultimaAttivita > mgr.timeoutStandby) {
      mgr.cambiaStato("STANDBY");
    } else if (hands.length > 0) {
      mgr.ultimaAttivita = millis();
    }
  } else {
    // Stato MENU o STANDBY
    clear(); 
    connectBtn.show(); 
    disegnaMenu();
    for (let h of hands) {
      let d = dist(h.keypoints[4].x, h.keypoints[4].y, h.keypoints[8].x, h.keypoints[8].y);
      if (d < 35) mgr.cambiaStato("PLAY");
    }
  }

  // Fade nero per transizioni
  if (mgr.fadeAlpha > 0) { 
    push(); resetMatrix(); translate(-width/2, -height/2, 2); 
    fill(0, 0, 0, mgr.fadeAlpha); noStroke(); rect(0, 0, width, height); pop();
  }
}

// --- FUNZIONI DI SUPPORTO ---

function disegnaMenu() {
  noStroke();
  push(); translate(0, 0, -100); texture(gradImg); tint(255, 120); 
  plane(width * 1.5, height * 1.5); pop();

  let brilla = (mgr.stato === "STANDBY") ? map(sin(frameCount * 0.03), -1, 1, 100, 255) : 255;
  if (pinchGif) {
    push(); tint(255, brilla); texture(pinchGif);
    let dim = 120, distC = 220;
    push(); translate(-distC, 0, 100); scale(-1, 1, 1); plane(dim, dim); pop();
    push(); translate(distC, 0, 100); plane(dim, dim); pop();
    pop();
  }
}

function eseguiEsperienza() {
  ambientLight(100); 
  pointLight(255, 255, 255, 0, 0, 500); 
  blendMode(ADD); 
  
  let hL = hands.find(h => h.handedness === "Right"), hR = hands.find(h => h.handedness === "Left");
  
  if (hL) {
    let c = createVector(map((hL.keypoints[4].x+hL.keypoints[8].x)/2,0,640,width/2,-width/2), map((hL.keypoints[4].y+hL.keypoints[8].y)/2,0,480,-height/2,height/2),0);
    let d = dist(hL.keypoints[4].x, hL.keypoints[4].y, hL.keypoints[8].x, hL.keypoints[8].y);
    oscSX.update(c.x+width/2, c.y+height/2, d);
    particlePool.filter(p => p.id < 750).forEach(p => p.behave(c, d, color(100,150,255), "Left"));
  } else { 
    oscSX.stop(); 
    particlePool.filter(p => p.id < 750).forEach(p => p.fade()); 
  }

  if (hR) {
    let c = createVector(map((hR.keypoints[4].x+hR.keypoints[8].x)/2,0,640,width/2,-width/2), map((hR.keypoints[4].y+hR.keypoints[8].y)/2,0,480,-height/2,height/2),0);
    let d = dist(hR.keypoints[4].x, hR.keypoints[4].y, hR.keypoints[8].x, hR.keypoints[8].y);
    oscDX.update(c.x+width/2, c.y+height/2, d);
    particlePool.filter(p => p.id >= 750).forEach(p => p.behave(c, d, color(255,80,50), "Right"));
  } else { 
    oscDX.stop(); 
    particlePool.filter(p => p.id >= 750).forEach(p => p.fade()); 
  }

  particlePool.forEach(p => { 
    p.update(); 
    p.show(p.id < 750 ? mgr.powerUpSX : mgr.powerUpDX); 
  });
  blendMode(BLEND);
}

function mousePressed() { userStartAudio(); }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}