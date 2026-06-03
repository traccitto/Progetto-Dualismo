// --- CLASSE ENERGY PARTICLE ---
class EnergyParticle {
  constructor(id) {
    // Inizializzazione proprietà fisiche, estetiche e parametri di orbita della particella
    this.id = id;
    this.pos = p5.Vector.random3D().mult(random(200, 500)); 
    this.vel = createVector(0, 0, 0);
    this.acc = createVector(0, 0, 0);
    this.size = random(6, 12); 
    this.alpha = 0; 
    this.color = color(255);
    this.drag = 0.985; 
    this.influenceRadius = random(250, 450); 
    this.angle = random(TWO_PI);
    this.orbitSpeed = random(0.005, 0.015);
    this.orbitRadius = dist(0, 0, this.pos.x, this.pos.z);
    this.flashAmount = 0;
  }

  // Attivazione dell'effetto visivo di flash luminoso
  flash() { this.flashAmount = 255; }

  // Gestione del comportamento in stato di riposo: orbita circolare e ritorno alla posizione originale
  fade() {
    this.alpha = lerp(this.alpha, 30, 0.02); 
    this.angle += this.orbitSpeed;
    let targetX = cos(this.angle) * this.orbitRadius;
    let targetZ = sin(this.angle) * this.orbitRadius;
    let orbitPos = createVector(targetX, this.pos.y, targetZ);
    let recall = p5.Vector.sub(orbitPos, this.pos);
    this.acc.add(recall.mult(0.01)); 
    if (this.flashAmount > 0) this.flashAmount -= 15;
  }

  // Logica di interazione: attrazione verso il centro, rotazione orbitale e turbolenza basata sulla distanza
  behave(center, d, col, side) {
    this.color = col;
    let distance = p5.Vector.dist(this.pos, center);
    let targetAlpha = map(distance, 0, this.influenceRadius, 255, 0, true);
    this.alpha = lerp(this.alpha, targetAlpha, 0.1);
    if (this.alpha < 10) return; 

    // Calcolo forza di attrazione e movimento rotatorio differenziato per lato
    let force = p5.Vector.sub(center, this.pos);
    force.normalize();
    let strength = map(d, 20, 200, 3.5, 0.5, true); 
    this.acc.add(force.mult(strength));

    let orbit = createVector(-force.y, force.x, force.z * 0.01);
    let spin = (side === "Left") ? 1.8 : 2.5; 
    this.acc.add(orbit.mult(spin * map(d, 20, 150, 1, 0.1, true)));

    // Aggiunta di jitter casuale e gestione del decadimento del flash
    if (d < 80) this.acc.add(p5.Vector.random3D().mult(2));
    this.acc.add(this.vel.copy().mult(-0.02));
    if (this.flashAmount > 0) this.flashAmount -= 15;
  }

  // Integrazione fisica: aggiornamento di velocità, posizione e reset dell'accelerazione
  update() {
    this.vel.add(this.acc);
    this.vel.mult(this.drag);
    this.vel.limit(18);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  // Rendering a schermo: calcolo del colore finale e disegno della geometria in base al livello di potenza
  show(livello) {
    if (this.alpha < 5) return; 
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    noStroke();
    let intensita = map(this.flashAmount, 0, 255, 0, 1);
    let finalColor = lerpColor(this.color, color(255), intensita);
    fill(red(finalColor), green(finalColor), blue(finalColor), this.alpha);

    // Selezione della complessità della sfera basata sul livello di PowerUp
    if (livello === 1) sphere(this.size * 1, 3, 5);
    else if (livello === 2) sphere(this.size * 4, 2, 2);
    else sphere(this.size, 7, 7);
    pop();
  }
}