// ============================================
// WORLD.JS - Création du monde réaliste
// ============================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class World {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.colliders = [];
        this.locationMarkers = [];
    }

    async build() {
        await this.setupSky();
        this.setupLights();
        this.setupTerrain();
        this.buildVillage();
        this.buildForest();
        this.buildLake();
        this.buildRuins();
        this.buildMountains();
        this.addAtmosphere();
    }

    // ============ CIEL HDRI RÉALISTE ============
    async setupSky() {
        return new Promise((resolve) => {
            const rgbeLoader = new RGBELoader();
            // HDRI gratuit de Poly Haven (CC0)
            rgbeLoader.load(
                'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_06_puresky_1k.hdr',
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    this.scene.background = texture;
                    this.scene.environment = texture;
                    this.scene.fog = new THREE.FogExp2(0xc8d8e8, 0.008);
                    resolve();
                },
                undefined,
                (err) => {
                    // Fallback ciel simple
                    this.scene.background = new THREE.Color(0x8cb8d8);
                    this.scene.fog = new THREE.FogExp2(0xc8d8e8, 0.008);
                    resolve();
                }
            );
        });
    }

    // ============ LUMIÈRES CINÉMATOGRAPHIQUES ============
    setupLights() {
        // Soleil directionnel réaliste
        const sun = new THREE.DirectionalLight(0xfff8e0, 3.5);
        sun.position.set(60, 100, -80);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        sun.shadow.bias = -0.0005;
        sun.shadow.normalBias = 0.02;
        this.scene.add(sun);
        this.sun = sun;

        // Lumière ambiante douce
        const ambient = new THREE.HemisphereLight(0x87CEEB, 0x4a6a3a, 0.6);
        this.scene.add(ambient);

        // Rim light pour détacher les persos
        const rimLight = new THREE.DirectionalLight(0xffaacc, 0.4);
        rimLight.position.set(-50, 30, 50);
        this.scene.add(rimLight);
    }

    // ============ TERRAIN DÉTAILLÉ ============
    setupTerrain() {
        // Grande plaine
        const size = 400;
        const segments = 200;
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        
        // Ajouter du relief naturel (bruit)
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const dist = Math.sqrt(x * x + y * y);
            // Terrain plat au centre (village), ondulé ailleurs
            let height = 0;
            if (dist > 30) {
                height = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.5;
                height += Math.sin(x * 0.1) * 0.2;
            }
            positions.setZ(i, height);
        }
        geometry.computeVertexNormals();

        // Texture herbe réaliste (Poly Haven / Three.js)
        const textureLoader = new THREE.TextureLoader();
        const grassColor = textureLoader.load(
            'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/terrain/grasslight-big.jpg'
        );
        grassColor.wrapS = grassColor.wrapT = THREE.RepeatWrapping;
        grassColor.repeat.set(50, 50);
        grassColor.colorSpace = THREE.SRGBColorSpace;
        grassColor.anisotropy = 8;

        const groundMat = new THREE.MeshStandardMaterial({
            map: grassColor,
            roughness: 1,
            metalness: 0,
            color: 0x8fb870,
        });

        const ground = new THREE.Mesh(geometry, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.ground = ground;
    }

    // ============ VILLAGE DE BUINA ============
    buildVillage() {
        // Route principale en pierre
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x8a7a6a,
            roughness: 0.95,
        });
        const road = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 100),
            roadMat
        );
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.02;
        road.receiveShadow = true;
        this.scene.add(road);

        // Maisons
        this.addHouse(-12, 0, -10, 0.3, 0xc09060);
        this.addHouse(14, 0, -12, -0.5, 0xb08050);
        this.addHouse(-18, 0, 8, 0.7, 0xa87040);
        this.addHouse(18, 0, 6, -0.6, 0xb88550);
        this.addHouse(-8, 0, 15, 0.2, 0xc09a70);
        this.addHouse(10, 0, 18, -0.3, 0xb58560);

        // Maison de Rudeus (plus grande)
        this.addBigHouse(0, 0, -20);

        // Fontaine centrale
        this.addFountain(0, 0, 0);

        // Lampadaires
        this.addLampPost(-6, 0, -5);
        this.addLampPost(6, 0, -5);
        this.addLampPost(-6, 0, 5);
        this.addLampPost(6, 0, 5);
        this.addLampPost(-6, 0, -15);
        this.addLampPost(6, 0, -15);

        // Arbres du village
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const r = 25 + Math.random() * 8;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            this.addTree(x, 0, z, 1 + Math.random() * 0.4);
        }

        this.locationMarkers.push({ name: 'Buina Village', x: 0, z: 0, radius: 30 });
    }

    addHouse(x, y, z, rotation = 0, color = 0xc09060) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotation;

        // Murs avec texture bois
        const wallMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
        });
        const walls = new THREE.Mesh(
            new THREE.BoxGeometry(6, 3.5, 5),
            wallMat
        );
        walls.position.y = 1.75;
        walls.castShadow = true;
        walls.receiveShadow = true;
        group.add(walls);

        // Toit à deux pentes
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x7a2a15,
            roughness: 0.85,
        });
        const roofGeo = new THREE.ConeGeometry(4.8, 2.5, 4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 4.75;
        roof.rotation.y = Math.PI / 4;
        roof.scale.set(1, 1, 0.8);
        roof.castShadow = true;
        group.add(roof);

        // Porte
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x3a1a05,
            roughness: 0.7,
        });
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 2.4, 0.15),
            doorMat
        );
        door.position.set(0, 1.2, 2.51);
        group.add(door);

        // Fenêtres lumineuses
        const windowMat = new THREE.MeshStandardMaterial({
            color: 0xffdd88,
            emissive: 0xffaa44,
            emissiveIntensity: 1,
            roughness: 0.1,
        });
        const win1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), windowMat);
        win1.position.set(-1.8, 2, 2.52);
        group.add(win1);
        const win2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), windowMat);
        win2.position.set(1.8, 2, 2.52);
        group.add(win2);

        // Lumière chaude intérieure
        const light = new THREE.PointLight(0xffcc66, 15, 12, 2);
        light.position.set(0, 2, 2.6);
        group.add(light);

        this.scene.add(group);
        this.colliders.push({ obj: group, radius: 4 });
    }

    addBigHouse(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.85 });
        const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 8), wallMat);
        walls.position.y = 2.25;
        walls.castShadow = true;
        walls.receiveShadow = true;
        group.add(walls);

        const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a2010, roughness: 0.75 });
        const roof = new THREE.Mesh(new THREE.ConeGeometry(7.8, 3, 4), roofMat);
        roof.position.y = 6;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        // Porte
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 3, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x3a1a05, roughness: 0.7 })
        );
        door.position.set(0, 1.5, 4.05);
        group.add(door);

        // Fenêtres
        const windowMat = new THREE.MeshStandardMaterial({
            color: 0xffdd88,
            emissive: 0xffaa44,
            emissiveIntensity: 1.2,
        });
        for (const wx of [-3, 3]) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), windowMat);
            win.position.set(wx, 2.8, 4.06);
            group.add(win);
        }

        // Lumière
        const light = new THREE.PointLight(0xffcc66, 25, 18, 2);
        light.position.set(0, 3, 5);
        group.add(light);

        this.scene.add(group);
        this.colliders.push({ obj: group, radius: 6 });
    }

    addFountain(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Base en pierre
        const stoneMat = new THREE.MeshStandardMaterial({
            color: 0xa8a8a8,
            roughness: 0.9,
        });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 0.8, 24), stoneMat);
        base.position.y = 0.4;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Eau
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x44aaff,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85,
            emissive: 0x2266aa,
            emissiveIntensity: 0.3,
        });
        const water = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.2, 24), waterMat);
        water.position.y = 0.85;
        group.add(water);

        // Colonne centrale
        const column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3, 16), stoneMat);
        column.position.y = 2;
        column.castShadow = true;
        group.add(column);

        // Bassin supérieur
        const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.5, 0.4, 16), stoneMat);
        topBowl.position.y = 3.4;
        topBowl.castShadow = true;
        group.add(topBowl);

        const topWater = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5, 1.5, 0.15, 16),
            waterMat
        );
        topWater.position.y = 3.65;
        group.add(topWater);

        // Jet d'eau (particules)
        const jetMat = new THREE.MeshStandardMaterial({
            color: 0x88ddff,
            transparent: true,
            opacity: 0.6,
            emissive: 0x88ddff,
            emissiveIntensity: 0.8,
        });
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 2, 8), jetMat);
        jet.position.y = 4.7;
        group.add(jet);

        this.scene.add(group);
        this.colliders.push({ obj: group, radius: 4.5 });
    }

    addLampPost(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.8,
            roughness: 0.4,
        });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 8), metalMat);
        pole.position.y = 2.5;
        pole.castShadow = true;
        group.add(pole);

        // Lanterne
        const lampMat = new THREE.MeshStandardMaterial({
            color: 0xffcc66,
            emissive: 0xffaa33,
            emissiveIntensity: 2,
            transparent: true,
            opacity: 0.9,
        });
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), lampMat);
        lamp.position.y = 5.4;
        group.add(lamp);

        const light = new THREE.PointLight(0xffaa44, 30, 25, 2);
        light.position.y = 5.4;
        light.castShadow = false;
        group.add(light);

        this.scene.add(group);
    }

    // ============ FORÊT RÉALISTE ============
    buildForest() {
        // Zone forestière au nord
        for (let i = 0; i < 120; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 50 + Math.random() * 80;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r - 40;
            
            if (Math.abs(x) < 35 && Math.abs(z) < 35) continue; // Pas dans le village
            
            this.addTree(x, 0, z, 1.5 + Math.random() * 2);
        }
        this.locationMarkers.push({ name: 'Forêt de Buina', x: 0, z: -80, radius: 50 });
    }

    addTree(x, y, z, scale = 1) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const trunkMat = new THREE.MeshStandardMaterial({
            color: 0x4a2a15,
            roughness: 0.95,
        });
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 4 * scale, 8),
            trunkMat
        );
        trunk.position.y = 2 * scale;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // Feuillage (plusieurs sphères pour effet naturel)
        const leafMat = new THREE.MeshStandardMaterial({
            color: 0x2d5a1e,
            roughness: 1,
        });
        for (let i = 0; i < 3; i++) {
            const foliage = new THREE.Mesh(
                new THREE.SphereGeometry((2.5 - i * 0.5) * scale, 12, 10),
                leafMat
            );
            foliage.position.y = (4 + i * 1.2) * scale;
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            // Légère déformation pour effet naturel
            foliage.scale.x = 1 + Math.random() * 0.2;
            foliage.scale.z = 1 + Math.random() * 0.2;
            group.add(foliage);
        }

        this.scene.add(group);
    }

    // ============ LAC ============
    buildLake() {
        const lakeMat = new THREE.MeshPhysicalMaterial({
            color: 0x2266aa,
            roughness: 0.05,
            metalness: 0.5,
            transmission: 0.6,
            transparent: true,
            opacity: 0.9,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
        });
        const lake = new THREE.Mesh(
            new THREE.CircleGeometry(35, 64),
            lakeMat
        );
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(120, 0.15, 30);
        lake.receiveShadow = true;
        this.scene.add(lake);

        // Berges
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const x = 120 + Math.cos(angle) * 37;
            const z = 30 + Math.sin(angle) * 37;
            this.addRock(x, 0, z, 0.6 + Math.random() * 0.8);
        }

        this.locationMarkers.push({ name: 'Lac Sacré', x: 120, z: 30, radius: 40 });
    }

    addRock(x, y, z, scale = 1) {
        const rockMat = new THREE.MeshStandardMaterial({
            color: 0x6a6a70,
            roughness: 1,
        });
        const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(scale, 0),
            rockMat
        );
        rock.position.set(x, y + scale * 0.5, z);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.scale.set(1 + Math.random() * 0.3, 0.7 + Math.random() * 0.3, 1 + Math.random() * 0.3);
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);
    }

    // ============ RUINES ============
    buildRuins() {
        const stoneMat = new THREE.MeshStandardMaterial({
            color: 0x9a9080,
            roughness: 0.95,
        });

        // Colonnes brisées
        const positions = [
            [-10, -8], [8, -12], [-5, 10], [12, 5],
            [-15, 0], [15, 0], [0, -15], [0, 15]
        ];

        positions.forEach(([x, z]) => {
            const height = 3 + Math.random() * 4;
            const column = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 0.9, height, 12),
                stoneMat
            );
            column.position.set(x - 140, height / 2, z);
            column.castShadow = true;
            column.receiveShadow = true;
            this.scene.add(column);
        });

        // Arche centrale
        const archGroup = new THREE.Group();
        archGroup.position.set(-140, 0, 0);
        const pillar1 = new THREE.Mesh(
            new THREE.BoxGeometry(1, 8, 1),
            stoneMat
        );
        pillar1.position.set(-3, 4, 0);
        pillar1.castShadow = true;
        archGroup.add(pillar1);
        
        const pillar2 = pillar1.clone();
        pillar2.position.set(3, 4, 0);
        archGroup.add(pillar2);

        const lintel = new THREE.Mesh(
            new THREE.BoxGeometry(7, 1, 1),
            stoneMat
        );
        lintel.position.set(0, 8.5, 0);
        lintel.castShadow = true;
        archGroup.add(lintel);

        this.scene.add(archGroup);

        // Sol en pierre
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x7a7060,
            roughness: 0.95,
        });
        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(25, 32),
            floorMat
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(-140, 0.05, 0);
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.locationMarkers.push({ name: 'Ruines Antiques', x: -140, z: 0, radius: 35 });
    }

    // ============ MONTAGNES ============
    buildMountains() {
        const rockMat = new THREE.MeshStandardMaterial({
            color: 0x7a8a9a,
            roughness: 1,
        });
        const snowMat = new THREE.MeshStandardMaterial({
            color: 0xf0f4f8,
            roughness: 0.9,
        });

        // Chaîne de montagnes au sud
        for (let i = 0; i < 8; i++) {
            const x = -150 + i * 40;
            const baseHeight = 40 + Math.random() * 30;
            
            const mountain = new THREE.Mesh(
                new THREE.ConeGeometry(30 + Math.random() * 10, baseHeight, 6),
                rockMat
            );
            mountain.position.set(x, baseHeight / 2, 180);
            mountain.rotation.y = Math.random() * Math.PI;
            mountain.castShadow = true;
            mountain.receiveShadow = true;
            this.scene.add(mountain);

            // Neige au sommet
            const snow = new THREE.Mesh(
                new THREE.ConeGeometry(8, baseHeight * 0.25, 6),
                snowMat
            );
            snow.position.set(x, baseHeight - baseHeight * 0.1, 180);
            snow.rotation.y = mountain.rotation.y;
            this.scene.add(snow);
        }
        this.locationMarkers.push({ name: 'Montagnes', x: 0, z: 180, radius: 60 });
    }

    // ============ ATMOSPHÈRE (particules) ============
    addAtmosphere() {
        // Poussière / pollen flottant
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 1] = Math.random() * 20 + 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        
        this.particles = new THREE.Points(geometry, particleMat);
        this.scene.add(this.particles);
    }

    // ============ ANIMATION ============
    update(delta, time) {
        // Faire flotter les particules
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += Math.sin(time + i) * 0.002;
                if (positions[i] > 22) positions[i] = 2;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    // ============ COLLISION ============
    checkCollision(newPos, playerRadius = 0.5) {
        for (const collider of this.colliders) {
            const objPos = collider.obj.position;
            const dx = newPos.x - objPos.x;
            const dz = newPos.z - objPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < collider.radius + playerRadius) {
                return true;
            }
        }
        return false;
    }
}
