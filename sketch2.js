let boids = [];
let N = 0;
let center;

function setup() {
  createCanvas(windowWidth, windowHeight);

  N = width * height / 5000;

  for (let i = 0; i < N; i++) {
    boids.push(new Boid(random(width), random(height)));
  }

  center = createVector(width / 2, height / 2);

  background(30);
}

function draw() {
  fill(160, 210, 255);
  noStroke();
  rect(0, 0, width, height);

  for (let b of boids) {
    b.flock(boids);
    b.update();
    b.show();
  }
}

class Boid {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 4));
    this.acc = createVector(0, 0);
    this.maxForce = 0.08;
    this.maxSpeed = 3;
  }

  flock(boids) {

    let alignment = createVector(0, 0);
    let cohesion = createVector(0, 0);
    let separation = createVector(0, 0);

    let total = 0;

    // --- find nearest neighbours ---
    let neighbours = [];

    for (let other of boids) {
      if (other != this) {
        let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
        neighbours.push({boid: other, dist: d});
      }
    }

    neighbours.sort((a, b) => a.dist - b.dist);

    let count = min(6, neighbours.length);

    for (let i = 0; i < count; i++) {

      let other = neighbours[i].boid;
      let d = neighbours[i].dist;

      alignment.add(other.vel);
      cohesion.add(other.pos);

      let diff = p5.Vector.sub(this.pos, other.pos);
      diff.div(d * d);
      separation.add(diff);

      total++;
    }

    if (total > 0) {

      alignment.div(total);
      alignment.setMag(this.maxSpeed);
      alignment.sub(this.vel);
      alignment.limit(this.maxForce);

      cohesion.div(total);
      cohesion.sub(this.pos);
      cohesion.setMag(this.maxSpeed);
      cohesion.sub(this.vel);
      cohesion.limit(this.maxForce);

      separation.div(total);
      separation.setMag(this.maxSpeed);
      separation.sub(this.vel);
      separation.limit(this.maxForce);
    }

    this.acc.add(alignment.mult(1.0));
    this.acc.add(cohesion.mult(0.8));
    this.acc.add(separation.mult(1.5));

    // --- centre of gravity attraction ---
    let gravity = p5.Vector.sub(center, this.pos);
    gravity.setMag(this.maxSpeed);
    gravity.sub(this.vel);
    gravity.limit(this.maxForce);

    this.acc.add(gravity.mult(0.3));
  }

  update() {

    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;

    if (this.pos.y > height) {
      this.pos.y = height;
      this.vel.y *= -1;
    }

    if (this.pos.y < 0) {
      this.pos.y = 0;
      this.vel.y *= -1;
    }
  }

  show() {

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    fill(70, 30, 20);
    noStroke();

    beginShape();
    vertex(0, -5);
    vertex(12, 0);
    vertex(0, 5);
    endShape(CLOSE);

    pop();
  }
}
