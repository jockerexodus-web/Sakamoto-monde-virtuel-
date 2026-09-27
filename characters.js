// ============================================
// CHARACTERS.JS - Personnages, monstres, brigands
// ============================================
import * as THREE from 'three';

// ============================================
// CONFIGURATION DES PERSONNAGES JOUABLES
// ============================================
export const CHARACTERS = {
    rudeus: {
        name: 'Rudeus Greyrat',
        avatar: '🧙‍♂️',
        color: 0x3a7ca8,
        accent: 0x87ceeb,
        speed: 6.0,
        health: 100,
        mana: 150,
        attacks: ['fire', 'wind', 'water'],
    },
    roxy: {
        name: 'Roxy Migurdia',
        avatar: '👩‍🎓',
        color: 0xffffff,
        accent: 0x87ceeb,
        speed: 6.5,
        health: 80,
        mana: 180,
        attacks: ['water', 'ice', 'light'],
    },
    eris: {
        name: 'Eris Boreas',
        avatar: '⚔️',
        color: 0xb01828,
        accent: 0xff6b6b,
        speed: 8.0,
        health: 120,
        mana: 50,
        attacks: ['sword', 'fire', 'rage'],
    },
    sylphie: {
        name: 'Sylphiette',
        avatar: '🌿',
        color: 0x4a8c3a,
        accent: 0x90ee90,
        speed: 7.0,
        health: 90,
        mana: 130,
        attacks: ['wind', 'heal', 'silence'],
    },
    ruijerd: {
        name: 'Ruijerd Superdia',
        avatar: '🛡️',
        color: 0x808890,
        accent: 0xd3d3d3,
        speed: 5.5,
        health: 150,
        mana: 30,
        attacks: ['spear', 'force', 'shield'],
    },
    paul: {
        name: 'Paul Greyrat',
        avatar: '🗡️',
        color: 0xb88040,
        accent: 0xdaa520,
        speed: 7.0,
        health: 110,
        mana: 60,
        attacks: ['sword', 'tactic', 'endurance'],
    }
};

// ============================================
// CLASSE DE BASE POUR UN PERSONNAGE 3D RÉALISTE
// ============================================
export class Character3D {
    constructor(scene, config, position = { x: 0, y: 0, z: 0 }) {
        this.scene = scene;
        this.config = config;
        this.group = new THREE.Group();
        this.group.position.set(position.x, position.y, position.z);
        
        this.health = config.health;
        this.maxHealth = config.health;
        this.isPlayer = true;
        this.velocity = new THREE.Vector3();
        this.facingAngle = 0;
        
        this.buildMesh();
        scene.add(this.group);
    }
    
    // Construit un personnage humanoïde détaillé
    buildMesh() {
        const c = this.config.color;
        const a = this.config.accent;
        
        // Matériaux réalistes
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xf5c9a0, roughness: 0.75,
        });
        const clothMat = new THREE.MeshStandardMaterial({
            color: c, roughness: 0.85,
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: a, roughness: 0.6, metalness: 0.2,
            emissive: a, emissiveIntensity: 0.15,
        });
        const hairMat = new THREE.MeshStandardMaterial({
            color: this.getHairColor(), roughness: 0.9,
        });
        const leatherMat = new THREE.MeshStandardMaterial({
            color: 0x5a3a20, roughness: 0.9,
        });
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0xa0a0a8, roughness: 0.3, metalness: 0.9,
        });
        
        // ===== TORSE (corps) =====
        const torso = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.35, 0.7, 4, 12),
            clothMat
        );
        torso.position.y = 1.25;
        torso.castShadow = true;
        torso.receiveShadow = true;
        this.group.add(torso);
        
        // ===== TÊTE =====
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 20, 20),
            skinMat
        );
        head.position.y = 1.95;
        head.scale.set(0.9, 1.05, 0.95);
        head.castShadow = true;
        this.group.add(head);
        
        // Cheveux
        const hair = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.7),
            hairMat
        );
        hair.position.y = 1.98;
        hair.scale.set(1, 1.1, 1);
        hair.castShadow = true;
        this.group.add(hair);
        
        // Yeux
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
        const eyeColorMat = new THREE.MeshStandardMaterial({ 
            color: this.getEyeColor(), roughness: 0.1,
            emissive: this.getEyeColor(), emissiveIntensity: 0.3,
        });
        for (const x of [-0.1, 0.1]) {
            const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), eyeWhiteMat);
            eyeW.position.set(x, 1.98, 0.24);
            this.group.add(eyeW);
            const eyeC = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), eyeColorMat);
            eyeC.position.set(x, 1.98, 0.28);
            this.group.add(eyeC);
        }
        
        // ===== BRAS =====
        this.leftArm = this.createArm(-1, clothMat, skinMat);
        this.rightArm = this.createArm(1, clothMat, skinMat);
        this.group.add(this.leftArm);
        this.group.add(this.rightArm);
        
        // ===== JAMBES =====
        this.leftLeg = this.createLeg(-1, clothMat, leatherMat);
        this.rightLeg = this.createLeg(1, clothMat, leatherMat);
        this.group.add(this.leftLeg);
        this.group.add(this.rightLeg);
        
        // ===== CAPE / MANTEAU =====
        if (this.config.name.includes('Rudeus') || this.config.name.includes('Roxy')) {
            const cape = new THREE.Mesh(
                new THREE.PlaneGeometry(0.9, 1.3),
                new THREE.MeshStandardMaterial({
                    color: a, roughness: 0.9, side: THREE.DoubleSide,
                })
            );
            cape.position.set(0, 1.3, -0.25);
            cape.rotation.x = 0.15;
            cape.castShadow = true;
            this.group.add(cape);
        }
        
        // ===== ARME =====
        this.addWeapon(metalMat, leatherMat);
    }
    
    createArm(side, clothMat, skinMat) {
        const arm = new THREE.Group();
        arm.position.set(side * 0.42, 1.6, 0);
        
        const upper = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.1, 0.4, 4, 8),
            clothMat
        );
        upper.position.y = -0.25;
        upper.castShadow = true;
        arm.add(upper);
        
        const lower = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.09, 0.35, 4, 8),
            clothMat
        );
        lower.position.y = -0.65;
        lower.castShadow = true;
        arm.add(lower);
        
        const hand = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 10, 10),
            skinMat
        );
        hand.position.y = -0.9;
        hand.scale.set(0.9, 0.8, 1.1);
        arm.add(hand);
        
        return arm;
    }
    
    createLeg(side, clothMat, leatherMat) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.15, 0.85, 0);
        
        const upper = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.13, 0.4, 4, 8),
            clothMat
        );
        upper.position.y = -0.25;
        upper.castShadow = true;
        leg.add(upper);
        
        const lower = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.11, 0.35, 4, 8),
            clothMat
        );
        lower.position.y = -0.65;
        lower.castShadow = true;
        leg.add(lower);
        
        const boot = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.18, 0.35),
            leatherMat
        );
        boot.position.set(0, -0.9, 0.08);
        boot.castShadow = true;
        leg.add(boot);
        
        return leg;
    }
    
    addWeapon(metalMat, leatherMat) {
        const weapon = new THREE.Group();
        weapon.position.set(0.5, 1.05, 0.2);
        weapon.rotation.z = -0.3;
        
        if (this.config.name.includes('Rudeus') || this.config.name.includes('Roxy') || this.config.name.includes('Sylphiette')) {
            // Bâton magique
            const staff = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8),
                leatherMat
            );
            staff.rotation.z = Math.PI / 2;
            weapon.add(staff);
            
            const orb = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: this.config.accent,
                    emissive: this.config.accent,
                    emissiveIntensity: 2,
                })
            );
            orb.position.x = 0.75;
            weapon.add(orb);
            
            const light = new THREE.PointLight(this.config.accent, 8, 6);
            light.position.x = 0.75;
            weapon.add(light);
            this.weaponOrb = orb;
        } else {
            // Épée / lance
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 1.1, 0.02),
                metalMat
            );
            blade.rotation.z = Math.PI / 2;
            blade.position.x = 0.4;
            weapon.add(blade);
            
            const guard = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.05, 0.08),
                metalMat
            );
            weapon.add(guard);
            
            const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8),
                leatherMat
            );
            handle.rotation.z = Math.PI / 2;
            handle.position.x = -0.2;
            weapon.add(handle);
        }
        
        this.group.add(weapon);
        this.weapon = weapon;
    }
    
    getHairColor() {
        if (this.config.name.includes('Rudeus')) return 0xc8a878;
        if (this.config.name.includes('Roxy')) return 0x88ccff;
        if (this.config.name.includes('Eris')) return 0xc83030;
        if (this.config.name.includes('Sylphiette')) return 0x88e088;
        if (this.config.name.includes('Ruijerd')) return 0x88a0b0;
        if (this.config.name.includes('Paul')) return 0xc8a060;
        return 0x6a4030;
    }
    
    getEyeColor() {
        if (this.config.name.includes('Rudeus')) return 0x4488cc;
        if (this.config.name.includes('Roxy')) return 0x88ccff;
        if (this.config.name.includes('Eris')) return 0xff4444;
        if (this.config.name.includes('Sylphiette')) return 0x44cc44;
        if (this.config.name.includes('Ruijerd')) return 0x88a0c0;
        return 0x664422;
    }
    
    // ===== MISE À JOUR =====
    update(delta, time) {
        // Animation de marche
        const speed = this.velocity.length();
        if (speed > 0.05) {
            const walkPhase = time * 8;
            this.leftArm.rotation.x = Math.sin(walkPhase) * 0.6;
            this.rightArm.rotation.x = -Math.sin(walkPhase) * 0.6;
            this.leftLeg.rotation.x = -Math.sin(walkPhase) * 0.5;
            this.rightLeg.rotation.x = Math.sin(walkPhase) * 0.5;
        } else {
            // Idle : respiration
            const idlePhase = time * 1.5;
            this.leftArm.rotation.x = Math.sin(idlePhase) * 0.05;
            this.rightArm.rotation.x = -Math.sin(idlePhase) * 0.05;
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
        }
        
        // Faire flotter l'orbe du bâton
        if (this.weaponOrb) {
            this.weaponOrb.rotation.y += delta * 2;
            this.weaponOrb.position.y = Math.sin(time * 2) * 0.03;
        }
        
        // Appliquer la vélocité
        this.group.position.x += this.velocity.x * delta;
        this.group.position.z += this.velocity.z * delta;
        this.velocity.multiplyScalar(0.85); // friction
    }
    
    rotateTo(angle) {
        this.facingAngle = angle;
        this.group.rotation.y = angle;
    }
}

// ============================================
// ENNEMIS RÉALISTES
// ============================================
export class Enemy3D {
    constructor(scene, type, position) {
        this.scene = scene;
        this.type = type;
        this.group = new THREE.Group();
        this.group.position.set(position.x, position.y, position.z);
        this.state = 'wander';
        this.wanderTarget = new THREE.Vector3(
            position.x + (Math.random() - 0.5) * 20,
            0,
            position.z + (Math.random() - 0.5) * 20
        );
        this.attackCooldown = 0;
        this.wanderPhase = Math.random() * Math.PI * 2;
        
        this.configureByType();
        this.buildMesh();
        scene.add(this.group);
    }
    
    configureByType() {
        const configs = {
            goblin: { health: 30, speed: 3.5, damage: 8, color: 0x7a9050, size: 0.9, detectRange: 25 },
            bandit: { health: 60, speed: 4.5, damage: 15, color: 0x5a3a20, size: 1.0, detectRange: 30 },
            wolf: { health: 45, speed: 6.0, damage: 12, color: 0x505055, size: 0.8, detectRange: 35 },
            slime: { health: 20, speed: 2.0, damage: 5, color: 0x50a050, size: 0.7, detectRange: 20 },
            orc: { health: 100, speed: 3.0, damage: 25, color: 0x506030, size: 1.3, detectRange: 28 },
        };
        Object.assign(this, configs[this.type] || configs.goblin);
    }
    
    buildMesh() {
        const bodyMat = new THREE.MeshStandardMaterial({
            color: this.color, roughness: 0.9,
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0x906040, roughness: 0.85,
        });
        const clothMat = new THREE.MeshStandardMaterial({
            color: 0x2a1a10, roughness: 0.95,
        });
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 2,
        });
        
        const s = this.size;
        
        if (this.type === 'wolf') {
            // Corps allongé
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.35 * s, 0.7 * s, 4, 12),
                bodyMat
            );
            body.rotation.z = Math.PI / 2;
            body.position.y = 0.55 * s;
            body.castShadow = true;
            this.group.add(body);
            
            // Tête
            const head = new THREE.Mesh(
                new THREE.ConeGeometry(0.3 * s, 0.6 * s, 8),
                bodyMat
            );
            head.rotation.z = -Math.PI / 2;
            head.position.set(0.7 * s, 0.65 * s, 0);
            head.castShadow = true;
            this.group.add(head);
            
            // Oreilles
            for (const z of [-0.15, 0.15]) {
                const ear = new THREE.Mesh(
                    new THREE.ConeGeometry(0.08 * s, 0.2 * s, 4),
                    bodyMat
                );
                ear.position.set(0.55 * s, 0.9 * s, z * s);
                this.group.add(ear);
            }
            
            // Queue
            const tail = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.08 * s, 0.5 * s, 4, 6),
                bodyMat
            );
            tail.rotation.z = Math.PI / 4;
            tail.position.set(-0.8 * s, 0.7 * s, 0);
            this.group.add(tail);
            
            // Pattes
            for (const [x, z] of [[0.4, 0.2], [0.4, -0.2], [-0.4, 0.2], [-0.4, -0.2]]) {
                const leg = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 0.5 * s, 6),
                    bodyMat
                );
                leg.position.set(x * s, 0.25 * s, z * s);
                leg.castShadow = true;
                this.group.add(leg);
            }
            
            // Yeux
            for (const z of [-0.12, 0.12]) {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 8, 8), eyeMat);
                eye.position.set(0.85 * s, 0.7 * s, z * s);
                this.group.add(eye);
            }
            
        } else {
            // Humanoïde (goblin, bandit, orc)
            const torso = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.35 * s, 0.7 * s, 4, 12),
                this.type === 'bandit' ? clothMat : bodyMat
            );
            torso.position.y = 1.25 * s;
            torso.castShadow = true;
            this.group.add(torso);
            
            // Bandeau / cape pour les bandits
            if (this.type === 'bandit') {
                const cape = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.9 * s, 1.2 * s),
                    new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 1, side: THREE.DoubleSide })
                );
                cape.position.set(0, 1.2 * s, -0.25 * s);
                cape.rotation.x = 0.1;
                this.group.add(cape);
                
                // Masque
                const mask = new THREE.Mesh(
                    new THREE.BoxGeometry(0.4 * s, 0.15 * s, 0.05),
                    new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 1 })
                );
                mask.position.set(0, 1.98 * s, 0.24 * s);
                this.group.add(mask);
            }
            
            // Tête
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.28 * s, 16, 16),
                this.type === 'bandit' ? skinMat : bodyMat
            );
            head.position.y = 1.95 * s;
            head.castShadow = true;
            this.group.add(head);
            
            // Yeux
            for (const x of [-0.1, 0.1]) {
                const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 8, 8), eyeMat);
                eye.position.set(x * s, 1.98 * s, 0.24 * s);
                this.group.add(eye);
            }
            
            // Bras
            for (const side of [-1, 1]) {
                const arm = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.1 * s, 0.5 * s, 4, 8),
                    this.type === 'bandit' ? clothMat : bodyMat
                );
                arm.position.set(side * 0.42 * s, 1.35 * s, 0);
                arm.castShadow = true;
                this.group.add(arm);
            }
            
            // Jambes
            for (const side of [-1, 1]) {
                const leg = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.13 * s, 0.5 * s, 4, 8),
                    clothMat
                );
                leg.position.set(side * 0.15 * s, 0.6 * s, 0);
                leg.castShadow = true;
                this.group.add(leg);
            }
            
            // Arme pour les bandits / orcs
            if (this.type === 'bandit' || this.type === 'orc') {
                const weapon = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06 * s, 0.8 * s, 0.02 * s),
                    new THREE.MeshStandardMaterial({ color: 0x909098, roughness: 0.3, metalness: 0.9 })
                );
                weapon.position.set(0.5 * s, 1.4 * s, 0.2 * s);
                weapon.rotation.z = -0.4;
                weapon.castShadow = true;
                this.group.add(weapon);
            }
        }
        
        // Barre de vie flottante
        this.healthBarBg = new THREE.Mesh(
            new THREE.PlaneGeometry(0.9 * s, 0.1 * s),
            new THREE.MeshBasicMaterial({ color: 0x220000, depthTest: false })
        );
        this.healthBarBg.position.y = 2.5 * s;
        this.group.add(this.healthBarBg);
        
        this.healthBar = new THREE.Mesh(
            new THREE.PlaneGeometry(0.9 * s, 0.1 * s),
            new THREE.MeshBasicMaterial({ color: 0xff2222, depthTest: false })
        );
        this.healthBar.position.y = 2.5 * s;
        this.healthBar.position.z = 0.01;
        this.group.add(this.healthBar);
        
        // Faire face à la caméra à chaque frame
        this.healthBarBg.userData.billboard = true;
        this.healthBar.userData.billboard = true;
    }
    
    update(delta, time, playerPos) {
        const pos = this.group.position;
        const dx = playerPos.x - pos.x;
        const dz = playerPos.z - pos.z;
        const distToPlayer = Math.sqrt(dx * dx + dz * dz);
        
        // Détection joueur
        if (distToPlayer < this.detectRange) {
            this.state = 'chase';
        } else if (distToPlayer > this.detectRange * 1.5) {
            this.state = 'wander';
        }
        
        if (this.state === 'chase' && distToPlayer > 1.5) {
            // Courir vers le joueur
            const nx = dx / distToPlayer;
            const nz = dz / distToPlayer;
            pos.x += nx * this.speed * delta;
            pos.z += nz * this.speed * delta;
            this.group.rotation.y = Math.atan2(dx, dz);
            
            // Animation
            this.group.position.y = Math.abs(Math.sin(time * 8)) * 0.08;
            
        } else if (this.state === 'wander') {
            // Flâner
            const wdx = this.wanderTarget.x - pos.x;
            const wdz = this.wanderTarget.z - pos.z;
            const wdist = Math.sqrt(wdx * wdx + wdz * wdz);
            
            if (wdist < 2) {
                this.wanderTarget.set(
                    pos.x + (Math.random() - 0.5) * 30,
                    0,
                    pos.z + (Math.random() - 0.5) * 30
                );
            } else {
                const nx = wdx / wdist;
                const nz = wdz / wdist;
                pos.x += nx * this.speed * 0.3 * delta;
                pos.z += nz * this.speed * 0.3 * delta;
                this.group.rotation.y = Math.atan2(wdx, wdz);
            }
        }
        
        // Attaque
        this.attackCooldown -= delta;
        if (distToPlayer < 2 && this.attackCooldown <= 0) {
            this.attackCooldown = 1.2;
            this.onAttack && this.onAttack(this.damage);
        }
        
        // Billboard des barres de vie (face caméra)
        if (this.healthBar) {
            const camera = this.healthBarBg.parent.parent?.userData.camera;
            // Simplification : rotation vers +Z du monde
            const yaw = Math.atan2(
                window.gameCamera.position.x - pos.x,
                window.gameCamera.position.z - pos.z
            );
            this.healthBarBg.rotation.y = yaw - this.group.rotation.y;
            this.healthBar.rotation.y = yaw - this.group.rotation.y;
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        const ratio = Math.max(0, this.health / this.maxHealth);
        this.healthBar.scale.x = ratio;
        
        // Flash rouge
        this.group.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                const orig = child.material.emissiveIntensity;
                child.material.emissiveIntensity = 2;
                child.material.emissive = new THREE.Color(0xff0000);
                setTimeout(() => {
                    child.material.emissiveIntensity = orig || 0;
                }, 100);
            }
        });
        
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }
    
    die() {
        // Animation de mort + particules
        const pos = this.group.position.clone();
        
        // Faire tomber
        this.group.rotation.z = Math.PI / 2;
        
        // Retirer après un délai
        setTimeout(() => {
            this.scene.remove(this.group);
            this.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.dead = true;
        }, 1500);
    }
}

// ============================================
// PNJ (villageois)
// ============================================
export class NPC3D {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.group = new THREE.Group();
        this.group.position.set(config.position.x, config.position.y, config.position.z);
        
        this.buildMesh();
        scene.add(this.group);
        
        this.originalY = config.position.y;
        this.phase = Math.random() * Math.PI * 2;
    }
    
    buildMesh() {
        const clothMat = new THREE.MeshStandardMaterial({
            color: this.config.color || 0x8b6914, roughness: 0.9,
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xf5c9a0, roughness: 0.75,
        });
        const hairMat = new THREE.MeshStandardMaterial({
            color: this.config.hair || 0x4a2a15, roughness: 0.9,
        });
        
        // Torse
        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.65, 4, 12), clothMat);
        torso.position.y = 1.2;
        torso.castShadow = true;
        torso.receiveShadow = true;
        this.group.add(torso);
        
        // Tête
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), skinMat);
        head.position.y = 1.9;
        head.castShadow = true;
        this.group.add(head);
        
        // Cheveux
        const hair = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
            hairMat
        );
        hair.position.y = 1.93;
        this.group.add(hair);
        
        // Bras
        for (const side of [-1, 1]) {
            const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 4, 8), clothMat);
            arm.position.set(side * 0.4, 1.3, 0);
            arm.castShadow = true;
            this.group.add(arm);
        }
        
        // Jambes
        for (const side of [-1, 1]) {
            const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), clothMat);
            leg.position.set(side * 0.15, 0.6, 0);
            leg.castShadow = true;
            this.group.add(leg);
        }
        
        // Nom flottant (sprite)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, 256, 64);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 254, 62);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.name, 128, 32);
        
        const tex = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: tex, depthTest: false, transparent: true,
        }));
        sprite.position.y = 2.6;
        sprite.scale.set(1.6, 0.4, 1);
        this.group.add(sprite);
    }
    
    update(time) {
        // Léger balancement
        this.phase += 0.03;
        this.group.position.y = this.originalY + Math.sin(this.phase) * 0.03;
        this.group.rotation.y = Math.sin(this.phase * 0.5) * 0.2;
    }
}

// ============================================
// CRÉATURES PAISIBLES (ambiance)
// ============================================
export class Animal3D {
    constructor(scene, position) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.set(position.x, 0, position.z);
        
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
        
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 4, 8), mat);
        body.rotation.z = Math.PI / 2;
        body.position.y = 0.25;
        body.castShadow = true;
        this.group.add(body);
        
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), mat);
        head.position.set(0.3, 0.32, 0);
        this.group.add(head);
        
        for (const [x, z] of [[0.15, 0.08], [0.15, -0.08], [-0.15, 0.08], [-0.15, -0.08]]) {
            const leg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6),
                mat
            );
            leg.position.set(x, 0.1, z);
            this.group.add(leg);
        }
        
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.speed = 0.5 + Math.random() * 0.5;
        
        scene.add(this.group);
    }
    
    update(delta, time) {
        this.wanderAngle += (Math.random() - 0.5) * 0.1;
        this.group.position.x += Math.cos(this.wanderAngle) * this.speed * delta;
        this.group.position.z += Math.sin(this.wanderAngle) * this.speed * delta;
        this.group.rotation.y = -this.wanderAngle + Math.PI / 2;
        
        // Rebondir dans la zone
        if (Math.abs(this.group.position.x) > 60) this.wanderAngle = Math.PI - this.wanderAngle;
        if (Math.abs(this.group.position.z) > 60) this.wanderAngle = -this.wanderAngle;
    }
}
