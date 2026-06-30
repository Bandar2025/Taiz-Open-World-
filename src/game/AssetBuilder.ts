import * as THREE from 'three';
import { AssetLoader } from './AssetLoader';

/**
 * Procedural Asset Builder for Taiz Open World Game
 * Creates visually stunning, culturally accurate 3D objects using Three.js primitives
 */
export class AssetBuilder {

  // Helper to create a decorative plaster arch (Qamariyah - قمرية) on houses
  private static createQamariyahGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    // A beautiful half-circle arch window shape
    shape.moveTo(-0.25, -0.4);
    shape.lineTo(-0.25, 0.1);
    shape.absarc(0, 0.1, 0.25, Math.PI, 0, true);
    shape.lineTo(0.25, -0.4);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  // Helper to create a traditional crescent (هلال) for mosque domes and minarets
  private static createCrescentMesh(): THREE.Mesh {
    const group = new THREE.Group();
    const crescentShape = new THREE.Shape();
    crescentShape.absarc(0, 0, 0.3, 0, Math.PI * 2);
    const holePath = new THREE.Path();
    holePath.absarc(0.12, 0.08, 0.26, 0, Math.PI * 2);
    crescentShape.holes.push(holePath);

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
    const geom = new THREE.ExtrudeGeometry(crescentShape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xffa500,
      emissiveIntensity: 0.2
    });
    return new THREE.Mesh(geom, mat);
  }

  /**
   * Generates a traditional Yemeni multi-story tower house (بيت يمني)
   */
  public static createYemeniHouse(options: { width: number; depth: number; height: number; stories: number; colorSeed: number }): THREE.Group {
    const group = new THREE.Group();
    const { width, depth, height, stories } = options;
    const storyHeight = height / stories;

    // 1. Foundation and main stone walls
    // Traditional Taiz houses use reddish-brown, greyish-blue, and dark volcanic stones.
    const wallColors = [0x8b5a2b, 0x5c4033, 0x6e7f80, 0x4a525a, 0x996515];
    const baseColor = wallColors[options.colorSeed % wallColors.length];

    // Build story by story for texture division
    for (let i = 0; i < stories; i++) {
      const isTop = i === stories - 1;
      const isBase = i === 0;

      // Wall segment
      const storyGeom = new THREE.BoxGeometry(width - 0.05 * i, storyHeight, depth - 0.05 * i);
      
      // Traditional Yemeni whitewashed plaster accents around window sections (Takhrim - تخريم)
      const storyMat = new THREE.MeshStandardMaterial({
        color: isTop ? 0xebe6dd : baseColor, // Top story is often entirely whitewashed (Plaster/Nura)
        roughness: 0.9,
        metalness: 0.1
      });
      const storyMesh = new THREE.Mesh(storyGeom, storyMat);
      storyMesh.position.y = i * storyHeight + storyHeight / 2;
      storyMesh.castShadow = true;
      storyMesh.receiveShadow = true;
      group.add(storyMesh);

      // Horizontal white bands dividing stories (Hizam - حزام)
      const bandGeom = new THREE.BoxGeometry(width + 0.08 - 0.05 * i, 0.15, depth + 0.08 - 0.05 * i);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.8 });
      const bandMesh = new THREE.Mesh(bandGeom, bandMat);
      bandMesh.position.y = i * storyHeight + storyHeight;
      bandMesh.castShadow = true;
      group.add(bandMesh);

      // Windows
      const numWindowsFront = Math.floor(width / 1.2);
      const numWindowsSides = Math.floor(depth / 1.2);
      const qamariyahGeom = this.createQamariyahGeometry();

      // Front & Back Windows
      for (let w = 0; w < numWindowsFront; w++) {
        const xOffset = (w - (numWindowsFront - 1) / 2) * 1.1;
        // Front Windows
        const windowGroup = this.createYemeniWindowGroup(qamariyahGeom);
        windowGroup.position.set(xOffset, i * storyHeight + storyHeight / 2, depth / 2 + 0.02 - 0.025 * i);
        group.add(windowGroup);

        // Back Windows
        const windowGroupBack = this.createYemeniWindowGroup(qamariyahGeom);
        windowGroupBack.rotation.y = Math.PI;
        windowGroupBack.position.set(xOffset, i * storyHeight + storyHeight / 2, -depth / 2 - 0.02 + 0.025 * i);
        group.add(windowGroupBack);
      }

      // Left & Right Windows
      for (let w = 0; w < numWindowsSides; w++) {
        const zOffset = (w - (numWindowsSides - 1) / 2) * 1.1;
        // Left Window
        const windowGroupLeft = this.createYemeniWindowGroup(qamariyahGeom);
        windowGroupLeft.rotation.y = -Math.PI / 2;
        windowGroupLeft.position.set(-width / 2 - 0.02 + 0.025 * i, i * storyHeight + storyHeight / 2, zOffset);
        group.add(windowGroupLeft);

        // Right Window
        const windowGroupRight = this.createYemeniWindowGroup(qamariyahGeom);
        windowGroupRight.rotation.y = Math.PI / 2;
        windowGroupRight.position.set(width / 2 + 0.02 - 0.025 * i, i * storyHeight + storyHeight / 2, zOffset);
        group.add(windowGroupRight);
      }
    }

    // 2. Beautiful Crown/Parapet on Roof (Areesh - عريش / Tafreej)
    const crownGroup = new THREE.Group();
    const parapetHeight = 0.8;
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.8 }); // White plaster

    // Build traditional geometric points on corners and edges
    const points = [
      { x: -width/2, z: -depth/2 },
      { x: width/2, z: -depth/2 },
      { x: -width/2, z: depth/2 },
      { x: width/2, z: depth/2 },
      { x: 0, z: depth/2 },
      { x: 0, z: -depth/2 }
    ];

    points.forEach(pt => {
      // Decorative white horn / pinnacle
      const pinnacleGeom = new THREE.ConeGeometry(0.2, parapetHeight, 4);
      const pinnacle = new THREE.Mesh(pinnacleGeom, crownMat);
      pinnacle.position.set(pt.x, height + parapetHeight / 2, pt.z);
      pinnacle.castShadow = true;
      crownGroup.add(pinnacle);
    });

    // Parapet walls
    const paraGeomX = new THREE.BoxGeometry(width + 0.05, 0.4, 0.1);
    const paraGeomZ = new THREE.BoxGeometry(0.1, 0.4, depth + 0.05);
    
    const paraFront = new THREE.Mesh(paraGeomX, crownMat);
    paraFront.position.set(0, height + 0.2, depth / 2);
    crownGroup.add(paraFront);

    const paraBack = new THREE.Mesh(paraGeomX, crownMat);
    paraBack.position.set(0, height + 0.2, -depth / 2);
    crownGroup.add(paraBack);

    const paraLeft = new THREE.Mesh(paraGeomZ, crownMat);
    paraLeft.position.set(-width / 2, height + 0.2, 0);
    crownGroup.add(paraLeft);

    const paraRight = new THREE.Mesh(paraGeomZ, crownMat);
    paraRight.position.set(width / 2, height + 0.2, 0);
    crownGroup.add(paraRight);

    group.add(crownGroup);

    // 3. Add Atmosphere: Rooftop Water Tanks, Satellite Dishes, and AC Units
    this.addRooftopDetails(group, width, depth, height);

    return group;
  }

  /**
   * Decorates a building with authentic Taiz rooftop and wall elements
   */
  private static addRooftopDetails(group: THREE.Group, width: number, depth: number, height: number) {
    // Rooftop props
    if (Math.random() > 0.2) {
      const tank = this.createWaterTank();
      tank.position.set((Math.random() - 0.5) * width * 0.6, height, (Math.random() - 0.5) * depth * 0.6);
      group.add(tank);
    }
    
    if (Math.random() > 0.3) {
      const dish = this.createSatelliteDish();
      dish.position.set((Math.random() - 0.5) * width * 0.7, height, (Math.random() - 0.5) * depth * 0.7);
      group.add(dish);
    }

    // Wall props (AC units)
    for (let i = 0; i < 4; i++) {
      if (Math.random() > 0.6) {
        const ac = this.createACUnit();
        const angle = i * (Math.PI / 2);
        ac.rotation.y = angle;
        const offset = 0.05;
        const x = i % 2 === 0 ? (Math.random()-0.5)*width*0.5 : (i === 1 ? width/2 + offset : -width/2 - offset);
        const z = i % 2 === 1 ? (Math.random()-0.5)*depth*0.5 : (i === 0 ? depth/2 + offset : -depth/2 - offset);
        ac.position.set(x, 2 + Math.random() * (height - 4), z);
        group.add(ac);
      }
    }
  }

  // Create individual traditional arches
  private static createYemeniWindowGroup(qamariyahGeom: THREE.BufferGeometry): THREE.Group {
    const winGroup = new THREE.Group();

    // Plaster border (White)
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const borderMesh = new THREE.Mesh(qamariyahGeom, borderMat);
    borderMesh.scale.set(1.1, 1.1, 1);
    borderMesh.position.z = 0.01;
    winGroup.add(borderMesh);

    // Beautiful Colored Glass (Qamariyah window lights)
    const glassColors = [0xff4500, 0x1e90ff, 0x32cd32, 0xffd700];
    const chosenColor = glassColors[Math.floor(Math.random() * glassColors.length)];
    const glassMat = new THREE.MeshStandardMaterial({
      color: chosenColor,
      roughness: 0.1,
      metalness: 0.9,
      emissive: chosenColor,
      emissiveIntensity: 0.4
    });
    const glassMesh = new THREE.Mesh(qamariyahGeom, glassMat);
    glassMesh.position.z = 0.02;
    winGroup.add(glassMesh);

    // Wooden lower shutter
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.8 });
    const shutterGeom = new THREE.BoxGeometry(0.4, 0.35, 0.05);
    const shutter = new THREE.Mesh(shutterGeom, woodMat);
    shutter.position.set(0, -0.22, 0.01);
    winGroup.add(shutter);

    return winGroup;
  }

  /**
   * Generates Al-Ashrafiya inspired traditional Mosque (جامع)
   */
  public static createYemeniMosque(): THREE.Group {
    const mosque = new THREE.Group();

    // 1. Large Main Prayer Hall Base (Whitewashed bricks)
    const baseGeom = new THREE.BoxGeometry(10, 5, 10);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.7 });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.y = 2.5;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    mosque.add(baseMesh);

    // Arched columns and relief structures along the wall
    for (let side = 0; side < 4; side++) {
      const archWallGroup = new THREE.Group();
      const numArches = 3;
      for (let a = 0; a < numArches; a++) {
        const xOffset = (a - 1) * 2.8;
        const colGeom = new THREE.CylinderGeometry(0.12, 0.12, 3);
        const colMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
        const leftCol = new THREE.Mesh(colGeom, colMat);
        leftCol.position.set(xOffset - 0.8, 1.5, 5.05);
        leftCol.castShadow = true;
        archWallGroup.add(leftCol);

        const rightCol = leftCol.clone();
        rightCol.position.x = xOffset + 0.8;
        archWallGroup.add(rightCol);

        // Wooden heavy double doors in the center front arch
        if (side === 0 && a === 1) {
          const doorGeom = new THREE.BoxGeometry(1.4, 2.4, 0.1);
          const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a2a16, roughness: 0.9, metalness: 0.2 });
          const door = new THREE.Mesh(doorGeom, doorMat);
          door.position.set(xOffset, 1.2, 5.01);
          door.castShadow = true;
          archWallGroup.add(door);
        }
      }

      archWallGroup.rotation.y = (side * Math.PI) / 2;
      mosque.add(archWallGroup);
    }

    // 2. Large Central Golden Dome (القبة الكبرى)
    const domeGeom = new THREE.SphereGeometry(3.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe6b800,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xd4af37,
      emissiveIntensity: 0.15
    });
    const mainDome = new THREE.Mesh(domeGeom, goldMat);
    mainDome.position.y = 5;
    mainDome.castShadow = true;
    mosque.add(mainDome);

    // 4 Corner Small White Domes (القِباب الصغرى)
    const smallDomeGeom = new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const whiteDomeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const cornerOffsets = [
      { x: -4, z: -4 },
      { x: 4, z: -4 },
      { x: -4, z: 4 },
      { x: 4, z: 4 }
    ];
    cornerOffsets.forEach(offset => {
      const sDome = new THREE.Mesh(smallDomeGeom, whiteDomeMat);
      sDome.position.set(offset.x, 5, offset.z);
      sDome.castShadow = true;
      mosque.add(sDome);
    });

    // 3. Tall White Elegant Minaret (المئذنة)
    const minaret = new THREE.Group();
    minaret.position.set(4, 0, -4); // Back right corner

    // Minaret Base Octagonal section
    const minBaseGeom = new THREE.CylinderGeometry(1.0, 1.1, 4, 8);
    const minBase = new THREE.Mesh(minBaseGeom, baseMat);
    minBase.position.y = 2;
    minBase.castShadow = true;
    minaret.add(minBase);

    // Main shaft (slender cylindrical)
    const shaftGeom = new THREE.CylinderGeometry(0.7, 0.8, 8, 12);
    const shaft = new THREE.Mesh(shaftGeom, baseMat);
    shaft.position.y = 8;
    shaft.castShadow = true;
    minaret.add(shaft);

    // Muazzin Balcony (شرفة المؤذن)
    const balconyGeom = new THREE.CylinderGeometry(1.1, 0.8, 0.6, 12);
    const balconyMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.7 });
    const balcony = new THREE.Mesh(balconyGeom, balconyMat);
    balcony.position.y = 12.3;
    balcony.castShadow = true;
    minaret.add(balcony);

    // Upper slender tower and Dome spire
    const upperGeom = new THREE.CylinderGeometry(0.45, 0.45, 2.5, 8);
    const upper = new THREE.Mesh(upperGeom, baseMat);
    upper.position.y = 13.85;
    upper.castShadow = true;
    minaret.add(upper);

    const minDomeGeom = new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const minDome = new THREE.Mesh(minDomeGeom, goldMat);
    minDome.position.y = 15.1;
    minDome.castShadow = true;
    minaret.add(minDome);

    // Golden Crescent Moon on Top of Minaret
    const crescent = this.createCrescentMesh();
    crescent.position.set(0, 16.0, 0);
    crescent.rotation.y = Math.PI / 4;
    minaret.add(crescent);

    mosque.add(minaret);

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(mosque, '/assets/models/buildings/mosque.glb', {
      targetHeight: 5,
      centerPivot: true
    });

    return mosque;
  }

  /**
   * Generates a realistic traditional Yemeni Market Stall (بسطة سوق)
   */
  public static createMarketStall(typeSeed: number): THREE.Group {
    const stall = new THREE.Group();

    // Wooden Frame structure
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const postGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.2);
    
    // Four posts
    const post1 = new THREE.Mesh(postGeom, frameMat);
    post1.position.set(-1.2, 1.1, -1);
    post1.castShadow = true;
    stall.add(post1);

    const post2 = post1.clone();
    post2.position.set(1.2, 1.1, -1);
    stall.add(post2);

    const post3 = post1.clone();
    post3.position.set(-1.2, 0.9, 1); // Front is slightly lower for slanted roof
    stall.add(post3);

    const post4 = post3.clone();
    post4.position.set(1.2, 0.9, 1);
    stall.add(post4);

    // Table top
    const tableGeom = new THREE.BoxGeometry(2.5, 0.15, 2.0);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const table = new THREE.Mesh(tableGeom, tableMat);
    table.position.y = 0.8;
    table.castShadow = true;
    table.receiveShadow = true;
    stall.add(table);

    // Slanted fabric awning/canopy (سقف خيش ملون)
    const stripeColors = [0x990000, 0x005500, 0x002288, 0xd4af37, 0xcc5500];
    const canopyColor = stripeColors[typeSeed % stripeColors.length];
    
    const roofGeom = new THREE.BoxGeometry(2.7, 0.08, 2.2);
    const roofMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.95 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.set(0, 2.15, 0);
    roof.rotation.x = 0.1; // Slanted forward
    roof.castShadow = true;
    stall.add(roof);

    // Beautiful procedural display products (baskets, spices, jars)
    const goodsColors = [0xd27d2d, 0xcc5533, 0xffd700, 0x556b2f, 0x800020];
    for (let x = -1.0; x <= 1.0; x += 0.5) {
      for (let z = -0.7; z <= 0.7; z += 0.5) {
        if (Math.random() > 0.3) {
          // Basket or jar
          const basketGeom = new THREE.CylinderGeometry(0.18, 0.14, 0.25, 8);
          const basketMat = new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.9 });
          const basket = new THREE.Mesh(basketGeom, basketMat);
          basket.position.set(x + (Math.random() - 0.5) * 0.1, 0.95, z + (Math.random() - 0.5) * 0.1);
          basket.castShadow = true;
          stall.add(basket);

          // Spice pile inside basket
          const spiceGeom = new THREE.ConeGeometry(0.16, 0.15, 8);
          const spiceColor = goodsColors[Math.floor(Math.random() * goodsColors.length)];
          const spiceMat = new THREE.MeshStandardMaterial({ color: spiceColor, roughness: 1.0 });
          const spice = new THREE.Mesh(spiceGeom, spiceMat);
          spice.position.set(basket.position.x, 1.1, basket.position.z);
          stall.add(spice);
        }
      }
    }

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(stall, '/assets/models/props/market_stall.glb', {
      targetHeight: 2.2,
      centerPivot: true
    });

    return stall;
  }

  /**
   * Generates a modern Fuel Station (محطة محروقات نموذجية)
   */
  public static createFuelStation(): THREE.Group {
    const station = new THREE.Group();

    // 1. Large Canopy Roof (السقف الواقي)
    const canopyGeom = new THREE.BoxGeometry(10, 0.6, 6);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a45, metalness: 0.5, roughness: 0.3 });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 4.5, 0);
    canopy.castShadow = true;
    station.add(canopy);

    // Decorative Yellow/Green stripe along canopy (popular in Yemen, e.g., YPC brand colors)
    const stripeGeom = new THREE.BoxGeometry(10.1, 0.15, 6.1);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x009944, emissive: 0x009944, emissiveIntensity: 0.2 });
    const stripe = new THREE.Mesh(stripeGeom, stripeMat);
    stripe.position.set(0, 4.5, 0);
    station.add(stripe);

    // Support pillars
    const pillarGeom = new THREE.CylinderGeometry(0.25, 0.25, 4.5, 12);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
    
    const pillar1 = new THREE.Mesh(pillarGeom, pillarMat);
    pillar1.position.set(-3.5, 2.25, 0);
    pillar1.castShadow = true;
    station.add(pillar1);

    const pillar2 = pillar1.clone();
    pillar2.position.set(3.5, 2.25, 0);
    station.add(pillar2);

    // 2. Concrete Base Island
    const islandGeom = new THREE.BoxGeometry(8, 0.25, 2.5);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 });
    const island = new THREE.Mesh(islandGeom, islandMat);
    island.position.set(0, 0.125, 0);
    island.receiveShadow = true;
    station.add(island);

    // 3. Fuel Pumps (مضخة الوقود)
    const pumpGeom = new THREE.BoxGeometry(0.8, 1.6, 0.6);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.4, metalness: 0.6 }); // Red pump
    
    const pump1 = new THREE.Mesh(pumpGeom, pumpMat);
    pump1.position.set(-1.8, 1.0, 0);
    pump1.castShadow = true;
    station.add(pump1);

    // Interactive Fuel Screen mesh
    const screenGeom = new THREE.BoxGeometry(0.5, 0.4, 0.62);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x003300, emissive: 0x00ff00, emissiveIntensity: 0.3 });
    const screen1 = new THREE.Mesh(screenGeom, screenMat);
    screen1.position.set(-1.8, 1.2, 0);
    station.add(screen1);

    const pump2 = pump1.clone();
    pump2.position.set(1.8, 1.0, 0);
    station.add(pump2);

    const screen2 = screen1.clone();
    screen2.position.set(1.8, 1.2, 0);
    station.add(screen2);

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(station, '/assets/models/buildings/fuel_station.glb', {
      targetHeight: 4.5,
      centerPivot: true
    });

    return station;
  }

  /**
   * Generates a gorgeous, stylized 3D Yemeni Player Model (شاب بالثوب والجنبية والعمامة)
   */
  public static createYemeniPlayer(
    skinColor: number = 0xd2a679,
    thobeColor: number = 0xfcf9f2,
    turbanColor: number = 0x990000,
    isNPC: boolean = false,
    characterType?: 'yemeni_man' | 'modern_man' | 'veiled_woman'
  ): THREE.Group {
    const player = new THREE.Group();

    // Determine type for NPCs if not specified
    let resolvedType = characterType;
    if (isNPC && !resolvedType) {
      // Randomly assign a character type for NPCs to ensure diversity
      const r = Math.random();
      if (r < 0.4) resolvedType = 'yemeni_man';
      else if (r < 0.7) resolvedType = 'modern_man';
      else resolvedType = 'veiled_woman';
    }

    // Material adaptations based on character type for procedural fallback
    let finalThobeColor = thobeColor;
    let finalTurbanColor = turbanColor;
    let pantsColor = thobeColor;
    let armColor = thobeColor;

    if (resolvedType === 'veiled_woman') {
      finalThobeColor = 0x111113; // Black Abaya
      finalTurbanColor = 0x111113; // Black Hijab
    } else if (resolvedType === 'modern_man') {
      // Pick a casual color for the modern shirt (torso and arms)
      const casualColors = [0x3b82f6, 0x10b981, 0xef4444, 0xf59e0b, 0x6366f1, 0x475569];
      finalThobeColor = casualColors[Math.floor(Math.random() * casualColors.length)];
      // Pants color (legs)
      const pantsColors = [0x1e293b, 0x334155, 0x1e3a8a, 0x22252a];
      pantsColor = pantsColors[Math.floor(Math.random() * pantsColors.length)];
      armColor = finalThobeColor;
    }

    // Materials
    const thobeMat = new THREE.MeshStandardMaterial({ color: finalThobeColor, roughness: 0.85 });
    const armMat = new THREE.MeshStandardMaterial({ color: armColor, roughness: 0.85 });
    const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const goldPlaitMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.5 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const turbanMat = new THREE.MeshStandardMaterial({ color: finalTurbanColor, roughness: 0.9 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7, metalness: 0.1 });
    const embMat = new THREE.MeshStandardMaterial({ color: 0xcca333, metalness: 0.8, roughness: 0.2 });
    const sandalMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });

    // 1. Torso/Chest (الصدر والظهر)
    const torsoGeom = new THREE.CylinderGeometry(0.24, 0.28, 0.65, 12);
    const torso = new THREE.Mesh(torsoGeom, thobeMat);
    torso.name = "thobe"; // Keep same name for compatibility
    torso.position.y = 1.35;
    torso.castShadow = true;
    torso.receiveShadow = true;
    player.add(torso);

    // Collar / Neck embroidery (only for traditional men)
    const collarGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12);
    const collar = new THREE.Mesh(collarGeom, resolvedType === 'yemeni_man' || !resolvedType ? goldPlaitMat : thobeMat);
    collar.name = "collar";
    collar.position.y = 1.68;
    collar.visible = (resolvedType !== 'veiled_woman' && resolvedType !== 'modern_man');
    player.add(collar);

    // 2. Head Group (مجموعة الرأس والرقبة والعمامة والوجه)
    const headGroup = new THREE.Group();
    headGroup.name = "headGroup";
    headGroup.position.set(0, 1.72, 0);

    const headGeom = new THREE.SphereGeometry(0.20, 16, 16);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.name = "head";
    head.position.y = 0.20;
    head.castShadow = true;
    headGroup.add(head);

    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.025, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.name = "leftEye";
    leftEye.position.set(0.07, 0.23, 0.17);
    headGroup.add(leftEye);

    const rightEye = leftEye.clone();
    rightEye.name = "rightEye";
    rightEye.position.x = -0.07;
    headGroup.add(rightEye);

    // Beard (only for traditional men)
    const beardGeom = new THREE.BoxGeometry(0.16, 0.14, 0.10);
    const beard = new THREE.Mesh(beardGeom, blackMat);
    beard.name = "beard";
    beard.position.set(0, 0.08, 0.14);
    beard.visible = (resolvedType === 'yemeni_man' || !resolvedType);
    headGroup.add(beard);

    // Mustache (only for traditional men)
    const mustacheGeom = new THREE.BoxGeometry(0.12, 0.04, 0.06);
    const mustache = new THREE.Mesh(mustacheGeom, blackMat);
    mustache.name = "mustache";
    mustache.position.set(0, 0.14, 0.17);
    mustache.visible = (resolvedType === 'yemeni_man' || !resolvedType);
    headGroup.add(mustache);

    // Headwear / Hijab / Turban Setup
    const turbanGroup = new THREE.Group();
    turbanGroup.name = "turbanGroup";
    turbanGroup.position.y = 0.35;

    if (resolvedType === 'modern_man') {
      // Modern man gets a simple casual hair cap mesh instead of a turban
      const hairGeom = new THREE.SphereGeometry(0.205, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.8);
      const hair = new THREE.Mesh(hairGeom, blackMat);
      hair.name = "hair";
      hair.position.y = 0.21;
      headGroup.add(hair);
    } else {
      // Turban for traditional men, or Hijab/veil for women
      const turbanBaseGeom = new THREE.CylinderGeometry(0.22, 0.24, 0.14, 16);
      const turbanBase = new THREE.Mesh(turbanBaseGeom, turbanMat);
      turbanBase.name = "turbanBase";
      turbanGroup.add(turbanBase);

      const turbanTopGeom = new THREE.SphereGeometry(0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const turbanTop = new THREE.Mesh(turbanTopGeom, turbanMat);
      turbanTop.name = "turbanTop";
      turbanTop.position.y = 0.07;
      turbanGroup.add(turbanTop);

      if (resolvedType !== 'veiled_woman') {
        const tasselGeom = new THREE.CylinderGeometry(0.03, 0.01, 0.40, 6);
        const tassel = new THREE.Mesh(tasselGeom, turbanMat);
        tassel.name = "tassel";
        tassel.position.set(-0.20, -0.12, -0.04);
        tassel.rotation.z = 0.22;
        turbanGroup.add(tassel);
      }
      headGroup.add(turbanGroup);
    }

    player.add(headGroup);

    // 3. Heavy Leather Belt and Janbiya (حزام الجنبية الفاخر - only for traditional men)
    const beltGroup = new THREE.Group();
    beltGroup.name = "beltGroup";
    beltGroup.position.y = 1.05;

    const beltGeom = new THREE.CylinderGeometry(0.29, 0.29, 0.12, 12);
    const belt = new THREE.Mesh(beltGeom, beltMat);
    belt.name = "belt";
    belt.castShadow = true;
    beltGroup.add(belt);

    const ornament = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.04), embMat);
    ornament.name = "ornament";
    ornament.position.set(0, 0, 0.29);
    beltGroup.add(ornament);

    const sheathGroup = new THREE.Group();
    sheathGroup.name = "sheathGroup";
    sheathGroup.position.set(0, -0.04, 0.31);
    sheathGroup.rotation.z = -Math.PI / 8;

    const upperSheath = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.06), embMat);
    upperSheath.name = "upperSheath";
    sheathGroup.add(upperSheath);

    const curveShape = new THREE.Shape();
    curveShape.moveTo(-0.05, -0.09);
    curveShape.quadraticCurveTo(-0.03, -0.28, 0.12, -0.34);
    curveShape.quadraticCurveTo(0.15, -0.34, 0.13, -0.28);
    curveShape.quadraticCurveTo(0.02, -0.22, -0.02, -0.09);
    curveShape.closePath();

    const extrudeSettings = { depth: 0.05, bevelEnabled: false };
    const curveMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(curveShape, extrudeSettings), embMat);
    curveMesh.name = "curveMesh";
    curveMesh.position.z = -0.025;
    sheathGroup.add(curveMesh);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.5 }));
    handle.name = "handle";
    handle.position.set(0, 0.13, 0);
    sheathGroup.add(handle);

    beltGroup.add(sheathGroup);
    beltGroup.visible = (resolvedType === 'yemeni_man' || !resolvedType);
    player.add(beltGroup);

    // 4. Pelvis (الحوض)
    const pelvisGeom = new THREE.CylinderGeometry(0.28, 0.30, 0.22, 12);
    const pelvis = new THREE.Mesh(pelvisGeom, thobeMat);
    pelvis.name = "pelvis";
    pelvis.position.y = 0.95;
    pelvis.castShadow = true;
    pelvis.receiveShadow = true;
    player.add(pelvis);

    // 5. Animated Arm Groups (Pivoting from shoulders)
    const leftArm = new THREE.Group();
    leftArm.name = "leftArm";
    leftArm.position.set(-0.35, 1.48, 0);

    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.60, 8), armMat);
    armMesh.position.y = -0.28;
    armMesh.castShadow = true;
    leftArm.add(armMesh);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
    leftHand.name = "leftHand";
    leftHand.position.set(0, -0.58, 0);
    leftArm.add(leftHand);

    player.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.name = "rightArm";
    rightArm.position.set(0.35, 1.48, 0);

    const rightArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.60, 8), armMat);
    rightArmMesh.position.y = -0.28;
    rightArmMesh.castShadow = true;
    rightArm.add(rightArmMesh);

    const rightHand = leftHand.clone();
    rightHand.name = "rightHand";
    rightArm.add(rightHand);

    player.add(rightArm);

    // 6. Animated Leg Groups (Pivoting from hips)
    const leftLeg = new THREE.Group();
    leftLeg.name = "leftLeg";
    leftLeg.position.set(-0.15, 0.85, 0);

    const legMeshGeom = new THREE.CylinderGeometry(0.12, 0.10, 0.80, 8);
    const leftLegMesh = new THREE.Mesh(legMeshGeom, legMat);
    leftLegMesh.name = "leftLegMesh";
    leftLegMesh.position.y = -0.38;
    leftLegMesh.castShadow = true;
    leftLeg.add(leftLegMesh);

    const leftSandal = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 0.28), sandalMat);
    leftSandal.name = "leftSandal";
    leftSandal.position.set(0, -0.78, 0.04);
    leftSandal.castShadow = true;
    leftLeg.add(leftSandal);

    player.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.name = "rightLeg";
    rightLeg.position.set(0.15, 0.85, 0);

    const rightLegMesh = new THREE.Mesh(legMeshGeom, legMat);
    rightLegMesh.name = "rightLegMesh";
    rightLegMesh.position.y = -0.38;
    rightLegMesh.castShadow = true;
    rightLeg.add(rightLegMesh);

    const rightSandal = leftSandal.clone();
    rightSandal.name = "rightSandal";
    rightLeg.add(rightSandal);

    player.add(rightLeg);

    // Dynamic asset replacement if high-quality 3D asset exists
    let modelPath = '/assets/models/characters/player.glb';
    if (isNPC) {
      if (resolvedType === 'yemeni_man') {
        modelPath = '/assets/models/characters/yemeni_man.glb';
      } else if (resolvedType === 'modern_man') {
        modelPath = '/assets/models/characters/modern_man.glb';
      } else if (resolvedType === 'veiled_woman') {
        modelPath = '/assets/models/characters/veiled_woman.glb';
      } else {
        modelPath = '/assets/models/characters/npc.glb';
      }
    }

    // Try primary path first, then fallbacks
    const tryAssetReplacement = async () => {
      const loader = AssetLoader.getInstance();
      const exists = await loader.checkAssetExists(modelPath);
      let activePath = exists ? modelPath : null;

      if (!activePath && isNPC) {
        // Fallback to general NPC glb if specific one is missing
        const npcExists = await loader.checkAssetExists('/assets/models/characters/npc.glb');
        if (npcExists) activePath = '/assets/models/characters/npc.glb';
      } else if (!activePath && !isNPC) {
        // For player, fallback to specific Yemeni man model
        const manExists = await loader.checkAssetExists('/assets/models/characters/yemeni_man.glb');
        if (manExists) activePath = '/assets/models/characters/yemeni_man.glb';
      }

      if (activePath) {
        AssetLoader.replaceWithExternalModel(player, activePath, {
          targetHeight: 1.85, // Slightly taller for cinematic presence
          centerPivot: true,
          onSuccess: (loadedModel) => {
            loadedModel.name = "characterModel";
            // Ensure proper rotation if model is imported with offset
            loadedModel.rotation.y = Math.PI; // Face forward standard (0,0,1)
          }
        });
      } else {
        // Log the missing file to meet user's validation requirement
        console.warn(`[ASSET BUILDER] ❌ Character Model Not Found: ${modelPath}. Falling back to procedural.`);
      }
    };

    tryAssetReplacement();

    return player;
  }

  /**
   * Generates a fully detailed 3D Yemeni Vehicle (تويوتا لاندكروزر شاص أو هايلكس أو دباب دايسو/هايس يمني)
   */
  public static createYemeniVehicle(options: { model: 'shas' | 'hilux' | 'hiace' | 'motorcycle' | 'aircraft'; color: number }): THREE.Group {
    const car = new THREE.Group();
    const model = options.model;

    const bodyGroup = new THREE.Group();
    bodyGroup.name = "body";
    car.add(bodyGroup);

    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.85 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: options.color, metalness: 0.4, roughness: 0.2 });

    if (model === 'motorcycle') {
      // --- TRADITIONAL / MODERN YEMENI MOTORCYCLE (الدراجة النارية) ---
      // Frame
      const frameGeom = new THREE.BoxGeometry(0.3, 0.4, 1.8);
      const frame = new THREE.Mesh(frameGeom, darkMetalMat);
      frame.position.set(0, 0.6, 0);
      frame.castShadow = true;
      bodyGroup.add(frame);

      // Gas Tank
      const tankGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
      const tank = new THREE.Mesh(tankGeom, bodyMat);
      tank.rotation.x = Math.PI / 2;
      tank.position.set(0, 0.9, 0.15);
      tank.castShadow = true;
      bodyGroup.add(tank);

      // Seat
      const seatGeom = new THREE.BoxGeometry(0.35, 0.15, 0.7);
      const seat = new THREE.Mesh(seatGeom, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
      seat.position.set(0, 0.85, -0.4);
      seat.castShadow = true;
      bodyGroup.add(seat);

      // Handlebars
      const barGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6);
      const bar = new THREE.Mesh(barGeom, chromeMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, 1.15, 0.6);
      bar.castShadow = true;
      bodyGroup.add(bar);

      // Headlight
      const headlightGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8);
      const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0b3, emissiveIntensity: 2.0 });
      const headlight = new THREE.Mesh(headlightGeom, headlightMat);
      headlight.rotation.x = Math.PI / 2;
      headlight.position.set(0, 1.1, 0.7);
      bodyGroup.add(headlight);

      // Active Brake Light
      const brakeLightMat = new THREE.MeshStandardMaterial({ color: 0x880000, emissive: 0xcc0000, emissiveIntensity: 0.15, roughness: 0.2 });
      const brakeLightLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), brakeLightMat);
      brakeLightLeft.name = "brake_light_left";
      brakeLightLeft.position.set(0, 0.82, -0.8);
      bodyGroup.add(brakeLightLeft);

      const brakeLightRight = brakeLightLeft.clone();
      brakeLightRight.name = "brake_light_right";
      brakeLightRight.position.x = 0.01; // nearly identical
      bodyGroup.add(brakeLightRight);

      // Wheels
      const wheelGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16);
      const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.2, 12);

      const wheelsInfo = [
        { id: 'fl', z: 0.8 },
        { id: 'fr', z: 0.8 }, // Duplicate front so name bindings FL/FR exist
        { id: 'rl', z: -0.8 },
        { id: 'rr', z: -0.8 } // Duplicate rear
      ];

      wheelsInfo.forEach(info => {
        const wGroup = new THREE.Group();
        wGroup.name = `wheel_${info.id}`;
        
        const tire = new THREE.Mesh(wheelGeom, rubberMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wGroup.add(tire);

        const rim = new THREE.Mesh(rimGeom, chromeMat);
        rim.rotation.z = Math.PI / 2;
        wGroup.add(rim);

        wGroup.position.set(0, 0.42, info.z);
        car.add(wGroup);
      });

      // Dynamic asset replacement if high-quality 3D asset exists
      AssetLoader.replaceWithExternalModel(bodyGroup, '/assets/models/vehicles/motorcycle.glb', {
        targetHeight: 1.1,
        centerPivot: true
      });

      return car;
    }

    if (model === 'aircraft') {
      // --- TRADITIONAL SADA-STYLE UTILITY HELICOPTER / AIRCRAFT (الطائرة المروحية) ---
      // Fuselage
      const fuseGeom = new THREE.CylinderGeometry(0.6, 0.8, 3.8, 8);
      const fuselage = new THREE.Mesh(fuseGeom, bodyMat);
      fuselage.rotation.x = Math.PI / 2;
      fuselage.position.set(0, 1.2, 0);
      fuselage.castShadow = true;
      bodyGroup.add(fuselage);

      // Cockpit Windshield
      const glassGeom = new THREE.SphereGeometry(0.7, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const cockpit = new THREE.Mesh(glassGeom, glassMat);
      cockpit.rotation.x = -Math.PI / 3;
      cockpit.position.set(0, 1.4, 1.4);
      bodyGroup.add(cockpit);

      // Tail Boom
      const boomGeom = new THREE.CylinderGeometry(0.15, 0.3, 2.5, 6);
      const boom = new THREE.Mesh(boomGeom, darkMetalMat);
      boom.rotation.x = Math.PI / 2;
      boom.position.set(0, 1.3, -2.6);
      boom.castShadow = true;
      bodyGroup.add(boom);

      // Main Rotor Blades (spinning visual - binded to wheel_fl rotation!)
      const rotorGroup = new THREE.Group();
      rotorGroup.name = "wheel_fl"; // We trick engine to spin this group like front wheels!
      rotorGroup.position.set(0, 2.1, 0);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), chromeMat);
      shaft.position.y = -0.2;
      rotorGroup.add(shaft);

      const bladeGeom = new THREE.BoxGeometry(3.6, 0.02, 0.16);
      const blades = new THREE.Mesh(bladeGeom, darkMetalMat);
      blades.castShadow = true;
      rotorGroup.add(blades);

      const blades2 = blades.clone();
      blades2.rotation.y = Math.PI / 2;
      rotorGroup.add(blades2);
      
      car.add(rotorGroup);

      // Stabilizing Landing Skids
      const skidLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.2), chromeMat);
      skidLeft.position.set(-0.7, 0.2, 0);
      skidLeft.castShadow = true;
      bodyGroup.add(skidLeft);

      const skidRight = skidLeft.clone();
      skidRight.position.x = 0.7;
      bodyGroup.add(skidRight);

      const strutL1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), chromeMat);
      strutL1.position.set(-0.5, 0.5, 0.8);
      strutL1.rotation.z = -0.3;
      bodyGroup.add(strutL1);

      const strutR1 = strutL1.clone();
      strutR1.position.x = 0.5;
      strutR1.rotation.z = 0.3;
      bodyGroup.add(strutR1);

      // Active Tail Lights
      const tailLightMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0xee0000, emissiveIntensity: 0.2, roughness: 0.1 });
      const tailLightL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), tailLightMat);
      tailLightL.name = "brake_light_left";
      tailLightL.position.set(-0.3, 1.4, -3.75);
      bodyGroup.add(tailLightL);

      const tailLightR = tailLightL.clone();
      tailLightR.name = "brake_light_right";
      tailLightR.position.x = 0.3;
      bodyGroup.add(tailLightR);

      // Dynamic asset replacement if high-quality 3D asset exists
      AssetLoader.replaceWithExternalModel(bodyGroup, '/assets/models/vehicles/aircraft.glb', {
        targetHeight: 2.1,
        centerPivot: true
      });

      return car;
    }

    // 1. Chassis Frame (الشاصي)
    const length = model === 'hiace' ? 4.8 : (model === 'hilux' ? 4.6 : 4.2);
    const chassisGeom = new THREE.BoxGeometry(2.0, 0.3, length);
    const chassis = new THREE.Mesh(chassisGeom, darkMetalMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    // 2. Main Cabin & Body Materials
    const bodyMatModel = model === 'hiace' ? 0xfbfbf9 : options.color; // HiAce is traditionally white plaster/cream
    bodyMat.color.setHex(bodyMatModel);

    if (model === 'hiace') {
      // --- TOYOTA HIACE MICROBUS ("الدباب اليمني الأيقوني") ---
      // Main Boxy Cabin Body
      const vanGeom = new THREE.BoxGeometry(1.9, 1.6, 4.4);
      const vanBody = new THREE.Mesh(vanGeom, bodyMat);
      vanBody.position.set(0, 1.4, 0);
      vanBody.castShadow = true;
      bodyGroup.add(vanBody);

      // Slanted Front Window Glass
      const windshieldGeom = new THREE.BoxGeometry(1.8, 0.75, 0.05);
      const windshield = new THREE.Mesh(windshieldGeom, glassMat);
      windshield.position.set(0, 1.75, 1.95);
      windshield.rotation.x = 0.45;
      bodyGroup.add(windshield);

      // Large Side Passenger Windows
      const sideGlassLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.65, 2.4), glassMat);
      sideGlassLeft.position.set(-0.96, 1.5, -0.4);
      bodyGroup.add(sideGlassLeft);

      const sideGlassRight = sideGlassLeft.clone();
      sideGlassRight.position.x = 0.96;
      bodyGroup.add(sideGlassRight);

      // Traditional side paint decoration stripe (خطوط الدباب الملونة)
      const stripeGreenMat = new THREE.MeshStandardMaterial({ color: 0x00a859, roughness: 0.5 });
      const stripeYellowMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 });

      const stripeGLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 4.38), stripeGreenMat);
      stripeGLeft.position.set(-0.96, 1.0, 0);
      bodyGroup.add(stripeGLeft);

      const stripeYLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 4.38), stripeYellowMat);
      stripeYLeft.position.set(-0.96, 0.9, 0);
      bodyGroup.add(stripeYLeft);

      const stripeGRight = stripeGLeft.clone();
      stripeGRight.position.x = 0.96;
      bodyGroup.add(stripeGRight);

      const stripeYRight = stripeYLeft.clone();
      stripeYRight.position.x = 0.96;
      bodyGroup.add(stripeYRight);

      // Rooftop Luggage Rack (شبكة العفش التقليدية)
      const rackMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.2 });
      const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 2.4), rackMat);
      rackBase.position.set(0, 2.25, -0.4);
      bodyGroup.add(rackBase);

      const luggageBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.0), new THREE.MeshStandardMaterial({ color: 0x3366cc }));
      luggageBox.position.set(0, 2.4, -0.2);
      bodyGroup.add(luggageBox);

    } else if (model === 'hilux') {
      // --- TOYOTA HILUX DOUBLE-CABIN PICKUP ---
      // Front Hood
      const hoodGeom = new THREE.BoxGeometry(1.82, 0.65, 1.35);
      const hood = new THREE.Mesh(hoodGeom, bodyMat);
      hood.position.set(0, 0.95, 1.5);
      hood.castShadow = true;
      bodyGroup.add(hood);

      // Double Cabin
      const cabGeom = new THREE.BoxGeometry(1.9, 1.45, 2.4);
      const cab = new THREE.Mesh(cabGeom, bodyMat);
      cab.position.set(0, 1.35, -0.2);
      cab.castShadow = true;
      bodyGroup.add(cab);

      // Glass Area
      const windshieldGeom = new THREE.BoxGeometry(1.65, 0.65, 0.05);
      const windshield = new THREE.Mesh(windshieldGeom, glassMat);
      windshield.position.set(0, 1.7, 0.85);
      windshield.rotation.x = 0.35;
      bodyGroup.add(windshield);

      const sideWinGeom = new THREE.BoxGeometry(0.05, 0.5, 1.8);
      const leftWindow = new THREE.Mesh(sideWinGeom, glassMat);
      leftWindow.position.set(-0.89, 1.6, -0.2);
      bodyGroup.add(leftWindow);

      const rightWindow = leftWindow.clone();
      rightWindow.position.x = 0.89;
      bodyGroup.add(rightWindow);

      // Cargo Bed (صندوق هايلكس مغطى بشعار تويوتا)
      const bedGeom = new THREE.BoxGeometry(1.9, 0.72, 1.5);
      const bed = new THREE.Mesh(bedGeom, bodyMat);
      bed.position.set(0, 1.0, -1.9);
      bed.castShadow = true;
      bodyGroup.add(bed);

      // Chrome rollbar
      const rollbarMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9 });
      const rbLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1), rollbarMat);
      rbLeft.position.set(-0.8, 1.5, -1.25);
      bodyGroup.add(rbLeft);

      const rbRight = rbLeft.clone();
      rbRight.position.x = 0.8;
      bodyGroup.add(rbRight);

    } else {
      // --- TOYOTA LAND CRISER SHAS ---
      // Lower Cabin Body
      const cabGeom = new THREE.BoxGeometry(1.9, 0.8, 1.8);
      const cab = new THREE.Mesh(cabGeom, bodyMat);
      cab.position.set(0, 1.05, -0.1);
      cab.castShadow = true;
      bodyGroup.add(cab);

      // Front Hood
      const hoodGeom = new THREE.BoxGeometry(1.82, 0.7, 1.4);
      const hood = new THREE.Mesh(hoodGeom, bodyMat);
      hood.position.set(0, 0.95, 1.45);
      hood.castShadow = true;
      bodyGroup.add(hood);

      // Upper Cabin Glass Area
      const upperCabGeom = new THREE.BoxGeometry(1.75, 0.75, 1.6);
      const upperCab = new THREE.Mesh(upperCabGeom, bodyMat);
      upperCab.position.set(0, 1.75, -0.1);
      upperCab.castShadow = true;
      bodyGroup.add(upperCab);

      // Windshield & Windows
      const windshieldGeom = new THREE.BoxGeometry(1.65, 0.65, 0.05);
      const windshield = new THREE.Mesh(windshieldGeom, glassMat);
      windshield.position.set(0, 1.75, 0.72);
      windshield.rotation.x = 0.35;
      bodyGroup.add(windshield);

      const sideWinGeom = new THREE.BoxGeometry(0.05, 0.5, 1.1);
      const leftWindow = new THREE.Mesh(sideWinGeom, glassMat);
      leftWindow.position.set(-0.89, 1.75, -0.1);
      bodyGroup.add(leftWindow);

      const rightWindow = leftWindow.clone();
      rightWindow.position.x = 0.89;
      bodyGroup.add(rightWindow);

      // Bed/Cargo Area (صندوق الشاص)
      const bedGeom = new THREE.BoxGeometry(1.9, 0.75, 1.95);
      const bed = new THREE.Mesh(bedGeom, bodyMat);
      bed.position.set(0, 1.025, -1.9);
      bed.castShadow = true;
      bodyGroup.add(bed);

      // Bed rollbar
      const rollbarMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9 });
      const rbLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2), rollbarMat);
      rbLeft.position.set(-0.8, 1.6, -1.0);
      rbLeft.rotation.z = 0.05;
      bodyGroup.add(rbLeft);

      const rbRight = rbLeft.clone();
      rbRight.position.x = 0.8;
      rbRight.rotation.z = -0.05;
      bodyGroup.add(rbRight);

      // Spare wheel
      const spareWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12), rubberMat);
      spareWheel.rotation.x = Math.PI / 2;
      spareWheel.position.set(0.4, 1.35, -2.9);
      spareWheel.castShadow = true;
      bodyGroup.add(spareWheel);
    }

    // --- SHARED PARTS ---
    // Front headlights
    const lightGeom = new THREE.SphereGeometry(0.18, 8, 8);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfff3d1,
      emissive: 0xfff9e6,
      emissiveIntensity: 1.0,
      roughness: 0.1
    });

    const frontZ = model === 'hiace' ? 2.18 : 2.14;
    const headLightLeft = new THREE.Mesh(lightGeom, lightMat);
    headLightLeft.position.set(-0.7, 0.95, frontZ);
    bodyGroup.add(headLightLeft);

    const headLightRight = headLightLeft.clone();
    headLightRight.position.x = 0.7;
    bodyGroup.add(headLightRight);

    // Radiator Grille
    const grilleGeom = new THREE.BoxGeometry(1.1, 0.4, 0.05);
    const grille = new THREE.Mesh(grilleGeom, chromeMat);
    grille.position.set(0, 0.95, frontZ);
    bodyGroup.add(grille);

    // Front Bumper
    const bumperGeom = new THREE.BoxGeometry(2.1, 0.2, 0.3);
    const bumper = new THREE.Mesh(bumperGeom, chromeMat);
    bumper.position.set(0, 0.45, frontZ + 0.1);
    bumper.castShadow = true;
    bodyGroup.add(bumper);

    // Brake / Tail lights (المصابيح الخلفية النشطة)
    const brakeLightMat = new THREE.MeshStandardMaterial({
      color: 0x880000,
      emissive: 0xcc0000,
      emissiveIntensity: 0.1, // starts dim, lights up bright red on braking
      roughness: 0.2
    });
    const brakeLightGeom = new THREE.BoxGeometry(0.16, 0.24, 0.05);
    
    const backZ = model === 'hiace' ? -2.21 : (model === 'hilux' ? -2.66 : -2.88);
    const brakeLightLeft = new THREE.Mesh(brakeLightGeom, brakeLightMat);
    brakeLightLeft.name = "brake_light_left";
    brakeLightLeft.position.set(-0.75, 0.9, backZ);
    bodyGroup.add(brakeLightLeft);

    const brakeLightRight = brakeLightLeft.clone();
    brakeLightRight.name = "brake_light_right";
    brakeLightRight.position.x = 0.75;
    bodyGroup.add(brakeLightRight);

    // 4. Wheels with proper steering capability
    const wheelGeom = new THREE.CylinderGeometry(0.46, 0.46, 0.35, 16);
    const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.37, 12);

    const wheelZFront = model === 'hiace' ? 1.5 : 1.3;
    const wheelZRear = model === 'hiace' ? -1.5 : -1.4;
    
    const wheelOffsets = [
      { x: -0.92, y: 0.46, z: wheelZFront, id: 'fl' },
      { x: 0.92, y: 0.46, z: wheelZFront, id: 'fr' },
      { x: -0.92, y: 0.46, z: wheelZRear, id: 'rl' },
      { x: 0.92, y: 0.46, z: wheelZRear, id: 'rr' }
    ];

    wheelOffsets.forEach(offset => {
      const wheelGroup = new THREE.Group();
      wheelGroup.name = `wheel_${offset.id}`;

      // Outer tire rubber
      const tire = new THREE.Mesh(wheelGeom, rubberMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Steel Rim
      const rim = new THREE.Mesh(rimGeom, chromeMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      wheelGroup.position.set(offset.x, offset.y, offset.z);
      car.add(wheelGroup);
    });

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(bodyGroup, `/assets/models/vehicles/${model}.glb`, {
      targetHeight: model === 'hiace' ? 1.6 : 1.45,
      centerPivot: true
    });

    return car;
  }

  /**
   * Generates a realistic Prop Tree (شجرة سدر / شجرة برية يمنية)
   */
  public static createYemeniTree(): THREE.Group {
    const tree = new THREE.Group();

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.18, 0.32, 2.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Lush organic leaves canopy
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.9 });
    const sphereGeom = new THREE.SphereGeometry(1.2, 12, 12);

    const leaves1 = new THREE.Mesh(sphereGeom, leavesMat);
    leaves1.position.set(0, 2.8, 0);
    leaves1.castShadow = true;
    tree.add(leaves1);

    const leaves2 = new THREE.Mesh(sphereGeom, leavesMat);
    leaves2.position.set(0.6, 3.2, 0.4);
    leaves2.scale.set(0.8, 0.8, 0.8);
    leaves2.castShadow = true;
    tree.add(leaves2);

    const leaves3 = new THREE.Mesh(sphereGeom, leavesMat);
    leaves3.position.set(-0.6, 3.1, -0.4);
    leaves3.scale.set(0.85, 0.85, 0.85);
    leaves3.castShadow = true;
    tree.add(leaves3);

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(tree, '/assets/models/vegetation/tree.glb', {
      targetHeight: 3.5,
      centerPivot: true
    });

    return tree;
  }

  /**
   * Generates a modern Street Light (عمود إنارة) with real glowing fixture
   */
  public static createStreetLight(): THREE.Group {
    const lightGroup = new THREE.Group();

    // Metallic tall column
    const poleGeom = new THREE.CylinderGeometry(0.08, 0.14, 5.0, 8);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(poleGeom, metalMat);
    pole.position.y = 2.5;
    pole.castShadow = true;
    lightGroup.add(pole);

    // Overhanging bracket
    const bracketGeom = new THREE.BoxGeometry(0.12, 0.12, 1.2);
    const bracket = new THREE.Mesh(bracketGeom, metalMat);
    bracket.position.set(0, 5.0, 0.5);
    lightGroup.add(bracket);

    // Light Fixture hood
    const hoodGeom = new THREE.BoxGeometry(0.24, 0.12, 0.45);
    const hood = new THREE.Mesh(hoodGeom, metalMat);
    hood.position.set(0, 5.0, 1.1);
    hood.castShadow = true;
    lightGroup.add(hood);

    // Glowing bulb emitter
    const bulbGeom = new THREE.BoxGeometry(0.18, 0.04, 0.3);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfff0c4,
      emissive: 0xffe066,
      emissiveIntensity: 2.0,
      roughness: 0.1
    });
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.position.set(0, 4.93, 1.1);
    bulb.name = "bulb";
    lightGroup.add(bulb);

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(lightGroup, '/assets/models/props/street_light.glb', {
      targetHeight: 5.0,
      centerPivot: true,
      onSuccess: (loadedModel) => {
        // Re-add glowing bulb if model doesn't have it
        const originalBulb = lightGroup.getObjectByName("bulb");
        if (originalBulb) loadedModel.add(originalBulb);
      }
    });

    return lightGroup;
  }

  /**
   * Atmosphere: Rooftop Water Tank (خزان ماء) - Ubiquitous on Taiz rooftops
   */
  public static createWaterTank(): THREE.Group {
    const group = new THREE.Group();
    const isMetal = Math.random() > 0.5;
    const bodyGeom = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: isMetal ? 0x999999 : 0x004488, 
      roughness: 0.5,
      metalness: isMetal ? 0.7 : 0.1
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const topGeom = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const top = new THREE.Mesh(topGeom, bodyMat);
    top.position.y = 1.2;
    group.add(top);

    const standGeom = new THREE.BoxGeometry(1.1, 0.2, 1.1);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const stand = new THREE.Mesh(standGeom, standMat);
    stand.position.y = 0.1;
    group.add(stand);

    return group;
  }

  /**
   * Atmosphere: Satellite Dish (صحن دش)
   */
  public static createSatelliteDish(): THREE.Group {
    const group = new THREE.Group();
    const dishGeom = new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 4);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    dish.castShadow = true;
    group.add(dish);

    const armGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
    const arm = new THREE.Mesh(armGeom, dishMat);
    arm.position.z = 0.3;
    arm.rotation.x = -Math.PI / 4;
    group.add(arm);

    const baseGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5);
    const base = new THREE.Mesh(baseGeom, dishMat);
    base.position.y = -0.3;
    group.add(base);

    return group;
  }

  /**
   * Atmosphere: AC Unit (مكيف)
   */
  public static createACUnit(): THREE.Group {
    const group = new THREE.Group();
    const bodyGeom = new THREE.BoxGeometry(0.8, 0.5, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    group.add(body);

    const ventGeom = new THREE.PlaneGeometry(0.6, 0.3);
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const vent = new THREE.Mesh(ventGeom, ventMat);
    vent.position.z = 0.21;
    group.add(vent);

    return group;
  }

  /**
   * Atmosphere: Street Stall / Vendor (بسطة / كشك) - The soul of Taiz markets
   */
  public static createStreetStall(): THREE.Group {
    const group = new THREE.Group();
    const tableGeom = new THREE.BoxGeometry(2, 0.1, 1.2);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
    const table = new THREE.Mesh(tableGeom, woodMat);
    table.position.y = 0.8;
    table.castShadow = true;
    group.add(table);

    const legGeom = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    for(let i=0; i<4; i++) {
        const leg = new THREE.Mesh(legGeom, woodMat);
        leg.position.set( (i<2?1:-1)*0.9, 0.4, (i%2==0?1:-1)*0.5 );
        group.add(leg);
    }

    const colors = [0xff0000, 0x00ff00, 0xffff00, 0xffa500];
    for(let i=0; i<6; i++) {
        const boxGeom = new THREE.BoxGeometry(0.3, 0.2, 0.3);
        const boxMat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length] });
        const box = new THREE.Mesh(boxGeom, boxMat);
        box.position.set((i%3 - 1)*0.5, 0.95, (i<3?0.3:-0.3));
        group.add(box);
    }

    const poleGeom = new THREE.CylinderGeometry(0.04, 0.04, 2.5);
    const pole = new THREE.Mesh(poleGeom, woodMat);
    pole.position.y = 1.25;
    group.add(pole);

    const umbrellaGeom = new THREE.ConeGeometry(1.5, 0.8, 8);
    const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xdd3333, side: THREE.DoubleSide });
    const umbrella = new THREE.Mesh(umbrellaGeom, umbrellaMat);
    umbrella.position.y = 2.4;
    group.add(umbrella);

    return group;
  }

  /**
   * Atmosphere: Electric Pole with Wires (عمود كهرباء)
   */
  public static createElectricPole(): THREE.Group {
    const group = new THREE.Group();
    const poleGeom = new THREE.CylinderGeometry(0.1, 0.15, 8, 8);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.9 });
    const pole = new THREE.Mesh(poleGeom, woodMat);
    pole.position.y = 4;
    pole.castShadow = true;
    group.add(pole);

    const barGeom = new THREE.BoxGeometry(1.5, 0.1, 0.1);
    const bar = new THREE.Mesh(barGeom, woodMat);
    bar.position.y = 7.5;
    group.add(bar);

    const insGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.2);
    const insMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    for(let i=-1; i<=1; i++) {
        const ins = new THREE.Mesh(insGeom, insMat);
        ins.position.set(i*0.6, 7.6, 0);
        group.add(ins);
    }

    return group;
  }

  /**
   * Atmosphere: Arabic Signage (لوحة إعلانية)
   */
  public static createArabicSign(color: number = 0x3333aa): THREE.Group {
    const group = new THREE.Group();
    const frameGeom = new THREE.BoxGeometry(1.5, 0.8, 0.05);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    group.add(frame);

    const signGeom = new THREE.PlaneGeometry(1.4, 0.7);
    const signMat = new THREE.MeshStandardMaterial({ 
      color: color,
      emissive: color,
      emissiveIntensity: 0.2
    });
    const sign = new THREE.Mesh(signGeom, signMat);
    sign.position.z = 0.03;
    group.add(sign);

    return group;
  }

  /**
   * Atmosphere: Trash Bin (حاوية نفايات)
   */
  public static createTrashBin(): THREE.Group {
    const group = new THREE.Group();
    const binGeom = new THREE.BoxGeometry(1.2, 1.0, 0.8);
    const binMat = new THREE.MeshStandardMaterial({ color: 0x225522, roughness: 0.8 });
    const bin = new THREE.Mesh(binGeom, binMat);
    bin.position.y = 0.5;
    bin.castShadow = true;
    group.add(bin);

    const wheelGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.1);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for(let i=0; i<4; i++) {
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.z = Math.PI/2;
        wheel.position.set( (i<2?1:-1)*0.5, 0.1, (i%2==0?1:-1)*0.3 );
        group.add(wheel);
    }
    return group;
  }

  /**
   * Atmosphere: Palm Tree (نخلة) - More detailed than generic trees
   */
  public static createPalmTree(): THREE.Group {
    const group = new THREE.Group();
    const trunkGeom = new THREE.CylinderGeometry(0.2, 0.35, 6, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 3;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e5a27, side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) {
      const leafGroup = new THREE.Group();
      const leafGeom = new THREE.SphereGeometry(2, 8, 4, 0, Math.PI / 4);
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.scale.set(1, 0.1, 0.5);
      leaf.rotation.x = Math.PI / 2;
      leafGroup.add(leaf);
      leafGroup.position.y = 6;
      leafGroup.rotation.y = (i / 12) * Math.PI * 2;
      leafGroup.rotation.z = 0.4 + Math.random() * 0.4;
      group.add(leafGroup);
    }

    return group;
  }

  /**
   * Atmosphere: Clothes Line (حبل غسيل)
   */
  public static createClothesLine(width: number): THREE.Group {
    const group = new THREE.Group();
    const lineGeom = new THREE.CylinderGeometry(0.01, 0.01, width, 6);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const line = new THREE.Mesh(lineGeom, lineMat);
    line.rotation.z = Math.PI / 2;
    group.add(line);

    const shirtColors = [0xffffff, 0x3366ff, 0xff3333, 0xffff33, 0x33aa33];
    const steps = Math.floor(width / 0.6);
    for (let i = 0; i < steps; i++) {
      if (Math.random() > 0.3) {
        const clothGeom = new THREE.PlaneGeometry(0.4, 0.5);
        const clothMat = new THREE.MeshStandardMaterial({ 
          color: shirtColors[Math.floor(Math.random() * shirtColors.length)],
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        });
        const cloth = new THREE.Mesh(clothGeom, clothMat);
        cloth.position.set(-width / 2 + 0.3 + i * 0.6, -0.25, 0);
        cloth.rotation.x = Math.PI * 0.1 * (Math.random() - 0.5);
        group.add(cloth);
      }
    }
    return group;
  }

  /**
   * Atmosphere: Fruit Stand (بسطة خضار وفواكه)
   */
  public static createFruitStand(): THREE.Group {
    const group = new THREE.Group();
    
    // Wooden structure
    const baseGeom = new THREE.BoxGeometry(2, 0.8, 1);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeom, woodMat);
    base.position.y = 0.4;
    group.add(base);

    // Bins with fruits
    const binGeom = new THREE.BoxGeometry(0.6, 0.2, 0.4);
    const fruitColors = [0xff0000, 0x00ff00, 0xffaa00, 0xffff00]; // Apples, Grapes, Oranges, Bananas
    for (let i = 0; i < 6; i++) {
        const bin = new THREE.Mesh(binGeom, woodMat);
        bin.position.set((i % 3 - 1) * 0.65, 0.9, (i < 3 ? 0.25 : -0.25));
        group.add(bin);

        const fruitsGeom = new THREE.SphereGeometry(0.08, 6, 6);
        const fruitMat = new THREE.MeshStandardMaterial({ color: fruitColors[i % fruitColors.length] });
        for (let j = 0; j < 8; j++) {
            const fruit = new THREE.Mesh(fruitsGeom, fruitMat);
            fruit.position.set(
                bin.position.x + (Math.random() - 0.5) * 0.4,
                0.95 + Math.random() * 0.1,
                bin.position.z + (Math.random() - 0.5) * 0.2
            );
            group.add(fruit);
        }
    }

    return group;
  }

  /**
   * Atmosphere: Stray Cat (قطة) - A common sight in Taiz alleys
   */
  public static createCat(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xdd8844 : 0x333333 }); // Orange or Black
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.5), mat);
    body.position.y = 0.15;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat);
    head.position.set(0, 0.25, 0.3);
    group.add(head);

    const earGeom = new THREE.ConeGeometry(0.05, 0.1, 4);
    const earL = new THREE.Mesh(earGeom, mat);
    earL.position.set(-0.06, 0.35, 0.3);
    group.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.06;
    group.add(earR);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), mat);
    tail.position.set(0, 0.2, -0.4);
    tail.rotation.x = -Math.PI / 4;
    group.add(tail);

    return group;
  }

  /**
   * Infrastructure: Taiz Traffic Sign (لوحة مرورية)
   */
  public static createTrafficSign(type: 'stop' | 'danger' | 'info'): THREE.Group {
    const group = new THREE.Group();
    const poleGeom = new THREE.CylinderGeometry(0.05, 0.05, 3);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 1.5;
    group.add(pole);

    const signMat = new THREE.MeshStandardMaterial({ 
        color: type === 'stop' ? 0xcc0000 : (type === 'danger' ? 0xffff00 : 0x0000ff),
        side: THREE.DoubleSide
    });
    
    let signMesh: THREE.Mesh;
    if (type === 'stop') {
        signMesh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 8), signMat);
    } else if (type === 'danger') {
        signMesh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 3), signMat);
        signMesh.rotation.z = Math.PI;
    } else {
        signMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), signMat);
    }
    signMesh.position.y = 3;
    signMesh.position.z = 0.06;
    group.add(signMesh);

    return group;
  }

  /**
   * Generates a majestic, culturally accurate 3D model of Al-Qahira Castle (قلعة القاهرة الأثرية بتعز)
   * features dark stone fortress walls, crenellated towers, central white keep palace, arched gateway,
   * flags of Yemen, and ambient lanterns. Supports hot-swapping with professional GLB model.
   */
  public static createCairoCastle(): THREE.Group {
    const castle = new THREE.Group();
    castle.name = "cairo_castle";

    // PBR-like stone materials
    const darkStoneMat = new THREE.MeshStandardMaterial({
      color: 0x4a3b2c,
      roughness: 0.95,
      metalness: 0.1
    });
    const whitewashMat = new THREE.MeshStandardMaterial({
      color: 0xf3eee1,
      roughness: 0.85,
      metalness: 0.05
    });
    const mudBrickMat = new THREE.MeshStandardMaterial({
      color: 0x82664d,
      roughness: 0.9,
      metalness: 0.08
    });
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x3d2714,
      roughness: 0.8,
      metalness: 0.3
    });
    const goldDomeMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.85,
      roughness: 0.15
    });

    // 1. Foundation Base (Housings / Courtyard)
    const baseGeom = new THREE.BoxGeometry(22, 2, 22);
    const baseMesh = new THREE.Mesh(baseGeom, darkStoneMat);
    baseMesh.position.set(0, 1, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    castle.add(baseMesh);

    // 2. High Outer Defensive Walls
    const wallHeight = 4.5;
    const wallThickness = 1.2;
    
    // Front Wall with main entrance gap
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(8, wallHeight, wallThickness), darkStoneMat);
    frontWallLeft.position.set(-6, wallHeight / 2 + 1.5, 10.4);
    frontWallLeft.castShadow = true;
    frontWallLeft.receiveShadow = true;
    castle.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(8, wallHeight, wallThickness), darkStoneMat);
    frontWallRight.position.set(6, wallHeight / 2 + 1.5, 10.4);
    frontWallRight.castShadow = true;
    frontWallRight.receiveShadow = true;
    castle.add(frontWallRight);

    // Left, Right, Back Walls
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 22), darkStoneMat);
    leftWall.position.set(-10.4, wallHeight / 2 + 1.5, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    castle.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, 22), darkStoneMat);
    rightWall.position.set(10.4, wallHeight / 2 + 1.5, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    castle.add(rightWall);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, wallHeight, wallThickness), darkStoneMat);
    backWall.position.set(0, wallHeight / 2 + 1.5, -10.4);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    castle.add(backWall);

    // 3. Decorative Crenellations (Shurafaat - شرفات قلعة القاهرة)
    const createCrenellations = (parentWall: THREE.Mesh, count: number, size: number = 0.6) => {
      const parentSize = (parentWall.geometry as THREE.BoxGeometry).parameters;
      const step = parentSize.width / (count + 1);
      for (let i = 1; i <= count; i++) {
        const cren = new THREE.Mesh(new THREE.BoxGeometry(size, size, parentSize.depth + 0.1), darkStoneMat);
        cren.position.set(-parentSize.width / 2 + i * step, parentSize.height / 2 + size / 2, 0);
        cren.castShadow = true;
        parentWall.add(cren);
      }
    };
    createCrenellations(frontWallLeft, 4);
    createCrenellations(frontWallRight, 4);
    createCrenellations(backWall, 12);

    // 4. Four Circular Corner Watchtowers
    const towerRadius = 2.0;
    const towerHeight = 9.0;
    const towerGeom = new THREE.CylinderGeometry(towerRadius * 0.9, towerRadius, towerHeight, 8);
    
    const towerPositions = [
      { x: -10, z: -10 },
      { x: 10, z: -10 },
      { x: -10, z: 10 },
      { x: 10, z: 10 }
    ];

    towerPositions.forEach((pos, idx) => {
      const tower = new THREE.Mesh(towerGeom, darkStoneMat);
      tower.position.set(pos.x, towerHeight / 2 + 1, pos.z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      castle.add(tower);

      // Tower Crenellated Top Crown
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(towerRadius * 1.05, towerRadius * 0.95, 1.2, 8, 1, true), darkStoneMat);
      crown.position.set(pos.x, towerHeight + 1.1, pos.z);
      crown.castShadow = true;
      castle.add(crown);

      // Gold conical domes on back towers
      if (idx < 2) {
        const coneDome = new THREE.Mesh(new THREE.ConeGeometry(towerRadius * 1.05, 3.2, 8), goldDomeMat);
        coneDome.position.set(pos.x, towerHeight + 2.5, pos.z);
        coneDome.castShadow = true;
        castle.add(coneDome);

        // Crescent moon topper
        const crescent = this.createCrescentMesh();
        crescent.position.set(pos.x, towerHeight + 4.3, pos.z);
        crescent.scale.set(0.6, 0.6, 0.6);
        crescent.rotation.y = Math.PI / 4;
        castle.add(crescent);
      } else {
        // Front towers fly the traditional Yemeni Flag
        const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.0, 5), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
        flagpole.position.set(pos.x, towerHeight + 2.5, pos.z);
        flagpole.castShadow = true;
        castle.add(flagpole);

        // Yemeni Flag canvas (Red, White, Black stripes)
        const flagGroup = new THREE.Group();
        flagGroup.position.set(pos.x + 0.8, towerHeight + 3.5, pos.z);

        const stripeHeight = 0.35;
        const stripeWidth = 1.6;
        const colors = [0xff0000, 0xffffff, 0x000000]; // Yemen colors: Red, White, Black
        colors.forEach((col, i) => {
          const stripe = new THREE.Mesh(new THREE.BoxGeometry(stripeWidth, stripeHeight, 0.03), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
          stripe.position.set(0, -i * stripeHeight, 0);
          stripe.castShadow = true;
          flagGroup.add(stripe);
        });
        castle.add(flagGroup);
      }
    });

    // 5. Main Gatehouse Entrance (Bawabat Al-Qahira)
    const gateFrame = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 2.5), darkStoneMat);
    gateFrame.position.set(0, 3 + 1, 10.4);
    gateFrame.castShadow = true;
    gateFrame.receiveShadow = true;
    castle.add(gateFrame);

    // Arch gate cutout (procedural visual)
    const gateArch = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 8, 1, false, 0, Math.PI), doorMat);
    gateArch.rotation.z = Math.PI / 2;
    gateArch.rotation.y = Math.PI / 2;
    gateArch.position.set(0, 3 + 1, 10.4);
    castle.add(gateArch);

    const gateDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 1.4), doorMat);
    gateDoorL.position.set(-1.3, 1.6 + 1, 10.4);
    gateDoorL.castShadow = true;
    castle.add(gateDoorL);

    const gateDoorR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 1.4), doorMat);
    gateDoorR.position.set(1.3, 1.6 + 1, 10.4);
    gateDoorR.castShadow = true;
    castle.add(gateDoorR);

    // 6. Central Elevated Palace Keep (Dar Al-Sultan - دار السلطان)
    // Multistory white and mud-brick tower rising in the center
    const keepGroup = new THREE.Group();
    keepGroup.position.set(0, 2, 0);

    // Story 1: Mud brick
    const s1Height = 4.0;
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(10, s1Height, 10), mudBrickMat);
    s1.position.set(0, s1Height / 2, 0);
    s1.castShadow = true;
    s1.receiveShadow = true;
    keepGroup.add(s1);

    // Story 2: Traditional Whitewash
    const s2Height = 3.5;
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(9.2, s2Height, 9.2), whitewashMat);
    s2.position.set(0, s1Height + s2Height / 2, 0);
    s2.castShadow = true;
    s2.receiveShadow = true;
    keepGroup.add(s2);

    // Story 3: Elite Whitewash with brown highlights
    const s3Height = 3.2;
    const s3 = new THREE.Mesh(new THREE.BoxGeometry(8.4, s3Height, 8.4), whitewashMat);
    s3.position.set(0, s1Height + s2Height + s3Height / 2, 0);
    s3.castShadow = true;
    s3.receiveShadow = true;
    keepGroup.add(s3);

    // Decorative brown borders on stories
    const borderGeom = new THREE.BoxGeometry(9.4, 0.25, 9.4);
    const border = new THREE.Mesh(borderGeom, mudBrickMat);
    border.position.set(0, s1Height + 0.125, 0);
    keepGroup.add(border);

    const borderGeom2 = new THREE.BoxGeometry(8.6, 0.25, 8.6);
    const border2 = new THREE.Mesh(borderGeom2, mudBrickMat);
    border2.position.set(0, s1Height + s2Height + 0.125, 0);
    keepGroup.add(border2);

    // Qamariyah Window Geometry
    const qamariyahGeom = this.createQamariyahGeometry();
    const qamariyahFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const glassColors = [0xdd3333, 0x33aa33, 0x3333dd, 0xddaa33];

    // Place windows across the keep faces
    for (let face = 0; face < 4; face++) {
      const angle = (face * Math.PI) / 2;
      
      // Story 1 arched windows
      for (let w = -1; w <= 1; w += 2) {
        const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.15), doorMat);
        windowFrame.position.set(w * 2.5, 2.0, 5.05);
        windowFrame.rotation.y = angle;
        // Apply polar rotation to face outward correctly
        windowFrame.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        keepGroup.add(windowFrame);
      }

      // Story 2 Qamariyahs (whitewashed colored arches)
      for (let w = -1; w <= 1; w += 1) {
        const wX = w * 2.2;
        const wY = s1Height + 1.8;
        const qWindow = new THREE.Mesh(qamariyahGeom, qamariyahFrameMat);
        qWindow.position.set(wX, wY, 4.63);
        qWindow.rotation.y = angle;
        qWindow.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        keepGroup.add(qWindow);

        // Colored glass backing
        const glassMat = new THREE.MeshStandardMaterial({
          color: glassColors[Math.abs(w + face) % glassColors.length],
          emissive: glassColors[Math.abs(w + face) % glassColors.length],
          emissiveIntensity: 0.6,
          roughness: 0.1,
          transparent: true,
          opacity: 0.8
        });
        const glass = new THREE.Mesh(qamariyahGeom, glassMat);
        glass.scale.set(0.9, 0.9, 0.9);
        glass.position.set(wX, wY, 4.62);
        glass.rotation.y = angle;
        glass.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        keepGroup.add(glass);
      }
    }

    castle.add(keepGroup);

    // 7. Ambient Lanterns flanking the Gatehouse (Lantern of Taiz)
    const lanternGeom = new THREE.BoxGeometry(0.3, 0.5, 0.3);
    const lanternGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 3.0,
      roughness: 0.1
    });

    const l1 = new THREE.Mesh(lanternGeom, lanternGlowMat);
    l1.position.set(-3.2, 3.8, 11.5);
    castle.add(l1);

    const l2 = new THREE.Mesh(lanternGeom, lanternGlowMat);
    l2.position.set(3.2, 3.8, 11.5);
    castle.add(l2);

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(castle, '/assets/models/buildings/cairo_castle.glb', {
      targetHeight: 18.0,
      centerPivot: true,
      onSuccess: (loadedModel) => {
        // Smoothly scale the loaded Cairo Castle
        console.log("Al-Qahira Castle loaded successfully from GLB. Enjoy the historical landmark of Taiz!");
      }
    });

    return castle;
  }
}

