// ============================================
// GAME.JS - Logique principale + contrôles mobiles
// ============================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { World } from './world.js';
import { Character3D, Enemy3D, NPC3D, Animal3D, CHARACTERS } from './characters.js';

// ============================================
// ÉTAT GLOBAL
// ============================================
const Game = {
    running: false,
    paused: false,
    selectedChar: null,
    world: null,
    player: null,
    enemies: [],
    npcs: [],
    animals: [],
    renderer: null,
    scene: null,
    camera: null,
    composer: null,
    clock: new THREE.Clock(),
    yaw: 0,
    pitch: 0,
    move: { x: 0, z: 0, active: false },
    lookTouch: { active: false, x: 0, y: 0, id: null },
    currentLocation: 'Buina Village',
    health: 100,
    maxHealth: 100,
    mana: 100,
    maxMana: 100,
    keys: {},
    lastAttack: 0,
    time: 0,
};

window.Game = Game;

// ============================================
// INITIALISATION DU MOTEUR
// ============================================
async function initEngine() {
    updateLoading(5, 'Initialisation du moteur 3D...');

    // Renderer WebGL haute qualité
    Game.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
    });
    Game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    Game.renderer.setSize(window.innerWidth, window.innerHeight);
    Game.renderer.shadowMap.enabled = true;
    Game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    Game.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    Game.renderer.toneMappingExposure = 1.1;
    Game.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    document.body.appendChild(Game.renderer.domElement);

    // Scène
    Game.scene = new THREE.Scene();

    // Caméra FPS
    Game.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    Game.camera.position.set(0, 1.7, 5);
    window.gameCamera = Game.camera;

    updateLoading(15, 'Construction du monde...');

    // Monde réaliste
    Game.world = new World(Game.scene, Game.renderer);
    await Game.world.build();

    updateLoading(70, 'Placement des personnages...');

    // PNJ
    spawnNPCs();
    
    // Créatures paisibles
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 15 + Math.random() * 60;
        Game.animals.push(new Animal3D(Game.scene, {
            x: Math.cos(angle) * r,
            z: Math.sin(angle) * r,
        }));
    }

    updateLoading(85, 'Configuration des effets...');

    // Post-processing (bloom pour effets magiques)
    setupPostProcessing();

    updateLoading(95, 'Prêt !');
    
    // Gestion du redimensionnement
    window.addEventListener('resize', onResize);
    
    // Touches clavier (fallback PC)
    window.addEventListener('keydown', e => Game.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => Game.keys[e.key.toLowerCase()] = false);
    
    updateLoading(100, 'Terminé');
}

function setupPostProcessing() {
    Game.composer = new EffectComposer(Game.renderer);
    Game.composer.addPass(new RenderPass(Game.scene, Game.camera));
    
    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,  // intensity
        0.6,  // radius
        0.85  // threshold
    );
    Game.composer.addPass(bloom);
    Game.composer.addPass(new OutputPass());
    Game.bloom = bloom;
}

function spawnNPCs() {
    const npcData = [
        { name: 'Villageois', position: { x: -3, y: 0, z: -5 }, color: 0x8b6914, hair: 0x3a2010 },
        { name: 'Marchand', position: { x: 10, y: 0, z: -8 }, color: 0x9c6b3c, hair: 0x1a0a05 },
        { name: 'Enfant', position: { x: 5, y: 0, z: 3 }, color: 0xdaa520, hair: 0xc8a060, scale: 0.7 },
        { name: 'Gardien', position: { x: -10, y: 0, z: -15 }, color: 0x606060, hair: 0x202020 },
        { name: 'Fermière', position: { x: 12, y: 0, z: 10 }, color: 0xc19a6b, hair: 0x8a5a20 },
    ];
    
    npcData.forEach(data => {
        Game.npcs.push(new NPC3D(Game.scene, data));
    });
}

// ============================================
// LANCEMENT DU JEU APRÈS SÉLECTION
// ============================================
function startGame() {
    if (!Game.selectedChar) return;
    
    const charConfig = CHARACTERS[Game.selectedChar];
    
    // Créer le personnage joueur
    Game.player = new Character3D(Game.scene, charConfig, { x: 0, y: 0, z: 8 });
    // Masquer le joueur en vue FPS
    Game.player.group.visible = false;
    
    Game.health = charConfig.health;
    Game.maxHealth = charConfig.health;
    Game.mana = charConfig.mana;
    Game.maxMana = charConfig.mana;
    
    // Mettre à jour le HUD
    document.getElementById('hud-avatar').textContent = charConfig.avatar;
    document.getElementById('hud-name').textContent = charConfig.name;
    updateHUD();
    
    // Afficher le jeu
    document.getElementById('char-select').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('joystick-container').style.display = 'block';
    
    Game.running = true;
    
    // Contrôles mobiles
    initMobileControls();
    initActionButtons();
    
    // Spawn ennemis
    spawnInitialEnemies();
    
    notify(`✨ Bienvenue, ${charConfig.name} !`, 2500);
    setTimeout(() => notify('🌍 Explore le monde', 2000), 2700);
    
    // Lancer la boucle
    animate();
}

function spawnInitialEnemies() {
    // Quelques ennemis autour du village
    const spawnPoints = [
        { x: 30, z: -30, type: 'goblin' },
        { x: -35, z: -25, type: 'goblin' },
        { x: 40, z: 20, type: 'bandit' },
        { x: -40, z: 30, type: 'wolf' },
        { x: 60, z: -20, type: 'bandit' },
        { x: -50, z: -50, type: 'orc' },
        { x: 25, z: 50, type: 'wolf' },
        { x: -30, z: 60, type: 'goblin' },
    ];
    
    spawnPoints.forEach(({ x, z, type }) => {
        const enemy = new Enemy3D(Game.scene, type, { x, y: 0, z });
        enemy.onAttack = (dmg) => damagePlayer(dmg);
        Game.enemies.push(enemy);
    });
}

// ============================================
// CONTRÔLES MOBILES
// ============================================
function initMobileControls() {
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    const maxDist = 40;
    
    // ---- JOYSTICK ----
    let joyId = null;
    const onStart = (e) => {
        e.preventDefault();
        if (joyId !== null) return;
        const t = e.changedTouches[0];
        joyId = t.identifier;
        Game.move.active = true;
    };
    
    const onMove = (e) => {
        if (joyId === null) return;
        for (const t of e.changedTouches) {
            if (t.identifier !== joyId) continue;
            const rect = base.getBoundingClientRect();
            let dx = t.clientX - (rect.left + rect.width / 2);
            let dy = t.clientY - (rect.top + rect.height / 2);
            const d = Math.hypot(dx, dy);
            if (d > maxDist) {
                dx = (dx / d) * maxDist;
                dy = (dy / d) * maxDist;
            }
            stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            Game.move.x = dx / maxDist;
            Game.move.z = dy / maxDist;
        }
    };
    
    const onEnd = (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === joyId) {
                joyId = null;
                Game.move.active = false;
                Game.move.x = 0;
                Game.move.z = 0;
                stick.style.transform = 'translate(-50%, -50%)';
            }
        }
    };
    
    base.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    
    // ---- REGARDER (côté droit de l'écran) ----
    let lookId = null;
    document.addEventListener('touchstart', (e) => {
        if (!Game.running) return;
        if (e.target.closest('#joystick-container')) return;
        if (e.target.closest('button')) return;
        if (lookId !== null) return;
        
        const t = e.changedTouches[0];
        if (t.clientX > window.innerWidth * 0.3) {
            lookId = t.identifier;
            Game.lookTouch.x = t.clientX;
            Game.lookTouch.y = t.clientY;
            Game.lookTouch.active = true;
        }
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
        if (!Game.lookTouch.active) return;
        for (const t of e.changedTouches) {
            if (t.identifier !== lookId) continue;
            const dx = t.clientX - Game.lookTouch.x;
            const dy = t.clientY - Game.lookTouch.y;
            
            Game.yaw -= dx * 0.003;
            Game.pitch -= dy * 0.003;
            Game.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, Game.pitch));
            
            Game.lookTouch.x = t.clientX;
            Game.lookTouch.y = t.clientY;
        }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
        for (const t of e.changedTouches) {
            if (t.identifier === lookId) {
                lookId = null;
                Game.lookTouch.active = false;
            }
        }
    });
    
    // ---- SOURIS (fallback PC) ----
    document.addEventListener('mousedown', () => {
        if (document.pointerLockElement !== document.body) {
            document.body.requestPointerLock();
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body) {
            Game.yaw -= e.movementX * 0.002;
            Game.pitch -= e.movementY * 0.002;
            Game.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, Game.pitch));
        }
    });
}

function initActionButtons() {
    document.getElementById('action-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        doAction();
    });
    document.getElementById('attack-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        doAttack();
    });
    
    document.getElementById('menu-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        showPauseMenu();
    });
    document.getElementById('vr-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleVR();
    });
}

// ============================================
// ACTIONS
// ============================================
function doAction() {
    if (!Game.running) return;
    // Sort magique avec effet
    const dir = new THREE.Vector3();
    Game.camera.getWorldDirection(dir);
    
    // Créer un projectile magique
    const orbGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({
        color: CHARACTERS[Game.selectedChar].accent,
        emissive: CHARACTERS[Game.selectedChar].accent,
        emissiveIntensity: 3,
        transparent: true,
        opacity: 0.9,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.copy(Game.camera.position).add(dir.clone().multiplyScalar(1.5));
    Game.scene.add(orb);
    
    const light = new THREE.PointLight(CHARACTERS[Game.selectedChar].accent, 15, 10);
    orb.add(light);
    
    const startPos = orb.position.clone();
    const velocity = dir.clone().multiplyScalar(25);
    
    // Animation
    let life = 0;
    const projectile = {
        mesh: orb,
        update(delta) {
            life += delta;
            orb.position.addScaledVector(velocity, delta);
            
            // Détection collision avec ennemis
            for (const enemy of Game.enemies) {
                if (enemy.dead) continue;
                const d = orb.position.distanceTo(enemy.group.position);
                if (d < 1.2) {
                    const dead = enemy.takeDamage(40);
                    if (dead) {
                        Game.enemies = Game.enemies.filter(e => e !== enemy);
                    }
                    createExplosion(orb.position, CHARACTERS[Game.selectedChar].accent);
                    this.destroy = true;
                    break;
                }
            }
            
            if (life > 3 || orb.position.y < 0.1) this.destroy = true;
        },
        destroy: false,
    };
    
    Game.projectiles = Game.projectiles || [];
    Game.projectiles.push(projectile);
    
    notify(`✨ Sort lancé !`, 1000);
}

function doAttack() {
    if (!Game.running) return;
    const now = performance.now();
    if (now - Game.lastAttack < 500) return;
    Game.lastAttack = now;
    
    // Attaque à courte portée
    const camPos = Game.camera.position;
    const dir = new THREE.Vector3();
    Game.camera.getWorldDirection(dir);
    
    let hit = false;
    for (const enemy of Game.enemies) {
        if (enemy.dead) continue;
        const toEnemy = enemy.group.position.clone().sub(camPos);
        const d = toEnemy.length();
        if (d > 3) continue;
        toEnemy.normalize();
        const dot = toEnemy.dot(dir);
        if (dot > 0.7) {
            const dead = enemy.takeDamage(25);
            if (dead) Game.enemies = Game.enemies.filter(e => e !== enemy);
            createExplosion(enemy.group.position.clone().setY(1.2), 0xff6600);
            hit = true;
            break;
        }
    }
    
    if (hit) notify('⚔️ Touché !', 800);
}

function createExplosion(pos, color) {
    const count = 20;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            Math.random() * 5,
            (Math.random() - 0.5) * 6
        ));
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({
        color,
        size: 0.15,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    
    const points = new THREE.Points(geo, mat);
    Game.scene.add(points);
    
    let life = 0;
    const interval = setInterval(() => {
        life += 1;
        const arr = geo.attributes.position.array;
        for (let i = 0; i < count; i++) {
            arr[i * 3] += velocities[i].x * 0.05;
            arr[i * 3 + 1] += velocities[i].y * 0.05;
            arr[i * 3 + 2] += velocities[i].z * 0.05;
            velocities[i].y -= 0.3;
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = 1 - life / 30;
        if (life > 30) {
            clearInterval(interval);
            Game.scene.remove(points);
        }
    }, 30);
}

// ============================================
// DÉGÂTS JOUEUR
// ============================================
function damagePlayer(amount) {
    if (!Game.running) return;
    Game.health -= amount;
    updateHUD();
    flashDamage();
    
    if (Game.health <= 0) {
        gameOver();
    }
}

function flashDamage() {
    const el = document.getElementById('damage-flash');
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 120);
}

// ============================================
// BOUCLE PRINCIPALE
// ============================================
function animate() {
    if (!Game.running) return;
    requestAnimationFrame(animate);
    
    const delta = Math.min(Game.clock.getDelta(), 0.05);
    Game.time += delta;
    
    if (!Game.paused) {
        updatePlayer(delta);
        updateEnemies(delta);
        updateProjectiles(delta);
        updateCompass();
        checkLocation();
        updateWorld(delta);
    }
    
    // Rendu avec post-processing
    if (Game.composer) {
        Game.composer.render();
    } else {
        Game.renderer.render(Game.scene, Game.camera);
    }
}

function updatePlayer(delta) {
    if (!Game.player) return;
    
    const char = CHARACTERS[Game.selectedChar];
    
    // Direction depuis joystick + clavier
    let moveX = Game.move.x;
    let moveZ = Game.move.z;
    
    // Fallback clavier
    if (Game.keys['w'] || Game.keys['z']) moveZ = -1;
    if (Game.keys['s']) moveZ = 1;
    if (Game.keys['a'] || Game.keys['q']) moveX = -1;
    if (Game.keys['d']) moveX = 1;
    
    if (Math.abs(moveX) < 0.1 && Math.abs(moveZ) < 0.1) return;
    
    // Direction monde basée sur yaw
    const forward = -moveZ;
    const strafe = moveX;
    
    const sinY = Math.sin(Game.yaw);
    const cosY = Math.cos(Game.yaw);
    
    const dx = sinY * forward + cosY * strafe;
    const dz = cosY * forward - sinY * strafe;
    
    const speed = char.speed * delta;
    
    // Position candidate
    const newPos = Game.camera.position.clone();
    newPos.x += dx * speed;
    newPos.z += dz * speed;
    
    // Collisions
    if (!Game.world.checkCollision(newPos, 0.5)) {
        Game.camera.position.x = newPos.x;
        Game.camera.position.z = newPos.z;
    }
    
    // Limites du monde
    Game.camera.position.x = Math.max(-200, Math.min(200, Game.camera.position.x));
    Game.camera.position.z = Math.max(-200, Math.min(200, Game.camera.position.z));
    
    // Head bob
    const bobAmount = Math.sin(Game.time * 12) * 0.03;
    Game.camera.position.y = 1.7 + bobAmount;
    
    // Mettre à jour le personnage (position cachée)
    Game.player.group.position.copy(Game.camera.position);
    Game.player.group.position.y = 0;
    Game.player.rotateTo(Game.yaw);
}

function updateEnemies(delta) {
    const camPos = Game.camera.position;
    
    // Régénérer les ennemis tués
    if (Game.enemies.length < 6 && Math.random() < 0.005) {
        const types = ['goblin', 'bandit', 'wolf'];
        const type = types[Math.floor(Math.random() * types.length)];
        const angle = Math.random() * Math.PI * 2;
        const r = 40 + Math.random() * 40;
        const x = camPos.x + Math.cos(angle) * r;
        const z = camPos.z + Math.sin(angle) * r;
        if (Math.abs(x) < 190 && Math.abs(z) < 190) {
            const enemy = new Enemy3D(Game.scene, type, { x, y: 0, z });
            enemy.onAttack = (dmg) => damagePlayer(dmg);
            Game.enemies.push(enemy);
        }
    }
    
    Game.enemies.forEach(enemy => {
        if (enemy.dead) return;
        enemy.update(delta, Game.time, camPos);
    });
    
    // Nettoyer les morts
    Game.enemies = Game.enemies.filter(e => !e.dead);
}

function updateProjectiles(delta) {
    if (!Game.projectiles) return;
    Game.projectiles = Game.projectiles.filter(p => {
        p.update(delta);
        if (p.destroy) {
            Game.scene.remove(p.mesh);
            return false;
        }
        return true;
    });
}

function updateCompass() {
    const yaw = ((Game.yaw * 180 / Math.PI) % 360 + 360) % 360;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const idx = Math.round(yaw / 45) % 8;
    const needle = document.getElementById('compass-needle');
    if (needle) needle.textContent = dirs[idx];
}

const LOCATIONS = [
    { name: 'Buina Village', x: 0, z: 0, r: 30 },
    { name: 'Forêt de Buina', x: 0, z: -80, r: 50 },
    { name: 'Lac Sacré', x: 120, z: 30, r: 40 },
    { name: 'Ruines Antiques', x: -140, z: 0, r: 35 },
    { name: 'Montagnes', x: 0, z: 180, r: 60 },
];

function checkLocation() {
    const p = Game.camera.position;
    for (const loc of LOCATIONS) {
        const d = Math.hypot(p.x - loc.x, p.z - loc.z);
        if (d < loc.r && Game.currentLocation !== loc.name) {
            Game.currentLocation = loc.name;
            document.getElementById('hud-location').textContent = '📍 ' + loc.name;
            notify(`📍 ${loc.name}`, 2200);
            break;
        }
    }
}

function updateWorld(delta) {
    Game.world.update(delta, Game.time);
    Game.npcs.forEach(n => n.update(Game.time));
    Game.animals.forEach(a => a.update(delta, Game.time));
    
    // Orientation caméra
    Game.camera.rotation.order = 'YXZ';
    Game.camera.rotation.y = Game.yaw;
    Game.camera.rotation.x = Game.pitch;
}

// ============================================
// HUD
// ============================================
function updateHUD() {
    document.getElementById('health-fill').style.width = 
        Math.max(0, (Game.health / Game.maxHealth) * 100) + '%';
    document.getElementById('mana-fill').style.width = 
        Math.max(0, (Game.mana / Game.maxMana) * 100) + '%';
}

function notify(text, duration = 1800) {
    const el = document.getElementById('notification');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
}

function updateLoading(pct, text) {
    const fill = document.getElementById('loading-fill');
    const percent = document.getElementById('loading-percent');
    const txt = document.getElementById('loading-text');
    if (fill) fill.style.width = pct + '%';
    if (percent) percent.textContent = pct + '%';
    if (txt && text) txt.textContent = text;
}

// ============================================
// GAME OVER / PAUSE
// ============================================
function gameOver() {
    Game.running = false;
    const screen = document.getElementById('char-select');
    screen.innerHTML = `
        <div class="select-header" style="padding-top:100px">
            <h1 style="font-size:48px;color:#ff4444;text-shadow:0 0 30px #ff4444;">💀 MORT</h1>
            <p style="font-size:16px;color:#ccc;margin-top:20px">
                Le voyage s'arrête ici...
            </p>
            <button onclick="location.reload()" style="margin-top:30px;background:linear-gradient(135deg,#ff6b35,#d62828);color:#fff;border:2px solid #ffd700;padding:15px 40px;font-size:16px;border-radius:50px;cursor:pointer;font-weight:bold">
                🔄 REVENIR À LA VIE
            </button>
        </div>
    `;
    screen.style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('joystick-container').style.display = 'none';
}

function showPauseMenu() {
    Game.paused = true;
    document.getElementById('pause-menu').style.display = 'flex';
}

function resumeGame() {
    Game.paused = false;
    document.getElementById('pause-menu').style.display = 'none';
    Game.clock.getDelta();
}

function toggleVR() {
    if (Game.renderer.xr && Game.renderer.xr.isPresenting) {
        Game.renderer.xr.getSession()?.end();
    } else if (navigator.xr) {
        navigator.xr.requestSession('immersive-vr').then(session => {
            Game.renderer.xr.setSession(session);
        }).catch(err => notify('❌ VR non disponible', 1500));
    } else {
        notify('❌ VR non supporté', 1500);
    }
}

function onResize() {
    if (!Game.camera) return;
    Game.camera.aspect = window.innerWidth / window.innerHeight;
    Game.camera.updateProjectionMatrix();
    Game.renderer.setSize(window.innerWidth, window.innerHeight);
    if (Game.composer) Game.composer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// UI - SÉLECTION
// ============================================
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        Game.selectedChar = card.dataset.char;
        document.getElementById('start-btn').disabled = false;
    });
});

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('char-select').style.display = 'none';
    startGame();
});

// ============================================
// DÉMARRAGE
// ============================================
(async () => {
    await initEngine();
    document.getElementById('loading-screen').style.opacity = '0';
    document.getElementById('loading-screen').style.transition = 'opacity 0.8s';
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('char-select').style.display = 'block';
    }, 800);
})();

window.resumeGame = resumeGame;
window.toggleVR = toggleVR;
