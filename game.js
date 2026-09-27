// ============================================
// MUSHOKU TENSEI - MONDE OUVERT MOBILE VR
// ============================================

const Game = {
    running: false,
    paused: false,
    selectedChar: null,
    player: null,
    camera: null,
    moveJoystick: { active: false, dx: 0, dz: 0, touchId: null },
    lookTouch: { active: false, x: 0, y: 0, touchId: null },
    cameraYaw: 0,
    cameraPitch: 0,
    playerYaw: 0,
    creatures: [],
    lastFrame: performance.now(),
    currentLocation: 'Buina Village'
};

// ============================================
// PERSONNAGES JOUABLES
// ============================================
const CHARACTERS = {
    rudeus: {
        name: 'Rudeus Greyrat',
        avatar: '🧙‍♂️',
        color: '#4682b4',
        accent: '#87ceeb',
        speed: 0.08,
        abilities: ['Boule de feu', 'Vent', 'Eau'],
        startPos: { x: 0, z: 5 }
    },
    roxy: {
        name: 'Roxy Migurdia',
        avatar: '👩‍🎓',
        color: '#ffffff',
        accent: '#87ceeb',
        speed: 0.09,
        abilities: ['Eau', 'Glace', 'Lumière'],
        startPos: { x: -5, z: 10 }
    },
    eris: {
        name: 'Eris Boreas Greyrat',
        avatar: '⚔️',
        color: '#dc143c',
        accent: '#ff6b6b',
        speed: 0.11,
        abilities: ['Épée', 'Feu', 'Rage'],
        startPos: { x: 5, z: 8 }
    },
    sylphie: {
        name: 'Sylphiette',
        avatar: '🌿',
        color: '#90ee90',
        accent: '#228b22',
        speed: 0.1,
        abilities: ['Vent', 'Soin', 'Camouflage'],
        startPos: { x: -8, z: -3 }
    },
    ruijerd: {
        name: 'Ruijerd Superdia',
        avatar: '🛡️',
        color: '#a9a9a9',
        accent: '#696969',
        speed: 0.07,
        abilities: ['Lance', 'Force', 'Bouclier'],
        startPos: { x: 8, z: -5 }
    },
    paul: {
        name: 'Paul Greyrat',
        avatar: '🗡️',
        color: '#daa520',
        accent: '#8b4513',
        speed: 0.09,
        abilities: ['Épée', 'Tactique', 'Endurance'],
        startPos: { x: 0, z: -8 }
    }
};

// ============================================
// LIEUX DU MONDE (pour la boussole et découvertes)
// ============================================
const LOCATIONS = [
    { name: 'Buina Village', x: 0, z: 0, radius: 25 },
    { name: 'Forêt de Buina', x: 0, z: -80, radius: 40 },
    { name: 'Lac Sacré', x: 80, z: 0, radius: 30 },
    { name: 'Ruines Antiques', x: -80, z: 0, radius: 30 },
    { name: 'Montagne', x: 0, z: 80, radius: 35 }
];

// ============================================
// SÉLECTION DU PERSONNAGE
// ============================================
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        Game.selectedChar = card.dataset.char;
        document.getElementById('start-btn').disabled = false;
    });
});

document.getElementById('start-btn').addEventListener('click', startGame);

// ============================================
// DÉMARRAGE DU JEU
// ============================================
function startGame() {
    if (!Game.selectedChar) return;
    
    const char = CHARACTERS[Game.selectedChar];
    
    // Masquer l'écran de sélection
    document.getElementById('char-select').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('joystick-container').style.display = 'block';
    
    // Mettre à jour le HUD
    document.getElementById('hud-avatar').textContent = char.avatar;
    document.getElementById('hud-name').textContent = char.name;
    
    // Positionner le joueur
    const player = document.getElementById('player');
    player.setAttribute('position', `${char.startPos.x} 1.6 ${char.startPos.z}`);
    
    Game.running = true;
    Game.player = player;
    Game.camera = document.querySelector('[camera]');
    
    // Générer les créatures paisibles
    spawnPeacefulCreatures();
    
    // Générer des PNJ
    spawnNPCs();
    
    // Initialiser les contrôles
    initMobileControls();
    
    // Init VR si disponible
    initVR();
    
    // Boucle de jeu
    requestAnimationFrame(gameLoop);
    
    notify(`✨ Bienvenue, ${char.name} !`, 2500);
    setTimeout(() => notify('🌍 Explore le monde librement', 2000), 2700);
    setTimeout(() => notify('🎮 Joystick pour marcher', 2000), 5000);
}

// ============================================
// CONTRÔLES MOBILES (JOYSTICK + LOOK)
// ============================================
function initMobileControls() {
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');
    
    const baseRect = () => joystickBase.getBoundingClientRect();
    const maxDist = 35;
    
    // ---- JOYSTICK MOUVEMENT ----
    joystickBase.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (Game.moveJoystick.touchId !== null) return;
        const touch = e.changedTouches[0];
        Game.moveJoystick.touchId = touch.identifier;
        Game.moveJoystick.active = true;
        handleJoystickMove(touch);
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
        if (!Game.moveJoystick.active) return;
        for (const touch of e.changedTouches) {
            if (touch.identifier === Game.moveJoystick.touchId) {
                handleJoystickMove(touch);
            }
        }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === Game.moveJoystick.touchId) {
                Game.moveJoystick.active = false;
                Game.moveJoystick.dx = 0;
                Game.moveJoystick.dz = 0;
                Game.moveJoystick.touchId = null;
                joystickStick.style.transform = 'translate(-50%, -50%)';
            }
        }
    });
    
    function handleJoystickMove(touch) {
        const rect = baseRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, maxDist);
        
        if (dist > 0) {
            dx = (dx / dist) * clampedDist;
            dy = (dy / dist) * clampedDist;
        }
        
        joystickStick.style.transform = 
            `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        
        Game.moveJoystick.dx = dx / maxDist;
        Game.moveJoystick.dz = dy / maxDist;
    }
    
    // ---- REGARDER (TOUCHER L'ÉCRAN - moitié droite) ----
    document.addEventListener('touchstart', (e) => {
        if (!Game.running) return;
        // Ignorer si c'est le joystick
        const joystickContainer = document.getElementById('joystick-container');
        if (joystickContainer.contains(e.target)) return;
        // Ignorer les boutons UI
        if (e.target.closest('#menu-btn') || e.target.closest('.action-btn')) return;
        if (Game.lookTouch.touchId !== null) return;
        
        const touch = e.changedTouches[0];
        // Zone de regard = moitié droite de l'écran
        if (touch.clientX > window.innerWidth * 0.35) {
            Game.lookTouch.touchId = touch.identifier;
            Game.lookTouch.x = touch.clientX;
            Game.lookTouch.y = touch.clientY;
            Game.lookTouch.active = true;
        }
    }, { passive: false });
    
    document.addEventListener('touchmove', (e) => {
        if (!Game.lookTouch.active) return;
        for (const touch of e.changedTouches) {
            if (touch.identifier === Game.lookTouch.touchId) {
                const dx = touch.clientX - Game.lookTouch.x;
                const dy = touch.clientY - Game.lookTouch.y;
                
                Game.cameraYaw -= dx * 0.15;
                Game.cameraPitch -= dy * 0.15;
                
                // Limiter le pitch
                Game.cameraPitch = Math.max(-70, Math.min(70, Game.cameraPitch));
                
                // Appliquer à la caméra
                const rig = document.getElementById('camera-rig');
                rig.setAttribute('rotation', 
                    `${Game.cameraPitch} ${Game.cameraYaw} 0`);
                
                Game.lookTouch.x = touch.clientX;
                Game.lookTouch.y = touch.clientY;
            }
        }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === Game.lookTouch.touchId) {
                Game.lookTouch.active = false;
                Game.lookTouch.touchId = null;
            }
        }
    });
    
    // ---- BOUTON ACTION ----
    document.getElementById('action-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        doAction();
    });
    
    // ---- MENU ----
    document.getElementById('menu-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        showPauseMenu();
    });
}

// ============================================
// ACTION (SORT / INTERACTION)
// ============================================
function doAction() {
    const char = CHARACTERS[Game.selectedChar];
    if (!char) return;
    
    // Effet visuel simple
    const hand = document.getElementById('held-item');
    if (hand) {
        hand.setAttribute('scale', '1.5 1.5 1.5');
        setTimeout(() => hand.setAttribute('scale', '1 1 1'), 200);
    }
    
    // Effet sonore visuel
    createMagicBurst();
    
    const ability = char.abilities[Math.floor(Math.random() * char.abilities.length)];
    notify(`✨ ${ability} !`, 1200);
}

function createMagicBurst() {
    const scene = document.querySelector('a-scene');
    const camera = Game.camera;
    if (!camera) return;
    
    const pos = new THREE.Vector3();
    camera.object3D.getWorldPosition(pos);
    const dir = new THREE.Vector3();
    camera.object3D.getWorldDirection(dir);
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('a-sphere');
        particle.setAttribute('radius', '0.1');
        particle.setAttribute('color', CHARACTERS[Game.selectedChar].accent);
        particle.setAttribute('material', 
            `emissive: ${CHARACTERS[Game.selectedChar].accent}; emissiveIntensity: 2; opacity: 0.9`);
        
        const start = pos.clone().add(dir.clone().multiplyScalar(1));
        particle.setAttribute('position', `${start.x} ${start.y} ${start.z}`);
        scene.appendChild(particle);
        
        const vel = {
            x: dir.x * 0.3 + (Math.random() - 0.5) * 0.15,
            y: dir.y * 0.3 + (Math.random() - 0.5) * 0.15 + 0.05,
            z: dir.z * 0.3 + (Math.random() - 0.5) * 0.15
        };
        
        let life = 0;
        const interval = setInterval(() => {
            life++;
            const p = particle.getAttribute('position');
            particle.setAttribute('position', 
                `${p.x + vel.x} ${p.y + vel.y} ${p.z + vel.z}`);
            particle.setAttribute('material', 
                `emissiveIntensity: ${2 - life * 0.2}; opacity: ${1 - life * 0.1}`);
            
            if (life > 10) {
                clearInterval(interval);
                particle.parentNode && particle.parentNode.removeChild(particle);
            }
        }, 30);
    }
}

// ============================================
// CRÉATURES PAISIBLES (ambiance)
// ============================================
function spawnPeacefulCreatures() {
    const scene = document.querySelector('a-scene');
    const creatureZone = document.getElementById('creatures');
    
    // Créatures (petits animaux qui se baladent)
    for (let i = 0; i < 12; i++) {
        const creature = document.createElement('a-entity');
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 60;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        creature.setAttribute('position', `${x} 0.3 ${z}`);
        creature.setAttribute('creature-behavior', '');
        
        // Corps
        const body = document.createElement('a-sphere');
        body.setAttribute('radius', '0.3');
        body.setAttribute('color', '#ffffff');
        creature.appendChild(body);
        
        // Tête
        const head = document.createElement('a-sphere');
        head.setAttribute('radius', '0.18');
        head.setAttribute('color', '#ffffff');
        head.setAttribute('position', '0 0.15 -0.35');
        creature.appendChild(head);
        
        creature.wanderAngle = Math.random() * Math.PI * 2;
        creature.speed = 0.005 + Math.random() * 0.01;
        
        creatureZone.appendChild(creature);
        Game.creatures.push(creature);
    }
}

// ============================================
// PNJ (personnages non-jouables)
// ============================================
function spawnNPCs() {
    const npcZone = document.getElementById('npcs');
    
    const npcData = [
        { name: 'Villageois', emoji: '👨‍🌾', pos: { x: -3, z: -5 }, color: '#8b6914' },
        { name: 'Marchand', emoji: '🧑‍💼', pos: { x: 12, z: -8 }, color: '#9c6b3c' },
        { name: 'Enfant', emoji: '👦', pos: { x: 5, z: 3 }, color: '#daa520' },
        { name: 'Gardien', emoji: '💂', pos: { x: -12, z: -15 }, color: '#6b6b6b' },
        { name: 'Fermière', emoji: '👩‍🌾', pos: { x: 15, z: 12 }, color: '#c19a6b' }
    ];
    
    npcData.forEach(npc => {
        const npcEl = document.createElement('a-entity');
        npcEl.setAttribute('position', `${npc.pos.x} 0 ${npc.pos.z}`);
        npcEl.setAttribute('npc-behavior', '');
        
        // Corps
        const body = document.createElement('a-cylinder');
        body.setAttribute('radius', '0.3');
        body.setAttribute('height', '1.2');
        body.setAttribute('color', npc.color);
        body.setAttribute('position', '0 0.6 0');
        npcEl.appendChild(body);
        
        // Tête
        const head = document.createElement('a-sphere');
        head.setAttribute('radius', '0.25');
        head.setAttribute('color', '#ffdbb0');
        head.setAttribute('position', '0 1.5 0');
        npcEl.appendChild(head);
        
        // Nom flottant
        const nameText = document.createElement('a-text');
        nameText.setAttribute('value', npc.emoji + ' ' + npc.name);
        nameText.setAttribute('position', '0 2.2 0');
        nameText.setAttribute('align', 'center');
        nameText.setAttribute('color', '#ffd700');
        nameText.setAttribute('width', '3');
        nameText.setAttribute('side', 'double');
        npcEl.appendChild(nameText);
        
        npcZone.appendChild(npcEl);
    });
}

// ============================================
// COMPOSANT : COMPORTEMENT DES CRÉATURES
// ============================================
AFRAME.registerComponent('creature-behavior', {
    tick: function(time, delta) {
        if (!Game.running || Game.paused) return;
        
        const creature = this.el;
        const pos = creature.object3D.position;
        
        // Dérive aléatoire
        if (!creature.wanderAngle) creature.wanderAngle = Math.random() * Math.PI * 2;
        creature.wanderAngle += (Math.random() - 0.5) * 0.05;
        
        const speed = creature.speed || 0.01;
        pos.x += Math.cos(creature.wanderAngle) * speed * (delta / 16);
        pos.z += Math.sin(creature.wanderAngle) * speed * (delta / 16);
        
        // Rebondir dans les limites
        if (Math.abs(pos.x) > 100) creature.wanderAngle = Math.PI - creature.wanderAngle;
        if (Math.abs(pos.z) > 100) creature.wanderAngle = -creature.wanderAngle;
        
        // Orientation
        creature.object3D.rotation.y = -creature.wanderAngle + Math.PI / 2;
    }
});

// ============================================
// COMPOSANT : COMPORTEMENT DES PNJ
// ============================================
AFRAME.registerComponent('npc-behavior', {
    init: function() {
        this.originalY = this.el.object3D.position.y;
        this.phase = Math.random() * Math.PI * 2;
    },
    tick: function(time, delta) {
        if (!Game.running) return;
        
        // Léger balancement
        this.phase += 0.03;
        this.el.object3D.position.y = this.originalY + Math.sin(this.phase) * 0.05;
    }
});

// ============================================
// BOUCLE DE JEU
// ============================================
function gameLoop(now) {
    if (!Game.running) return;
    
    const delta = Math.min(now - Game.lastFrame, 50);
    Game.lastFrame = now;
    
    if (!Game.paused) {
        updatePlayer(delta);
        updateCompass();
        checkLocationDiscovery();
    }
    
    requestAnimationFrame(gameLoop);
}

// ============================================
// MISE À JOUR DU JOUEUR (mouvement)
// ============================================
function updatePlayer(delta) {
    if (!Game.moveJoystick.active) return;
    if (Math.abs(Game.moveJoystick.dx) < 0.1 && Math.abs(Game.moveJoystick.dz) < 0.1) return;
    
    const char = CHARACTERS[Game.selectedChar];
    const player = Game.player;
    const pos = player.object3D.position;
    
    // Direction relative à l'orientation de la caméra
    const yaw = Game.cameraYaw * Math.PI / 180;
    
    // dx du joystick = strafe, dz = avant/arrière (dy)
    const forward = -Game.moveJoystick.dz; // vers le haut = avancer
    const strafe = Game.moveJoystick.dx;
    
    const moveX = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
    const moveZ = Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
    
    const speed = char.speed * (delta / 16);
    
    pos.x += moveX * speed * 2;
    pos.z += moveZ * speed * 2;
    
    // Limiter le monde
    pos.x = Math.max(-150, Math.min(150, pos.x));
    pos.z = Math.max(-150, Math.min(150, pos.z));
}

// ============================================
// BOUSSOLE
// ============================================
function updateCompass() {
    const yaw = Game.cameraYaw;
    const normalized = ((yaw % 360) + 360) % 360;
    
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const idx = Math.round(normalized / 45) % 8;
    
    document.getElementById('compass-needle').textContent = dirs[idx];
}

// ============================================
// DÉCOUVERTE DE LIEUX
// ============================================
let lastLocation = 'Buina Village';

function checkLocationDiscovery() {
    if (!Game.player) return;
    
    const pos = Game.player.object3D.position;
    
    for (const loc of LOCATIONS) {
        const dist = Math.sqrt(
            Math.pow(pos.x - loc.x, 2) + Math.pow(pos.z - loc.z, 2)
        );
        
        if (dist < loc.radius && Game.currentLocation !== loc.name) {
            Game.currentLocation = loc.name;
            document.getElementById('hud-location').textContent = `📍 ${loc.name}`;
            if (lastLocation !== loc.name) {
                notify(`📍 ${loc.name}`, 2000);
                lastLocation = loc.name;
            }
            break;
        }
    }
}

// ============================================
// NOTIFICATIONS
// ============================================
function notify(text, duration = 1800) {
    const el = document.getElementById('notification');
    el.textContent = text;
    el.classList.add('show');
    
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => {
        el.classList.remove('show');
    }, duration);
}

// ============================================
// MENU PAUSE
// ============================================
function showPauseMenu() {
    Game.paused = true;
    document.getElementById('pause-menu').style.display = 'flex';
}

function resumeGame() {
    Game.paused = false;
    document.getElementById('pause-menu').style.display = 'none';
}

function changeCharacter() {
    location.reload();
}

function toggleVR() {
    const scene = document.querySelector('a-scene');
    if (scene.is('vr-mode')) {
        scene.exitVR();
    } else {
        scene.enterVR();
    }
    resumeGame();
}

// ============================================
// VR
// ============================================
function initVR() {
    const scene = document.querySelector('a-scene');
    
    scene.addEventListener('enter-vr', () => {
        notify('🥽 Mode VR activé', 2000);
        document.getElementById('joystick-container').style.display = 'none';
    });
    
    scene.addEventListener('exit-vr', () => {
        document.getElementById('joystick-container').style.display = 'block';
    });
}

// ============================================
// INIT AU CHARGEMENT
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    console.log('⚔️ Mushoku Tensei - Monde Ouvert chargé');
    console.log('📱 Version mobile + VR');
});
