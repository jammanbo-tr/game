// RYTHM CANDY Game
class RythmCandy {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu';
        
        this.score = 0;
        this.level = 1;
        this.energy = 3;
        this.bestScore = localStorage.getItem('rythmCandyBestScore') || 0;
        
        this.player = null;
        this.targets = [];
        this.path = [];
        this.particles = [];
        
        this.gameSpeed = 100;
        this.pathProgress = 0;
        this.targetSpacing = 50;
        
        this.hitZoneRadius = 50;
        this.perfectZoneRadius = 20;
        this.greatZoneRadius = 35;
        
        this.animationId = null;
        this.lastTime = 0;
        
        this.initializeCanvas();
        this.generatePath();
        this.initializePlayer();
        this.setupEventListeners();
        this.updateUI();
    }
    
    initializeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.generatePath();
        });
    }
    
    generatePath() {
        this.path = [];
        const width = this.canvas.width;
        const height = this.canvas.height;
        const segments = 20;
        
        this.path.push({ x: 100, y: height / 2 });
        
        for (let i = 1; i < segments; i++) {
            const progress = i / segments;
            const x = 100 + (width - 200) * progress;
            
            const wave1 = Math.sin(progress * Math.PI * 3) * 100;
            const wave2 = Math.cos(progress * Math.PI * 5) * 50;
            const y = height / 2 + wave1 + wave2 * Math.sin(progress * Math.PI * 2);
            
            this.path.push({ x, y: Math.max(100, Math.min(height - 100, y)) });
        }
        
        this.path.push({ x: width - 100, y: height / 2 });
    }
    
    initializePlayer() {
        this.player = {
            x: this.path[0].x,
            y: this.path[0].y,
            size: 15,
            angle: 0,
            trail: []
        };
        this.pathProgress = 0;
    }
    
    generateTargets() {
        this.targets = [];
        const pathLength = this.getPathLength();
        let currentDistance = this.targetSpacing;
        
        while (currentDistance < pathLength - 200) {
            const position = this.getPositionAtDistance(currentDistance);
            if (position) {
                this.targets.push({
                    x: position.x,
                    y: position.y,
                    distance: currentDistance,
                    hit: false,
                    missed: false,
                    scale: 1,
                    pulsePhase: Math.random() * Math.PI * 2
                });
            }
            currentDistance += this.targetSpacing;
        }
    }
    
    getPathLength() {
        let length = 0;
        for (let i = 1; i < this.path.length; i++) {
            const dx = this.path[i].x - this.path[i-1].x;
            const dy = this.path[i].y - this.path[i-1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }
    
    getPositionAtDistance(distance) {
        let currentDistance = 0;
        
        for (let i = 1; i < this.path.length; i++) {
            const dx = this.path[i].x - this.path[i-1].x;
            const dy = this.path[i].y - this.path[i-1].y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);
            
            if (currentDistance + segmentLength >= distance) {
                const segmentProgress = (distance - currentDistance) / segmentLength;
                return {
                    x: this.path[i-1].x + dx * segmentProgress,
                    y: this.path[i-1].y + dy * segmentProgress
                };
            }
            currentDistance += segmentLength;
        }
        return null;
    }
    
    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('howToPlayBtn').addEventListener('click', () => {
            this.showScreen('howToPlay');
        });
        
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
            this.resetGame();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.gameState === 'playing') {
                e.preventDefault();
                this.handleInput();
            }
        });
        
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'playing') {
                this.handleInput();
            }
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'playing') {
                this.handleInput();
            }
        });
    }
    
    showScreen(screenName) {
        const screens = ['mainMenu', 'howToPlay', 'gamePlay', 'gameOver'];
        screens.forEach(screen => {
            const element = document.getElementById(screen);
            if (screen === screenName) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.showScreen('gamePlay');
        this.resetGame();
        this.generateTargets();
        this.gameLoop();
        
        this.showGameMessage('타이밍에 맞춰 터치하세요!', 3000);
    }
    
    resetGame() {
        this.score = 0;
        this.level = 1;
        this.energy = 3;
        this.gameSpeed = 100;
        this.pathProgress = 0;
        this.targetSpacing = 50;
        this.particles = [];
        this.initializePlayer();
        this.updateUI();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    handleInput() {
        const playerDistance = this.pathProgress * this.gameSpeed;
        let bestTarget = null;
        let bestDistance = Infinity;
        
        this.targets.forEach(target => {
            if (!target.hit && !target.missed) {
                const distance = Math.abs(target.distance - playerDistance);
                if (distance < bestDistance && distance < this.hitZoneRadius * 2) {
                    bestDistance = distance;
                    bestTarget = target;
                }
            }
        });
        
        if (bestTarget) {
            const hitAccuracy = this.calculateHitAccuracy(bestDistance);
            this.handleHit(bestTarget, hitAccuracy);
        }
    }
    
    calculateHitAccuracy(distance) {
        if (distance <= this.perfectZoneRadius) {
            return 'perfect';
        } else if (distance <= this.greatZoneRadius) {
            return 'great';
        } else if (distance <= this.hitZoneRadius) {
            return 'good';
        }
        return 'miss';
    }
    
    handleHit(target, accuracy) {
        target.hit = true;
        
        let points = 0;
        let feedbackText = '';
        
        switch (accuracy) {
            case 'perfect':
                points = 50;
                feedbackText = 'PERFECT!';
                break;
            case 'great':
                points = Math.floor(30 + Math.random() * 20);
                feedbackText = 'GREAT!';
                break;
            case 'good':
                points = 20;
                feedbackText = 'GOOD!';
                break;
        }
        
        if (points > 0) {
            this.score += points;
            this.createParticles(target.x, target.y, accuracy);
            this.showActionFeedback(feedbackText, accuracy);
            this.updateUI();
            this.checkLevelUp();
        }
    }
    
    checkMissedTargets() {
        const playerDistance = this.pathProgress * this.gameSpeed;
        
        this.targets.forEach(target => {
            if (!target.hit && !target.missed && target.distance < playerDistance - this.hitZoneRadius) {
                target.missed = true;
                this.energy--;
                this.showActionFeedback('MISS!', 'miss');
                this.updateUI();
                
                if (this.energy <= 0) {
                    this.gameOver();
                }
            }
        });
    }
    
    createParticles(x, y, type) {
        const colors = {
            perfect: ['#06ffa5', '#00ff88', '#00cc70'],
            great: ['#3a86ff', '#0066cc', '#004499'],
            good: ['#ffbe0b', '#ff9900', '#cc7700']
        };
        
        const particleColors = colors[type] || colors.good;
        
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1,
                color: particleColors[Math.floor(Math.random() * particleColors.length)],
                size: Math.random() * 4 + 2
            });
        }
    }
    
    showActionFeedback(text, type) {
        const feedback = document.getElementById('actionFeedback');
        feedback.textContent = text;
        feedback.className = `action-feedback ${type} show`;
        
        setTimeout(() => {
            feedback.classList.remove('show');
        }, 500);
    }
    
    showGameMessage(text, duration = 2000) {
        const message = document.getElementById('gameMessage');
        message.textContent = text;
        message.style.display = 'block';
        
        setTimeout(() => {
            message.style.display = 'none';
        }, duration);
    }
    
    checkLevelUp() {
        const newLevel = Math.floor(this.score / 500) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.gameSpeed += 20.0;
            this.targetSpacing = Math.max(30, this.targetSpacing - 10);
            this.showGameMessage(`LEVEL ${this.level}!`, 2000);
            this.generateTargets();
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        
        const hearts = document.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index < this.energy) {
                heart.classList.remove('lost');
            } else {
                heart.classList.add('lost');
            }
        });
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('rythmCandyBestScore', this.bestScore);
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('bestScore').textContent = this.bestScore;
        
        this.showScreen('gameOver');
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.pathProgress += deltaTime * 0.1 * this.gameSpeed;
        const playerDistance = this.pathProgress * this.gameSpeed;
        const playerPosition = this.getPositionAtDistance(playerDistance);
        
        if (playerPosition) {
            this.player.trail.push({ x: this.player.x, y: this.player.y });
            if (this.player.trail.length > 10) {
                this.player.trail.shift();
            }
            
            this.player.x = playerPosition.x;
            this.player.y = playerPosition.y;
            
            if (this.player.trail.length > 1) {
                const prev = this.player.trail[this.player.trail.length - 2];
                this.player.angle = Math.atan2(this.player.y - prev.y, this.player.x - prev.x);
            }
        } else {
            this.generatePath();
            this.pathProgress = 0;
            this.generateTargets();
        }
        
        this.targets.forEach(target => {
            target.pulsePhase += deltaTime * 0.02;
            target.scale = 1 + Math.sin(target.pulsePhase) * 0.2;
        });
        
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.8;
            particle.life -= deltaTime * 0.005;
            particle.size *= 0.99;
            return particle.life > 0 && particle.size > 0.5;
        });
        
        this.checkMissedTargets();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState !== 'playing') return;
        
        this.drawPath();
        this.drawTargets();
        this.drawPlayer();
        this.drawParticles();
    }
    
    drawPath() {
        this.ctx.strokeStyle = '#06ffa5';
        this.ctx.lineWidth = 4;
        this.ctx.shadowColor = '#06ffa5';
        this.ctx.shadowBlur = 10;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }
    
    drawTargets() {
        this.targets.forEach(target => {
            if (target.hit || target.missed) return;
            
            this.ctx.save();
            this.ctx.translate(target.x, target.y);
            this.ctx.scale(target.scale, target.scale);
            
            this.ctx.strokeStyle = '#ffbe0b';
            this.ctx.lineWidth = 3;
            this.ctx.shadowColor = '#ffbe0b';
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.hitZoneRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.strokeStyle = '#3a86ff';
            this.ctx.shadowColor = '#3a86ff';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.greatZoneRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.strokeStyle = '#06ffa5';
            this.ctx.shadowColor = '#06ffa5';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.perfectZoneRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.restore();
            this.ctx.shadowBlur = 0;
        });
    }
    
    drawPlayer() {
        this.ctx.strokeStyle = '#ff006e';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#ff006e';
        this.ctx.shadowBlur = 10;
        
        if (this.player.trail.length > 1) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.trail[0].x, this.player.trail[0].y);
            for (let i = 1; i < this.player.trail.length; i++) {
                const alpha = i / this.player.trail.length;
                this.ctx.globalAlpha = alpha * 0.7;
                this.ctx.lineTo(this.player.trail[i].x, this.player.trail[i].y);
            }
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
        
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.angle);
        
        this.ctx.fillStyle = '#ff006e';
        this.ctx.shadowColor = '#ff006e';
        this.ctx.shadowBlur = 20;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.size, 0);
        this.ctx.lineTo(-this.player.size, -this.player.size * 0.7);
        this.ctx.lineTo(-this.player.size * 0.5, 0);
        this.ctx.lineTo(-this.player.size, this.player.size * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
        this.ctx.shadowBlur = 0;
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 10;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
        this.ctx.shadowBlur = 0;
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        if (this.gameState === 'playing') {
            this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
}

window.addEventListener('load', () => {
    new RythmCandy();
});
