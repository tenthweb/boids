// Sharks and Fish Boids Simulator in p5.js
// Stable version with:
// - Fish lifespans
// - Reproduction + death sliders
// - Safe separation math (no divide-by-zero)
// - Offset newborn spawning
// - Probabilistic reproduction

let fish = [];
let sharks = [];

let reproSlider, deathSlider;

const INITIAL_FISH = 120;
const INITIAL_SHARKS = 3;

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);

  // UI sliders
  reproSlider = createSlider(0.5, 2.0, 1.0, 0.01);
  reproSlider.position(20, 20);

  deathSlider = createSlider(0.05, 0.5, 0.1, 0.01);
  deathSlider.position(20, 50);

  for (let i = 0; i < INITIAL_FISH; i++) {
    fish.push(new Fish());
  }

  for (let i = 0; i < INITIAL_SHARKS; i++) {
    sharks.push(new Shark());
  }
}

function draw() {
  background(20, 30, 50);

  fill(255);
  textSize(12);
  text("Fish reproduction", reproSlider.x * 2 + reproSlider.width, 35);
  text("Fish death rate", deathSlider.x * 2 + deathSlider.width, 65);

  for (let s of sharks) {
    s.update();
    s.show();
  }

  for (let f of fish) {
    f.flock(fish);
    f.avoid(sharks);
    f.update();
    f.show();
  }

  fish = fish.filter(f => f.energy > 0);
  sharks = sharks.filter(s => s.energy > 0);
}

class Fish {
  constructor(x, y) {
    this.pos = createVector(x || random(width), y || random(height));
    this.vel = p5.Vector.random2D();
    this.acc = createVector();
    this.maxSpeed = 2.5;
    this.maxForce = 0.05;

    this.energy = random(50, 100);
    this.age = 0;
    this.lifespan = random(2000, 4000);
  }

  edges() {
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = height;
  }

  flock(fish) {
    let align = this.align(fish);
    let coh = this.cohesion(fish);
    let sep = this.separation(fish);

    align.mult(1.0);
    coh.mult(0.8);
    sep.mult(1.5);

    this.acc.add(align);
    this.acc.add(coh);
    this.acc.add(sep);
  }

  avoid(sharks) {
    for (let s of sharks) {
      let d = dist(this.pos.x, this.pos.y, s.pos.x, s.pos.y);
      if (d < 120) {
        let flee = p5.Vector.sub(this.pos, s.pos);
        flee.setMag(this.maxSpeed);
        flee.sub(this.vel);
        flee.limit(this.maxForce * 3);
        this.acc.add(flee);
      }
    }
  }

  align(fish) {
    let perception = 50;
    let steering = createVector();
    let total = 0;

    for (let other of fish) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (other != this && d < perception) {
        steering.add(other.vel);
        total++;
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }

    return steering;
  }

  cohesion(fish) {
    let perception = 50;
    let steering = createVector();
    let total = 0;

    for (let other of fish) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (other != this && d < perception) {
        steering.add(other.pos);
        total++;
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.sub(this.pos);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }

    return steering;
  }

  separation(fish) {
    let perception = 30;
    let steering = createVector();
    let total = 0;

    for (let other of fish) {
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);

      if (other != this && d < perception && d > 0.0001) {
        let diff = p5.Vector.sub(this.pos, other.pos);

        // Safe division (prevents singularity)
        diff.div(max(d * d, 0.01));

        steering.add(diff);
        total++;
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }

    return steering;
  }

  reproduce() {
    let factor = reproSlider.value();
    let threshold = 100 * (1 / factor);

    if (this.energy > threshold && random() < 0.02) {
      this.energy -= 50;

      // Spawn baby slightly offset
      let offset = p5.Vector.random2D().mult(5);

      fish.push(
        new Fish(
          this.pos.x + offset.x,
          this.pos.y + offset.y
        )
      );
    }
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    this.energy -= deathSlider.value();
    this.age += 1;

    this.reproduce();

    if (this.age > this.lifespan) {
      this.energy = 0;
    }

    this.edges();
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    fill(100, 200, 255);
    noStroke();
    triangle(0, 0, -8, 4, -8, -4);
    pop();
  }
}

class Shark {
  constructor(x, y) {
    this.pos = createVector(x || random(width), y || random(height));
    this.vel = p5.Vector.random2D();
    this.acc = createVector();
    this.maxSpeed = 3.5;
    this.maxForce = 0.08;

    this.energy = 200;
  }

  hunt() {
    let closest = null;
    let record = Infinity;

    for (let f of fish) {
      let d = dist(this.pos.x, this.pos.y, f.pos.x, f.pos.y);
      if (d < record) {
        record = d;
        closest = f;
      }
    }

    if (closest) {
      let desired = p5.Vector.sub(closest.pos, this.pos);
      desired.setMag(this.maxSpeed);
      let steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce);
      this.acc.add(steer);

      if (record < 10) {
        fish.splice(fish.indexOf(closest), 1);
        this.energy += 80;
      }
    }
  }

  reproduce() {
    if (this.energy > 300 && random() < 0.01) {
      this.energy *= 0.6;

      let offset = p5.Vector.random2D().mult(10);

      sharks.push(
        new Shark(
          this.pos.x + offset.x,
          this.pos.y + offset.y
        )
      );
    }
  }

  edges() {
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = height;
  }

  update() {
    this.hunt();

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    this.energy -= 0.3;

    this.reproduce();
    this.edges();
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    fill(255, 100, 100);
    noStroke();
    triangle(0, 0, -12, 6, -12, -6);
    pop();
  }
}

function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
}
