// ============================================
// MUSHOKU TENSEI VR - GAME LOGIC
// ============================================

const GameState = {
    running: false,
    health: 100,
    maxHealth: 100,
    mana: 100,
    maxMana: 100,
    level: 1,
    xp: 0,
    xpMax: 100,
    wave: 1,
    enemies: [],
    projectiles: [],
    currentSpell: 0,
    lastShot: 0,
    shootCooldown: 350,
    spawnInterval: null,
    manaRegenInterval: null,
    enemiesRemaining: 0,
    kills: 0
};

// ============================================
// SORTS MAGIQUES
// ============================================
const SPELLS = [
    {
        name: 'Boule de Feu',
        icon: '🔥',
        color: '#ff4400',
        emissive: '#ff6600',
        manaCost: 5,
        damage: 3,
        speed: 0.6,
        radius: 0.25,
        projectileColor: '#ff2200'
    },
    {
        name: 'Glace',
        icon: '💧',
        color: '#44aaff',
        emissive: '#88ddff',
        manaCost: 8,
        damage: 5,
        speed: 0.4,
        radius: 0.2,
        projectileColor: '#88ddff'
    },
    {
        name: 'Foudre',
        icon: '⚡',
        color: '#ffdd00',
        emissive: '#ffff00',
        manaCost: 12,
        damage: 8,
        speed: 1.2,
        radius: 0.15,
        projectileColor: '#ffff00'
    }
];

// ============================================
// DÉMARRAGE DU JEU
// ============================================
function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';
    
    GameState.running = true;
    GameState.health = 100;
    GameState.mana = 100;
    GameState.level = 1;
    GameState.xp = 0;
    GameState.wave = 1;
    
    updateHUD();
    updateSpellVisual();
    
    // Démarrage des systèmes
    startWave();
    GameState.manaRegenInterval = setInterval(regenerateMana, 1000);
    
    showMessage('✨ Bienvenue, Rudeus !', '#ffd700');
    setTimeout(() => showMessage('🌊 Vague 1 commence...', '#ff6b6b'), 1500);
}

// ============================================
// GESTION DES VAGUES
// ============================================
function startWave() {
    const count = 3 + GameState.wave * 2;
    GameState.enemiesRemaining = count;
    document.getElementById('wave').textContent = GameState.wave;
    updateHUD();
    
    let spawned = 0;
    const spawnTimer = setInterval(() => {
        if (spawned >= count || !GameState.running) {
            clearInterval(spawnTimer);
            return;
        }
        spawnEnemy();
        spawned++;
    }, 900);
}

function checkWaveEnd() {
    if (GameState.enemies.length === 0 && GameState.enemiesRemaining <= 0) {
        GameState.wave++;
        showMessage(`🌊 Vague ${GameState.wave} approche !`, '#ff6b6b');
        setTimeout(startWave, 3000);
    }
}

// ============================================
// SPAWN DES MONSTRES
// ============================================
function spawnEnemy() {
    if (!GameState.running) return;
    
    const scene = document.querySelector('a-scene');
    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 10;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    const enemy = document.createElement('a-entity');
    enemy.setAttribute('position', `${x} 0 ${z}`);
    enemy.setAttribute('enemy-ai', '');
    
    // Choix du type de monstre
    const types = ['slime', 'goblin', 'wolf'];
    const type = types[Math.floor(Math.random() * Math.min(types.length, 1 + GameState.wave))];
    enemy.enemyType = type;
    
    let hp, speed, color, size, dmg;
    
    switch(type) {
        case 'slime':
            hp = 3; speed = 0.012; color = '#44cc44'; size = 1; dmg = 5;
            break;
        case 'goblin':
            hp = 5; speed = 0.02; color = '#aa6622'; size = 1.2; dmg = 10;
            break;
        case 'wolf':
            hp = 4; speed = 0.035; color = '#666666'; size = 0.9; dmg = 8;
            break;
    }
    
    // Ajustement selon la vague
    hp = Math.floor(hp * (1 + GameState.wave * 0.15));
    enemy.health = hp;
    enemy.maxHealth = hp;
    enemy.speed = speed;
    enemy.damage = dmg;
    enemy.attackCooldown = 0;
    
    buildEnemyMesh(enemy, type, color, size);
    
    scene.appendChild(enemy);
    GameState.enemies.push(enemy);
}

function buildEnemyMesh(enemy, type, color, size) {
    // Corps principal
    const body = document.createElement('a-sphere');
    body.setAttribute('radius', (0.5 * size).toString());
    body.setAttribute('color', color);
    body.setAttribute('position', `0 ${0.5 * size} 0`);
    body.setAttribute('material', `emissive: ${color}; emissiveIntensity: 0.3`);
    enemy.appendChild(body);
    
    // Yeux rouges
    const eye1 = document.createElement('a-sphere');
    eye1.setAttribute('radius', '0.1');
    eye1.setAttribute('color', '#ff0000');
    eye1.setAttribute('position', `${-0.15 * size} ${0.6 * size} ${-0.4 * size}`);
    eye1.setAttribute('material', 'emissive: #ff0000; emissiveIntensity: 2');
    enemy.appendChild(eye1);
    
    const eye2 = document.createElement('a-sphere');
    eye2.setAttribute('radius', '0.1');
    eye2.setAttribute('color', '#ff0000');
    eye2.setAttribute('position', `${0.15 * size} ${0.6 * size} ${-0.4 * size}`);
    eye2.setAttribute('material', 'emissive: #ff0000; emissiveIntensity: 2');
    enemy.appendChild(eye2);
    
    // Barre de vie au-dessus
    const healthBarBg = document.createElement('a-plane');
    healthBarBg.setAttribute('width', (1.2 * size).toString());
    healthBarBg.setAttribute('height', '0.1');
    healthBarBg.setAttribute('color', '#333');
    healthBarBg.setAttribute('position', `0 ${1.3 * size} 0`);
    healthBarBg.setAttribute('rotation', '0 0 0');
    healthBarBg.classList.add('health-bar-bg');
    enemy.appendChild(healthBarBg);
    
    const healthBar = document.createElement('a-plane');
    healthBar.setAttribute('width', (1.2 * size).toString());
    healthBar.setAttribute('height', '0.1');
    healthBar.setAttribute('color', '#ff0000');
    healthBar.setAttribute('position', `0 ${1.3 * size} 0.01`);
    healthBar.classList.add('health-bar');
    enemy.appendChild(healthBar);
}

// ============================================
// TIR DES SORTS
// ============================================
document.addEventListener('click', handleShoot);
document.addEventListener('touchstart', (e) => {
    if (GameState.running && e.target.tagName !== 'BUTTON') handleShoot();
});

// Changer de sort avec les touches 1-3
document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '3') {
        GameState.currentSpell = parseInt(e.key) - 1;
        updateSpellVisual();
    }
});

function updateSpellVisual() {
    // Mise à jour HUD
    document.querySelectorAll('.spell-slot').forEach((slot, i) => {
        slot.classList.toggle('active', i === GameState.currentSpell);
    });
    
    // Mise à jour orbe
    const spell = SPELLS[GameState.currentSpell];
    const orb = document.getElementById('spell-orb');
    if (orb) {
        orb.setAttribute('material', 
            `color: ${spell.color}; emissive: ${spell.emissive}; emissiveIntensity: 1.5; opacity: 0.8`);
    }
}

function handleShoot() {
    if (!GameState.running) return;
    
    const now = Date.now();
    if (now - GameState.lastShot < GameState.shootCooldown) return;
    
    const spell = SPELLS[GameState.currentSpell];
    
    // Vérifier le mana
    if (GameState.mana < spell.manaCost) {
        showMessage('💧 Pas assez de mana !', '#ff6b6b');
        return;
    }
    
    GameState.mana -= spell.manaCost;
    GameState.lastShot = now;
    updateHUD();
    
    // Animation de l'orbe
    const orb = document.getElementById('spell-orb');
    if (orb) {
        orb.setAttribute('material', 
            `color: #ffffff; emissive: #ffffff; emissiveIntensity: 3; opacity: 1`);
        setTimeout(() => {
            orb.setAttribute('material', 
                `color: ${spell.color}; emissive: ${spell.emissive}; emissiveIntensity: 1.5; opacity: 0.8`);
        }, 80);
    }
    
    // Récupérer la direction du regard
    const camera = document.querySelector('[camera]');
    const direction = new THREE.Vector3();
    camera.object3D.getWorldDirection(direction);
    
    const origin = new THREE.Vector3();
    camera.object3D.getWorldPosition(origin);
    
    // Créer un projectile visuel
    createProjectile(origin, direction, spell);
}

function createProjectile(origin, direction, spell) {
    const scene = document.querySelector('a-scene');
    const proj = document.createElement('a-sphere');
    proj.setAttribute('radius', spell.radius.toString());
    proj.setAttribute('color', spell.projectileColor);
    proj.setAttribute('material', 
        `emissive: ${spell.projectileColor}; emissiveIntensity: 2; opacity: 0.9`);
    proj.setAttribute('position', `${origin.x} ${origin.y} ${origin.z}`);
    
    // Lumière attachée
    const light = document.createElement('a-entity');
    light.setAttribute('light', `type: point; color: ${spell.projectileColor}; intensity: 1; distance: 5`);
    proj.appendChild(light);
    
    scene.appendChild(proj);
    
    const projectileData = {
        element: proj,
        direction: direction.clone(),
        speed: spell.speed,
        damage: spell.damage,
        life: 0,
        maxLife: 120,
        spell: spell
    };
    
    GameState.projectiles.push(projectileData);
}

// ============================================
// UPDATE DES PROJECTILES
// ============================================
function updateProjectiles() {
    const projectilesToRemove = [];
    
    GameState.projectiles.forEach((proj, index) => {
        proj.life++;
        
        // Avancer
        const pos = proj.element.object3D.position;
        pos.x += proj.direction.x * proj.speed;
        pos.y += proj.direction.y * proj.speed;
        pos.z += proj.direction.z * proj.speed;
        
        // Rotation
        proj.element.object3D.rotation.x += 0.15;
        proj.element.object3D.rotation.y += 0.15;
        
        // Vérifier collisions avec ennemis
        let hit = false;
        for (const enemy of GameState.enemies) {
            const enemyPos = enemy.object3D.position;
            const dist = Math.sqrt(
                Math.pow(pos.x - enemyPos.x, 2) +
                Math.pow(pos.y - enemyPos.y - 0.5, 2) +
                Math.pow(pos.z - enemyPos.z, 2)
            );
            
            if (dist < 1) {
                damageEnemy(enemy, proj.damage);
                hit = true;
                break;
            }
        }
        
        // Retirer si trop vieux, hors limites ou touche
        if (hit || proj.life > proj.maxLife || pos.y < 0 || 
            Math.abs(pos.x) > 50 || Math.abs(pos.z) > 50) {
            projectilesToRemove.push(index);
            if (!hit) createImpactEffect(pos, proj.spell.projectileColor);
        }
    });
    
    // Nettoyer
    projectilesToRemove.reverse().forEach(i => {
        const p = GameState.projectiles[i];
        p.element.parentNode && p.element.parentNode.removeChild(p.element);
        GameState.projectiles.splice(i, 1);
    });
}

// ============================================
// DÉGÂTS AUX ENNEMIS
// ============================================
function damageEnemy(enemy, damage) {
    enemy.health -= damage;
    
    // Flash
    const body = enemy.querySelector('a-sphere');
    if (body) {
        const originalColor = body.getAttribute('color');
        body.setAttribute('color', '#ffffff');
        setTimeout(() => {
            if (body.parentNode) body.setAttribute('color', originalColor);
        }, 100);
    }
    
    // Mise à jour barre de vie
    const healthBar = enemy.querySelector('.health-bar');
    if (healthBar) {
        const ratio = Math.max(0, enemy.health / enemy.maxHealth);
        const parent = healthBar.parentNode;
        const bg = parent.querySelector('.health-bar-bg');
        const baseWidth = parseFloat(bg.getAttribute('width'));
        healthBar.setAttribute('width', (baseWidth * ratio).toString());
        
        // Décalage pour centrer
        const offset = (baseWidth * (1 - ratio)) / 2;
        const bgPos = bg.getAttribute('position');
        healthBar.setAttribute('position', `${bgPos.x - offset} ${bgPos.y} ${parseFloat(bgPos.z) + 0.01}`);
    }
    
    if (enemy.health <= 0) {
        killEnemy(enemy);
    }
}

function killEnemy(enemy) {
    const pos = enemy.object3D.position.clone();
    createExplosion(pos, enemy.enemyType);
    
    // XP et score
    addXP(15);
    GameState.kills++;
    GameState.enemiesRemaining = Math.max(0, GameState.enemiesRemaining - 1);
    
    // Retirer
    enemy.parentNode && enemy.parentNode.removeChild(enemy);
    const idx = GameState.enemies.indexOf(enemy);
    if (idx > -1) GameState.enemies.splice(idx, 1);
    
    updateHUD();
    checkWaveEnd();
}

// ============================================
// EFFETS VISUELS
// ============================================
function createExplosion(position, type) {
    const scene = document.querySelector('a-scene');
    const colors = {
        slime: ['#44ff44', '#88ff88', '#22aa22'],
        goblin: ['#ffaa44', '#ff8844', '#cc6622'],
        wolf: ['#aaaaaa', '#888888', '#666666']
    };
    const palette = colors[type] || colors.slime;
    
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('a-sphere');
        p.setAttribute('radius', '0.15');
        p.setAttribute('color', palette[i % palette.length]);
        p.setAttribute('material', `emissive: ${palette[i % palette.length]}; emissiveIntensity: 1.5`);
        p.setAttribute('position', `${position.x} ${position.y + 0.5} ${position.z}`);
        scene.appendChild(p);
        
        const vel = {
            x: (Math.random() - 0.5) * 0.4,
            y: Math.random() * 0.4,
            z: (Math.random() - 0.5) * 0.4
        };
        
        let life = 0;
        const interval = setInterval(() => {
            life++;
            const pos = p.getAttribute('position');
            vel.y -= 0.02;
            p.setAttribute('position', 
                `${pos.x + vel.x} ${pos.y + vel.y} ${pos.z + vel.z}`);
            p.setAttribute('material', 
                `emissiveIntensity: ${2 - life * 0.15}; opacity: ${1 - life * 0.08}`);
            
            if (life > 15) {
                clearInterval(interval);
                p.parentNode && p.parentNode.removeChild(p);
            }
        }, 30);
    }
}

function createImpactEffect(position, color) {
    const scene = document.querySelector('a-scene');
    const ring = document.createElement('a-ring');
    ring.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
    ring.setAttribute('radius-inner', '0.1');
    ring.setAttribute('radius-outer', '0.15');
    ring.setAttribute('color', color);
    ring.setAttribute('material', `emissive: ${color}; emissiveIntensity: 2; opacity: 0.9`);
    scene.appendChild(ring);
    
    let scale = 1;
    let opacity = 1;
    const interval = setInterval(() => {
        scale += 0.15;
        opacity -= 0.05;
        ring.setAttribute('radius-inner', (0.1 * scale).toString());
        ring.setAttribute('radius-outer', (0.15 * scale).toString());
        ring.setAttribute('material', `opacity: ${opacity}`);
        
        if (opacity <= 0) {
            clearInterval(interval);
            ring.parentNode && ring.parentNode.removeChild(ring);
        }
    }, 30);
}

function showMessage(text, color = '#ffd700') {
    const msg = document.createElement('div');
    msg.textContent = text;
    msg.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: ${color};
        font-size: 32px;
        font-weight: bold;
        text-shadow: 0 0 20px ${color};
        z-index: 150;
        pointer-events: none;
        animation: fadeIn 0.5s ease;
        white-space: nowrap;
    `;
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.style.transition = 'opacity 0.5s';
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 500);
    }, 1800);
}

// ============================================
// XP ET NIVEAUX
// ============================================
function addXP(amount) {
    GameState.xp += amount;
    
    while (GameState.xp >= GameState.xpMax) {
        GameState.xp -= GameState.xpMax;
        GameState.level++;
        GameState.xpMax = Math.floor(GameState.xpMax * 1.4);
        
        // Bonus de niveau
        GameState.maxHealth += 20;
        GameState.maxMana += 20;
        GameState.health = GameState.maxHealth;
        GameState.mana = GameState.maxMana;
        
        showLevelUp();
    }
    
    updateHUD();
}

function showLevelUp() {
    const text = document.createElement('div');
    text.className = 'level-up-text';
    text.textContent = `⬆ NIVEAU ${GameState.level} !`;
    document.body.appendChild(text);
    setTimeout(() => text.remove(), 2000);
}

// ============================================
// DÉGÂTS AU JOUEUR
// ============================================
function damagePlayer(amount) {
    if (!GameState.running) return;
    
    GameState.health -= amount;
    updateHUD();
    
    // Effet visuel
    const overlay = document.getElementById('damage-overlay');
    overlay.classList.add('active');
    setTimeout(() => overlay.classList.remove('active'), 100);
    
    if (GameState.health <= 0) {
        gameOver();
    }
}

// ============================================
// RÉGÉNÉRATION DE MANA
// ============================================
function regenerateMana() {
    if (!GameState.running) return;
    GameState.mana = Math.min(GameState.maxMana, GameState.mana + 3);
    updateHUD();
}

// ============================================
// MISE À JOUR DU HUD
// ============================================
function updateHUD() {
    document.getElementById('health').textContent = Math.max(0, Math.floor(GameState.health));
    document.getElementById('mana').textContent = Math.floor(GameState.mana);
    document.getElementById('level').textContent = GameState.level;
    document.getElementById('xp').textContent = Math.floor(GameState.xp);
    document.getElementById('xpMax').textContent = GameState.xpMax;
    document.getElementById('enemiesLeft').textContent = 
        GameState.enemies.length + GameState.enemiesRemaining;
    document.getElementById('wave').textContent = GameState.wave;
}

// ============================================
// GAME OVER
// ============================================
function gameOver() {
    GameState.running = false;
    clearInterval(GameState.spawnInterval);
    clearInterval(GameState.manaRegenInterval);
    
    // Nettoyer
    GameState.enemies.forEach(e => e.parentNode && e.parentNode.removeChild(e));
    GameState.projectiles.forEach(p => p.element.parentNode && p.element.parentNode.removeChild(p.element));
    GameState.enemies = [];
    GameState.projectiles = [];
    
    const screen = document.getElementById('start-screen');
    screen.innerHTML = `
        <div class="start-content">
            <h1 style="color:#ff4444; text-shadow: 0 0 30px #ff4444;">💀 GAME OVER</h1>
            <h2>Rudeus est tombé au combat...</h2>
            <p class="intro">
                Niveau atteint : <strong style="color:#ffd700;">${GameState.level}</strong><br>
                Vagues survécues : <strong style="color:#88ddff;">${GameState.wave}</strong><br>
                Monstres éliminés : <strong style="color:#ff8844;">${GameState.kills}</strong>
            </p>
            <button onclick="location.reload()">🔄 RENAÎTRE</button>
        </div>
    `;
    screen.style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('crosshair').style.display = 'none';
}

// ============================================
// COMPOSANT IA ENNEMI (A-Frame)
// ============================================
AFRAME.registerComponent('enemy-ai', {
    init: function() {
        this.bobPhase = Math.random() * Math.PI * 2;
        this.lastAttack = 0;
    },
    
    tick: function(time, delta) {
        if (!GameState.running) return;
        
        const enemy = this.el;
        const enemyPos = enemy.object3D.position;
        const player = document.getElementById('player');
        const playerPos = player.object3D.position;
        
        const dx = playerPos.x - enemyPos.x;
        const dz = playerPos.z - enemyPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        // Se déplacer vers le joueur
        if (dist > 1.5) {
            const speed = enemy.speed || 0.02;
            const moveFactor = speed * (delta / 16);
            enemyPos.x += (dx / dist) * moveFactor;
            enemyPos.z += (dz / dist) * moveFactor;
            
            // Bob vertical (sautillement)
            this.bobPhase += 0.15;
            enemyPos.y = Math.abs(Math.sin(this.bobPhase)) * 0.15;
        } else {
            // Attaque
            if (Date.now() - this.lastAttack > 1200) {
                this.lastAttack = Date.now();
                damagePlayer(enemy.damage || 10);
                
                // Effet d'attaque
                enemy.setAttribute('scale', '1.3 1.3 1.3');
                setTimeout(() => enemy.setAttribute('scale', '1 1 1'), 150);
            }
        }
        
        // Regarder vers le joueur
        const angle = Math.atan2(dx, dz);
        enemy.object3D.rotation.y = angle;
        
        // Faire flotter la barre de vie vers la caméra
        const healthBarBg = enemy.querySelector('.health-bar-bg');
        if (healthBarBg) {
            const camera = document.querySelector('[camera]');
            const camPos = camera.object3D.position;
            const barAngle = Math.atan2(camPos.x - enemyPos.x, camPos.z - enemyPos.z);
            healthBarBg.object3D.rotation.y = barAngle - angle;
        }
    }
});

// ============================================
// BOUCLE DE JEU
// ============================================
let lastTime = performance.now();
function gameLoop() {
    const now = performance.now();
    lastTime = now;
    
    if (GameState.running) {
        updateProjectiles();
    }
    
    requestAnimationFrame(gameLoop);
}

// Démarrage de la boucle
requestAnimationFrame(gameLoop);

// ============================================
// INITIALISATION A-FRAME
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    console.log('⚔️ Mushoku Tensei VR chargé');
});
