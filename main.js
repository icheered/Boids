// Constants
const NUMBER_OF_BOIDS = 1000;
const SPEED = 5;
const MAX_TURN_RATE = 0.1;
const NEARBY_DISTANCE = 300;
const SEPARATION_DISTANCE = 50;
const LENGTH = 10;
const WIDTH = 10;
const BOUNDS = {
    x: { min: 0, max: window.innerWidth - 9 },
    y: { min: 0, max: window.innerHeight - 9 }
};

class Boid {
    constructor(init_x = Math.random() * BOUNDS.x.max, init_y = Math.random() * BOUNDS.y.max, speed = 1) {
        this.x = init_x;
        this.y = init_y;
        this.speed = speed;
        this.angle = Math.random() * 2 * Math.PI - Math.PI;
        this.dx = Math.cos(this.angle) * this.speed;
        this.dy = Math.sin(this.angle) * this.speed;
    }

    update(boids, spatialHash) {
        const neighbors = this.getNeighbors(spatialHash);
        const { cohesion, alignment, separation } = this.calculateForces(neighbors);
        const avoidBorders = this.avoidBorders();

        let targetDx = this.dx + cohesion.x + alignment.x + separation.x + avoidBorders.x;
        let targetDy = this.dy + cohesion.y + alignment.y + separation.y + avoidBorders.y;

        let targetAngle = Math.atan2(targetDy, targetDx);
        let angleDiff = (targetAngle - this.angle + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        let turn = Math.max(-MAX_TURN_RATE, Math.min(MAX_TURN_RATE, angleDiff));

        this.angle += turn;
        this.dx = Math.cos(this.angle) * this.speed;
        this.dy = Math.sin(this.angle) * this.speed;

        this.x += this.dx * SPEED;
        this.y += this.dy * SPEED;

        this.x = Math.max(BOUNDS.x.min, Math.min(BOUNDS.x.max, this.x));
        this.y = Math.max(BOUNDS.y.min, Math.min(BOUNDS.y.max, this.y));
    }

    getNeighbors(spatialHash) {
        const cellSize = NEARBY_DISTANCE;
        const cellX = Math.floor(this.x / cellSize);
        const cellY = Math.floor(this.y / cellSize);
        const neighbors = [];

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const cell = spatialHash.get(`${cellX + i},${cellY + j}`);
                if (cell) {
                    neighbors.push(...cell);
                }
            }
        }

        return neighbors.filter(boid =>
            boid !== this &&
            Math.hypot(boid.x - this.x, boid.y - this.y) < NEARBY_DISTANCE
        );
    }

    calculateForces(neighbors) {
        let cohesionX = 0, cohesionY = 0;
        let alignmentDx = 0, alignmentDy = 0;
        let separationX = 0, separationY = 0;
        let count = 0;

        for (const boid of neighbors) {
            const dx = boid.x - this.x;
            const dy = boid.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < SEPARATION_DISTANCE * SEPARATION_DISTANCE) {
                separationX -= dx;
                separationY -= dy;
            }

            cohesionX += boid.x;
            cohesionY += boid.y;
            alignmentDx += boid.dx;
            alignmentDy += boid.dy;
            count++;
        }

        if (count > 0) {
            cohesionX = (cohesionX / count - this.x) * 0.0005;
            cohesionY = (cohesionY / count - this.y) * 0.0005;
            alignmentDx = (alignmentDx / count - this.dx) * 0.05;
            alignmentDy = (alignmentDy / count - this.dy) * 0.05;
        }

        return {
            cohesion: { x: cohesionX, y: cohesionY },
            alignment: { x: alignmentDx, y: alignmentDy },
            separation: { x: separationX * 0.05, y: separationY * 0.05 }
        };
    }

    avoidBorders() {
        const margin = NEARBY_DISTANCE;
        let avoidX = 0, avoidY = 0;

        if (this.x < margin) avoidX = margin - this.x;
        else if (this.x > BOUNDS.x.max - margin) avoidX = BOUNDS.x.max - margin - this.x;

        if (this.y < margin) avoidY = margin - this.y;
        else if (this.y > BOUNDS.y.max - margin) avoidY = BOUNDS.y.max - margin - this.y;

        return { x: avoidX * 0.05, y: avoidY * 0.05 };
    }
}

class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    update(boids) {
        this.grid.clear();
        for (const boid of boids) {
            const cellX = Math.floor(boid.x / this.cellSize);
            const cellY = Math.floor(boid.y / this.cellSize);
            const key = `${cellX},${cellY}`;
            if (!this.grid.has(key)) {
                this.grid.set(key, []);
            }
            this.grid.get(key).push(boid);
        }
    }

    get(key) {
        return this.grid.get(key);
    }
}

function init() {
    console.log("Running init")

    const button = document.getElementById('start');
    // Hide button
    button.style.display = 'none';

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const boids = Array.from({ length: NUMBER_OF_BOIDS }, () => new Boid(BOUNDS.x.max / 2, BOUNDS.y.max / 2));
    const spatialHash = new SpatialHash(NEARBY_DISTANCE);

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        spatialHash.update(boids);

        for (const boid of boids) {
            boid.update(boids, spatialHash);

            ctx.save();
            ctx.translate(boid.x, boid.y);
            ctx.rotate(boid.angle + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -LENGTH / 2);
            ctx.lineTo(WIDTH / 2, LENGTH / 2);
            ctx.lineTo(-WIDTH / 2, LENGTH / 2);
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.restore();
        }
        // Draw the borders of the screen
        ctx.beginPath();
        ctx.moveTo(BOUNDS.x.min, BOUNDS.y.min);
        ctx.lineTo(BOUNDS.x.max, BOUNDS.y.min);
        ctx.lineTo(BOUNDS.x.max, BOUNDS.y.max);
        ctx.lineTo(BOUNDS.x.min, BOUNDS.y.max);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();

        requestAnimationFrame(animate);
    }

    animate();
}

function listenToButton() {
    const button = document.getElementById('start');
    button.addEventListener('click', init);
}

//window.onload = listenToButton;
window.onload = init;
