import * as THREE from 'three';
import { AssetLoader } from '../game/AssetLoader';

/**
 * Yemeni Procedural Architecture Generator for Lumen AI Cinematic Engine
 * Designed for rendering authentic Taiz-inspired traditional stone houses,
 * Al-Ashrafiya inspired minarets, Qamariyah stained-glass, and intricate geometric stone carvings.
 */

export interface HouseGenerationOptions {
  width: number;
  depth: number;
  height: number;
  stories: number;
  stoneColor: number;
  hasShutter?: boolean;
  whitewashTop?: boolean;
  simplified?: boolean;
}

export interface MinaretGenerationOptions {
  height: number;
  baseRadius: number;
  sectionsCount: number;
  hasBalcony?: boolean;
  domeColor?: number;
  metalness?: number;
}

export class YemeniArchitectureGenerator {
  
  /**
   * Generates a decorative Qamariyah (قمرية) stained glass arch window.
   * Qamariyahs are traditional semicircular plaster arch windows filled with colorful glass.
   */
  public static createQamariyah(width: number = 0.6, height: number = 0.8, glassColor?: number): THREE.Group {
    const qamariyah = new THREE.Group();

    // 1. White plaster frame
    const frameShape = new THREE.Shape();
    const halfW = width / 2;
    const archH = height - halfW;

    frameShape.moveTo(-halfW, -archH);
    frameShape.lineTo(-halfW, 0);
    // Draw semi-circle arch
    frameShape.absarc(0, 0, halfW, Math.PI, 0, true);
    frameShape.lineTo(halfW, -archH);
    frameShape.closePath();

    const extrudeSettings = {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015
    };

    const frameGeom = new THREE.ExtrudeGeometry(frameShape, extrudeSettings);
    const plasterMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.9,
      metalness: 0.05
    });
    const frameMesh = new THREE.Mesh(frameGeom, plasterMat);
    frameMesh.castShadow = true;
    qamariyah.add(frameMesh);

    // 2. Colored stained-glass backing
    // Traditional Taiz colors: bright orange, electric blue, green, and gold yellow
    const glassColors = [0xff3300, 0x0066ff, 0x00cc44, 0xffcc00, 0xcc0099];
    const finalGlassColor = glassColor !== undefined ? glassColor : glassColors[Math.floor(Math.random() * glassColors.length)];

    const glassGeom = new THREE.ShapeGeometry(frameShape);
    const glassMat = new THREE.MeshStandardMaterial({
      color: finalGlassColor,
      roughness: 0.1,
      metalness: 0.9,
      emissive: finalGlassColor,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.9
    });
    const glassMesh = new THREE.Mesh(glassGeom, glassMat);
    glassMesh.position.z = 0.03;
    qamariyah.add(glassMesh);

    // 3. Wooden shutters on the lower rectangular section (Shatilah - شتيلة)
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x422613, // Dark teak/walnut wood
      roughness: 0.85,
      metalness: 0.1
    });
    const shutterGeom = new THREE.BoxGeometry(width - 0.08, archH - 0.08, 0.04);
    const shutterMesh = new THREE.Mesh(shutterGeom, woodMat);
    shutterMesh.position.set(0, -archH / 2, 0.04);
    shutterMesh.castShadow = true;
    qamariyah.add(shutterMesh);

    // Add wooden cross lattice detail on the shutter
    const horizontalSlatGeom = new THREE.BoxGeometry(width - 0.04, 0.03, 0.06);
    const slat = new THREE.Mesh(horizontalSlatGeom, woodMat);
    slat.position.set(0, -archH / 2, 0.045);
    qamariyah.add(slat);

    return qamariyah;
  }

  /**
   * Generates a traditional heavy wooden door with custom geometric carvings and copper studs.
   */
  public static createCarvedDoor(width: number = 1.4, height: number = 2.4): THREE.Group {
    const doorGroup = new THREE.Group();

    // Outer thick wooden architrave/frame (إطار الباب)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2e180b, roughness: 0.9 });
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.15, 0.2), frameMat);
    frameTop.position.y = height;
    frameTop.castShadow = true;
    doorGroup.add(frameTop);

    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, 0.15), frameMat);
    frameLeft.position.set(-width / 2 - 0.04, height / 2, 0);
    frameLeft.castShadow = true;
    doorGroup.add(frameLeft);

    const frameRight = frameLeft.clone();
    frameRight.position.x = width / 2 + 0.04;
    doorGroup.add(frameRight);

    // Main Door Panels (الضلع والخرزة)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3d210f, roughness: 0.85 });
    const leftPanelGeom = new THREE.BoxGeometry(width / 2, height - 0.06, 0.08);
    const leftPanel = new THREE.Mesh(leftPanelGeom, doorMat);
    leftPanel.position.set(-width / 4, height / 2, -0.01);
    leftPanel.castShadow = true;
    doorGroup.add(leftPanel);

    const rightPanel = leftPanel.clone();
    rightPanel.position.x = width / 4;
    doorGroup.add(rightPanel);

    // Add traditional copper door knockers (حلقة الباب)
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xb87333,
      metalness: 0.9,
      roughness: 0.2
    });
    const knockerGeom = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
    const knockerLeft = new THREE.Mesh(knockerGeom, copperMat);
    knockerLeft.position.set(-0.15, height / 2 + 0.1, 0.06);
    doorGroup.add(knockerLeft);

    const knockerRight = knockerLeft.clone();
    knockerRight.position.x = 0.15;
    doorGroup.add(knockerRight);

    return doorGroup;
  }

  /**
   * Generates a multi-layered Yemeni Tower House with procedural details.
   * Taiz houses are highly iconic for their beautiful brown stone courses,
   * horizontal plaster lines, and geometric top roof horns (Tafreej).
   */
  public static createStoneHouse(options: HouseGenerationOptions): THREE.Group {
    const house = new THREE.Group();
    const { width, depth, height, stories, stoneColor, whitewashTop = true } = options;
    const storyHeight = height / stories;

    // Create main stone body layer by layer
    for (let s = 0; s < stories; s++) {
      const isTopStory = s === stories - 1;
      
      // Compute dimensions with slight taper at upper floors (typical of Yemeni skyscrapers)
      const storyWidth = width - 0.04 * s;
      const storyDepth = depth - 0.04 * s;

      // Base stone material
      const storyMat = new THREE.MeshStandardMaterial({
        color: (isTopStory && whitewashTop) ? 0xf0ede6 : stoneColor, // Top floor whitewashed in white plaster
        roughness: 0.9,
        metalness: 0.05
      });

      const storyGeom = new THREE.BoxGeometry(storyWidth, storyHeight, storyDepth);
      const storyMesh = new THREE.Mesh(storyGeom, storyMat);
      storyMesh.position.y = s * storyHeight + storyHeight / 2;
      storyMesh.castShadow = true;
      storyMesh.receiveShadow = true;
      house.add(storyMesh);

      // Horizontal whitewashed dividing bands (Hizam - حزام الزينة)
      const bandHeight = 0.16;
      const bandWidth = storyWidth + 0.06;
      const bandDepth = storyDepth + 0.06;
      const bandGeom = new THREE.BoxGeometry(bandWidth, bandHeight, bandDepth);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0xf5f2eb,
        roughness: 0.8
      });
      const bandMesh = new THREE.Mesh(bandGeom, bandMat);
      bandMesh.position.y = s * storyHeight + storyHeight;
      bandMesh.castShadow = true;
      house.add(bandMesh);

      // Procedural Arched Windows for this story
      const windowsPerFront = Math.max(1, Math.floor(width / 1.3));
      const windowsPerSide = Math.max(1, Math.floor(depth / 1.3));

      // Front & Back Windows
      for (let w = 0; w < windowsPerFront; w++) {
        const xOffset = (w - (windowsPerFront - 1) / 2) * 1.15;
        
        if (options.simplified) {
          // Fast rendering alternative
          const sWinGeom = new THREE.BoxGeometry(0.5, 0.6, 0.05);
          const sWinMat = new THREE.MeshBasicMaterial({ color: 0x1a2530 });
          
          const wf = new THREE.Mesh(sWinGeom, sWinMat);
          wf.position.set(xOffset, s * storyHeight + storyHeight / 2 + 0.1, storyDepth / 2 + 0.01);
          house.add(wf);

          const wb = wf.clone();
          wb.position.z = -storyDepth / 2 - 0.01;
          house.add(wb);
        } else {
          // Front Windows
          const qamariyahFront = this.createQamariyah(0.55, 0.75);
          qamariyahFront.position.set(xOffset, s * storyHeight + storyHeight / 2 + 0.1, storyDepth / 2 + 0.01);
          house.add(qamariyahFront);

          // Back Windows
          const qamariyahBack = this.createQamariyah(0.55, 0.75);
          qamariyahBack.rotation.y = Math.PI;
          qamariyahBack.position.set(xOffset, s * storyHeight + storyHeight / 2 + 0.1, -storyDepth / 2 - 0.01);
          house.add(qamariyahBack);
        }
      }

      // Left & Right Windows
      for (let w = 0; w < windowsPerSide; w++) {
        const zOffset = (w - (windowsPerSide - 1) / 2) * 1.15;

        if (options.simplified) {
          const sWinGeom = new THREE.BoxGeometry(0.05, 0.6, 0.5);
          const sWinMat = new THREE.MeshBasicMaterial({ color: 0x1a2530 });

          const wl = new THREE.Mesh(sWinGeom, sWinMat);
          wl.position.set(-storyWidth / 2 - 0.01, s * storyHeight + storyHeight / 2 + 0.1, zOffset);
          house.add(wl);

          const wr = wl.clone();
          wr.position.x = storyWidth / 2 + 0.01;
          house.add(wr);
        } else {
          // Left Windows
          const qamariyahLeft = this.createQamariyah(0.55, 0.75);
          qamariyahLeft.rotation.y = -Math.PI / 2;
          qamariyahLeft.position.set(-storyWidth / 2 - 0.01, s * storyHeight + storyHeight / 2 + 0.1, zOffset);
          house.add(qamariyahLeft);

          // Right Windows
          const qamariyahRight = this.createQamariyah(0.55, 0.75);
          qamariyahRight.rotation.y = Math.PI / 2;
          qamariyahRight.position.set(storyWidth / 2 + 0.01, s * storyHeight + storyHeight / 2 + 0.1, zOffset);
          house.add(qamariyahRight);
        }
      }
    }

    // Traditional Crown / Parapet points (العريش والقرون الجبسية) on the roof
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const parapetHeight = 0.7;

    const roofPoints = [
      { x: -width / 2, z: -depth / 2 },
      { x: width / 2, z: -depth / 2 },
      { x: -width / 2, z: depth / 2 },
      { x: width / 2, z: depth / 2 },
      { x: 0, z: depth / 2 },
      { x: 0, z: -depth / 2 }
    ];

    roofPoints.forEach(pt => {
      // Intricate pinnacles/horns (القرون التهامية والتعزية)
      const pinnacleGeom = new THREE.ConeGeometry(0.18, parapetHeight, 4);
      const pinnacle = new THREE.Mesh(pinnacleGeom, crownMat);
      pinnacle.position.set(pt.x, height + parapetHeight / 2, pt.z);
      pinnacle.castShadow = true;
      house.add(pinnacle);
    });

    // Solid parapet border walls between the horns
    const paraXGeom = new THREE.BoxGeometry(width + 0.02, 0.45, 0.1);
    const paraZGeom = new THREE.BoxGeometry(0.1, 0.45, depth + 0.02);

    const pFront = new THREE.Mesh(paraXGeom, crownMat);
    pFront.position.set(0, height + 0.225, depth / 2);
    house.add(pFront);

    const pBack = new THREE.Mesh(paraXGeom, crownMat);
    pBack.position.set(0, height + 0.225, -depth / 2);
    house.add(pBack);

    const pLeft = new THREE.Mesh(paraZGeom, crownMat);
    pLeft.position.set(-width / 2, height + 0.225, 0);
    house.add(pLeft);

    const pRight = new THREE.Mesh(paraZGeom, crownMat);
    pRight.position.set(width / 2, height + 0.225, 0);
    house.add(pRight);

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(house, '/assets/models/buildings/house.glb', {
      targetHeight: height,
      centerPivot: true
    });

    return house;
  }

  /**
   * Generates a highly detailed, historically accurate Al-Ashrafiya inspired Minaret (مئذنة تعزية).
   * Features octagonal base courses, transition balconies, white plaster details, and golden crescent spire.
   */
  public static createTaizMinaret(options: MinaretGenerationOptions): THREE.Group {
    const minaret = new THREE.Group();
    const { height, baseRadius, domeColor = 0xd4af37, metalness = 0.9 } = options;

    // Strict Asset Replacement: prioritize external minaret model if available
    const modelPath = '/assets/models/buildings/minaret.glb';
    AssetLoader.getInstance().checkAssetExists(modelPath).then(exists => {
      if (exists) {
        AssetLoader.replaceWithExternalModel(minaret, modelPath, {
          targetHeight: height,
          centerPivot: true
        });
      }
    });

    const plasterMat = new THREE.MeshStandardMaterial({
      color: 0xfbfbf9,
      roughness: 0.85,
      metalness: 0.05
    });

    const brickMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b, // Clay/stone base
      roughness: 0.9
    });

    // 1. Octagonal Base Section (قاعدة المئذنة)
    const baseHeight = height * 0.25;
    const baseGeom = new THREE.CylinderGeometry(baseRadius, baseRadius * 1.1, baseHeight, 8);
    const baseMesh = new THREE.Mesh(baseGeom, brickMat);
    baseMesh.position.y = baseHeight / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    minaret.add(baseMesh);

    // Octagonal white plaster bands
    const baseBandGeom = new THREE.CylinderGeometry(baseRadius * 1.02, baseRadius * 1.02, 0.25, 8);
    const baseBand = new THREE.Mesh(baseBandGeom, plasterMat);
    baseBand.position.y = baseHeight - 0.125;
    baseBand.castShadow = true;
    minaret.add(baseBand);

    // 2. Middle Slender Shaft (بدن المئذنة الأسطواني)
    const shaftHeight = height * 0.5;
    const shaftRadius = baseRadius * 0.75;
    const shaftGeom = new THREE.CylinderGeometry(shaftRadius * 0.9, shaftRadius, shaftHeight, 12);
    const shaftMesh = new THREE.Mesh(shaftGeom, plasterMat);
    shaftMesh.position.y = baseHeight + shaftHeight / 2;
    shaftMesh.castShadow = true;
    shaftMesh.receiveShadow = true;
    minaret.add(shaftMesh);

    // Decorative geometric brick designs on the white cylinder
    const bandCount = 4;
    for (let b = 0; b < bandCount; b++) {
      const ringY = baseHeight + (shaftHeight / (bandCount + 1)) * (b + 1);
      const ringGeom = new THREE.CylinderGeometry(shaftRadius * 1.04, shaftRadius * 1.04, 0.15, 12);
      const ringMesh = new THREE.Mesh(ringGeom, brickMat);
      ringMesh.position.y = ringY;
      ringMesh.castShadow = true;
      minaret.add(ringMesh);
    }

    // 3. Muazzin Balcony (شرفة المؤذن الدائرية)
    const balconyY = baseHeight + shaftHeight;
    const balconyRadius = shaftRadius * 1.4;
    const balconyHeight = 0.6;
    
    const balconyBaseGeom = new THREE.CylinderGeometry(balconyRadius, shaftRadius, balconyHeight, 12);
    const balconyBase = new THREE.Mesh(balconyBaseGeom, plasterMat);
    balconyBase.position.y = balconyY + balconyHeight / 2;
    balconyBase.castShadow = true;
    minaret.add(balconyBase);

    // Balcony handrail columns (أعمدة درابزين الشرفة)
    const railHeight = 0.55;
    const columnsCount = 8;
    for (let c = 0; c < columnsCount; c++) {
      const angle = (c / columnsCount) * Math.PI * 2;
      const colGeom = new THREE.CylinderGeometry(0.04, 0.04, railHeight, 4);
      const col = new THREE.Mesh(colGeom, brickMat);
      col.position.set(
        Math.cos(angle) * (balconyRadius - 0.08),
        balconyY + balconyHeight + railHeight / 2,
        Math.sin(angle) * (balconyRadius - 0.08)
      );
      col.castShadow = true;
      minaret.add(col);
    }

    // Top rail ring
    const railRingGeom = new THREE.CylinderGeometry(balconyRadius, balconyRadius, 0.06, 12);
    const railRing = new THREE.Mesh(railRingGeom, plasterMat);
    railRing.position.y = balconyY + balconyHeight + railHeight;
    minaret.add(railRing);

    // 4. Upper Octagonal Slender Pavilion (الجوسق العلوي)
    const upperY = balconyY + balconyHeight + railHeight;
    const upperHeight = height * 0.18;
    const upperRadius = shaftRadius * 0.65;
    const upperGeom = new THREE.CylinderGeometry(upperRadius * 0.9, upperRadius, upperHeight, 8);
    const upperMesh = new THREE.Mesh(upperGeom, plasterMat);
    upperMesh.position.y = upperY + upperHeight / 2;
    upperMesh.castShadow = true;
    minaret.add(upperMesh);

    // Arched windows in the upper pavilion
    for (let w = 0; w < 4; w++) {
      const angle = (w / 4) * Math.PI * 2;
      const arcGeom = new THREE.BoxGeometry(upperRadius * 0.7, upperHeight * 0.6, 0.04);
      const arcMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });
      const arcMesh = new THREE.Mesh(arcGeom, arcMat);
      arcMesh.position.set(
        Math.cos(angle) * (upperRadius - 0.02),
        upperY + upperHeight / 2,
        Math.sin(angle) * (upperRadius - 0.02)
      );
      arcMesh.rotation.y = -angle + Math.PI / 2;
      minaret.add(arcMesh);
    }

    // 5. Crown Dome with Spire and Crescent (القبة والهلال النحاسي)
    const domeY = upperY + upperHeight;
    const domeRadius = upperRadius * 1.05;
    const domeGeom = new THREE.SphereGeometry(domeRadius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: domeColor,
      metalness: metalness,
      roughness: 0.15,
      emissive: domeColor,
      emissiveIntensity: 0.15
    });
    const domeMesh = new THREE.Mesh(domeGeom, domeMat);
    domeMesh.position.y = domeY;
    domeMesh.castShadow = true;
    minaret.add(domeMesh);

    // Thin metallic tip spire
    const spireHeight = 1.3;
    const spireGeom = new THREE.CylinderGeometry(0.02, 0.06, spireHeight, 6);
    const spireMesh = new THREE.Mesh(spireGeom, domeMat);
    spireMesh.position.y = domeY + domeRadius + spireHeight / 2;
    spireMesh.castShadow = true;
    minaret.add(spireMesh);

    // Golden Crescent (الهلال الإسلامي التقليدي)
    const crescentShape = new THREE.Shape();
    crescentShape.absarc(0, 0, 0.18, 0, Math.PI * 2);
    const holePath = new THREE.Path();
    holePath.absarc(0.07, 0.05, 0.15, 0, Math.PI * 2);
    crescentShape.holes.push(holePath);

    const crescentExtrude = {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.01,
      bevelThickness: 0.01
    };
    const crescentGeom = new THREE.ExtrudeGeometry(crescentShape, crescentExtrude);
    const crescentMesh = new THREE.Mesh(crescentGeom, domeMat);
    crescentMesh.position.set(0, domeY + domeRadius + spireHeight, 0);
    crescentMesh.rotation.y = Math.PI / 4;
    crescentMesh.castShadow = true;
    minaret.add(crescentMesh);

    // Dynamic asset replacement if high-quality 3D asset exists
    AssetLoader.replaceWithExternalModel(minaret, '/assets/models/buildings/minaret.glb', {
      targetHeight: height,
      centerPivot: true
    });

    return minaret;
  }

  /**
   * Generates the iconic Al-Qahira Castle (قلعة القاهرة) as a permanent landmark.
   * This uses the uploaded landmark model if available.
   */
  public static createCairoCastle(): THREE.Group {
    const castle = new THREE.Group();
    castle.name = "CairoCastleLandmark";

    const modelPath = '/assets/models/buildings/cairo_castle.glb';
    AssetLoader.getInstance().checkAssetExists(modelPath).then(exists => {
      if (exists) {
        AssetLoader.replaceWithExternalModel(castle, modelPath, {
          targetHeight: 35.0, // Massive citadel scale
          centerPivot: true
        });
      } else {
        // High-quality procedural placeholder if asset is missing
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.95 });
        const baseGeom = new THREE.CylinderGeometry(20, 25, 15, 8);
        const base = new THREE.Mesh(baseGeom, stoneMat);
        base.position.y = 7.5;
        castle.add(base);

        const towerGeom = new THREE.CylinderGeometry(6, 6, 25, 8);
        for (let i = 0; i < 4; i++) {
          const t = new THREE.Mesh(towerGeom, stoneMat);
          t.position.set(Math.cos(i * Math.PI / 2) * 15, 12.5, Math.sin(i * Math.PI / 2) * 15);
          castle.add(t);
        }
      }
    });

    return castle;
  }
}
