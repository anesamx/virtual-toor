document.addEventListener('DOMContentLoaded', () => {
    const cursorBubble = document.getElementById('cursor-bubble');
    const bubbles = Array.from(document.querySelectorAll('.shape'));
    const allBubbles = [];

    // --- Configuration ---
    const CURSOR_BUBBLE_SIZE = 50;
    const DAMPING = 0.85; // Energy loss on collision. Lower is less bouncy.
    const GRAVITY = 0.1; // A slight pull downwards

    // --- Helper Functions ---
    const random = (min, max) => Math.random() * (max - min) + min;

    // --- Bubble Class ---
    class Bubble {
        constructor(element, isCursor = false) {
            this.element = element;
            this.isCursor = isCursor;
            this.radius = this.element.offsetWidth / 2;
            this.x = random(this.radius, window.innerWidth - this.radius);
            this.y = random(this.radius, window.innerHeight - this.radius);
            this.vx = random(-2, 2);
            this.vy = random(-2, 2);
            
            if (isCursor) {
                this.radius = CURSOR_BUBBLE_SIZE / 2;
                this.element.style.width = `${CURSOR_BUBBLE_SIZE}px`;
                this.element.style.height = `${CURSOR_BUBBLE_SIZE}px`;
                this.element.style.background = 'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,150,150,0.5) 100%)';
                this.prevX = this.x;
                this.prevY = this.y;
            }
        }

        update(mouseX, mouseY) {
            if (this.isCursor) {
                // Store previous position to calculate velocity
                this.prevX = this.x;
                this.prevY = this.y;
                // Update position to mouse location
                this.x = mouseX;
                this.y = mouseY;
                // Calculate velocity based on mouse movement
                this.vx = (this.x - this.prevX) * 0.5; // Multiplier for impact
                this.vy = (this.y - this.prevY) * 0.5;
            } else {
                // Apply gravity
                this.vy += GRAVITY;

                // Move bubble
                this.x += this.vx;
                this.y += this.vy;

                // Wall collisions
                if (this.x - this.radius <= 0) {
                    this.x = this.radius;
                    this.vx *= -1 * DAMPING;
                } else if (this.x + this.radius >= window.innerWidth) {
                    this.x = window.innerWidth - this.radius;
                    this.vx *= -1 * DAMPING;
                }

                if (this.y - this.radius <= 0) {
                    this.y = this.radius;
                    this.vy *= -1 * DAMPING;
                } else if (this.y + this.radius >= window.innerHeight) {
                    this.y = window.innerHeight - this.radius;
                    this.vy *= -1 * DAMPING;
                }
            }
        }

        draw() {
            this.element.style.transform = `translate(${this.x - this.radius}px, ${this.y - this.radius}px)`;
        }
    }
    
    // --- Collision Detection ---
    function resolveCollision(b1, b2) {
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = b1.radius + b2.radius;

        if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - distance;

            // Move bubbles apart to stop them from sticking
            const moveX = overlap * Math.cos(angle);
            const moveY = overlap * Math.sin(angle);
            
            if (!b1.isCursor) {
                 b1.x -= moveX / 2;
                 b1.y -= moveY / 2;
            }
            if (!b2.isCursor) {
                 b2.x += moveX / 2;
                 b2.y += moveY / 2;
            }

            // --- Physics of collision ---
            // Normal vector (direction of collision)
            const nx = dx / distance;
            const ny = dy / distance;

            // Relative velocity
            const rvx = b2.vx - b1.vx;
            const rvy = b2.vy - b1.vy;
            
            const velAlongNormal = rvx * nx + rvy * ny;
            
            // Do not resolve if velocities are separating
            if(velAlongNormal > 0) return;

            // Calculate impulse scalar (how much to bounce)
            const mass1 = b1.isCursor ? 3 : 1; // Give cursor mass
            const mass2 = b2.isCursor ? 3 : 1;
            const impulse = -2 * velAlongNormal / (1 / mass1 + 1 / mass2);
            
            // Apply impulse to non-cursor bubbles
            if (!b1.isCursor) {
                b1.vx -= impulse / mass1 * nx * DAMPING;
                b1.vy -= impulse / mass1 * ny * DAMPING;
            }
            if (!b2.isCursor) {
                b2.vx += impulse / mass2 * nx * DAMPING;
                b2.vy += impulse / mass2 * ny * DAMPING;
            }
        }
    }


    // --- Initialization ---
    bubbles.forEach(el => allBubbles.push(new Bubble(el)));
    const cursor = new Bubble(cursorBubble, true);
    allBubbles.push(cursor);
    
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // --- Animation Loop ---
    function animate() {
        // Update positions
        allBubbles.forEach(bubble => {
            bubble.update(mouseX, mouseY);
        });
        
        // Resolve collisions
        for (let i = 0; i < allBubbles.length; i++) {
            for (let j = i + 1; j < allBubbles.length; j++) {
                resolveCollision(allBubbles[i], allBubbles[j]);
            }
        }
        
        // Draw all bubbles to their new positions
        allBubbles.forEach(bubble => bubble.draw());

        requestAnimationFrame(animate);
    }

    animate();
});
