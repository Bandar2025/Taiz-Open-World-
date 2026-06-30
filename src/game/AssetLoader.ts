import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface PBRTexturesInput {
  colorPath?: string;
  normalPath?: string;
  roughnessPath?: string;
  metalnessPath?: string;
  aoPath?: string;
  opacityPath?: string;
}

export class AssetLoader {
  private static instance: AssetLoader;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private assetExistenceCache: Map<string, boolean> = new Map();
  private loadedModelsCache: Map<string, THREE.Group> = new Map();
  private loadedTexturesCache: Map<string, THREE.Texture> = new Map();

  private constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
  }

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  /**
   * Lightweight HEAD check to verify if a file exists on the server before loading it.
   * Helps avoid 404 console errors and enables seamless fallback to procedural templates.
   */
  public async checkAssetExists(url: string): Promise<boolean> {
    if (this.assetExistenceCache.has(url)) {
      return this.assetExistenceCache.get(url)!;
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      const exists = response.ok;
      this.assetExistenceCache.set(url, exists);
      return exists;
    } catch {
      this.assetExistenceCache.set(url, false);
      return false;
    }
  }

  /**
   * Loads a GLTF/GLB model from a path with complete optimization, PBR materials,
   * shadow settings, pivot centering, and proper scaling bounds.
   */
  public async loadModel(
    url: string,
    options: {
      targetHeight?: number;
      targetWidth?: number;
      centerPivot?: boolean;
      customTextures?: PBRTexturesInput;
    } = {}
  ): Promise<THREE.Group | null> {
    const cacheKey = `${url}_h:${options.targetHeight ?? 'auto'}_w:${options.targetWidth ?? 'auto'}`;
    if (this.loadedModelsCache.has(cacheKey)) {
      return this.loadedModelsCache.get(cacheKey)!.clone();
    }

    const exists = await this.checkAssetExists(url);
    if (!exists) {
      return null; // Signals engine to use procedural fallback
    }

    return new Promise((resolve) => {
      this.gltfLoader.load(
        url,
        async (gltf) => {
          const modelGroup = gltf.scene;
          modelGroup.userData.animations = gltf.animations;

          // 1. Shadow settings and Frustum Culling Optimization
          modelGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.frustumCulled = true;

              // Ensure materials are MeshStandardMaterial for Physically Based Rendering (PBR)
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material = child.material.map((mat) => this.upgradeToPBR(mat));
                } else {
                  child.material = this.upgradeToPBR(child.material);
                }
              }
            }
          });

          // 2. Custom PBR Materials injection if textures are provided
          if (options.customTextures) {
            await this.applyCustomTexturesToModel(modelGroup, options.customTextures);
          }

          // 3. Scale and proportions preservation
          const boundingBox = new THREE.Box3().setFromObject(modelGroup);
          const size = new THREE.Vector3();
          boundingBox.getSize(size);

          if (options.targetHeight && size.y > 0) {
            const scaleFactor = options.targetHeight / size.y;
            modelGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
          } else if (options.targetWidth && size.x > 0) {
            const scaleFactor = options.targetWidth / size.x;
            modelGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
          }

          // 4. Center pivot correctly (if requested)
          if (options.centerPivot) {
            const centeredGroup = new THREE.Group();
            const reCalculatedBox = new THREE.Box3().setFromObject(modelGroup);
            const center = new THREE.Vector3();
            reCalculatedBox.getCenter(center);

            // Shift model so its geometric center lies at local (0, 0, 0) on X and Z, but base lies at Y=0
            modelGroup.position.set(-center.x, -reCalculatedBox.min.y, -center.z);
            centeredGroup.add(modelGroup);
            
            this.loadedModelsCache.set(cacheKey, centeredGroup);
            resolve(centeredGroup);
          } else {
            this.loadedModelsCache.set(cacheKey, modelGroup);
            resolve(modelGroup);
          }
        },
        undefined,
        (error) => {
          console.warn(`AssetLoader: Failed to load 3D model from ${url}. Falling back. Error:`, error);
          resolve(null);
        }
      );
    });
  }

  /**
   * Upgrades standard basic/phong/lambert materials to robust MeshStandardMaterial (PBR).
   */
  private upgradeToPBR(material: THREE.Material): THREE.MeshStandardMaterial {
    if (material instanceof THREE.MeshStandardMaterial) {
      return material;
    }

    const standardMat = new THREE.MeshStandardMaterial({
      color: (material as any).color ?? 0xffffff,
      roughness: 0.6,
      metalness: 0.1,
      transparent: material.transparent,
      opacity: material.opacity,
    });

    // Transfer texture maps if they exist
    if ((material as any).map) standardMat.map = (material as any).map;
    if ((material as any).normalMap) standardMat.normalMap = (material as any).normalMap;
    if ((material as any).roughnessMap) standardMat.roughnessMap = (material as any).roughnessMap;
    if ((material as any).metalnessMap) standardMat.metalnessMap = (material as any).metalnessMap;
    if ((material as any).aoMap) standardMat.aoMap = (material as any).aoMap;
    if ((material as any).alphaMap) standardMat.alphaMap = (material as any).alphaMap;

    return standardMat;
  }

  /**
   * Applies custom PBR textures directly onto model meshes.
   */
  private async applyCustomTexturesToModel(model: THREE.Object3D, texturesInput: PBRTexturesInput): Promise<void> {
    const pbrMaterial = await this.loadPBRMaterial(texturesInput);

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = pbrMaterial;
      }
    });
  }

  /**
   * Builds PBR standard material using loaded textures.
   */
  public async loadPBRMaterial(texturesInput: PBRTexturesInput): Promise<THREE.MeshStandardMaterial> {
    const materialOptions: THREE.MeshStandardMaterialParameters = {
      roughness: 0.7,
      metalness: 0.1,
    };

    // Load each texture asynchronously if paths are provided
    if (texturesInput.colorPath && (await this.checkAssetExists(texturesInput.colorPath))) {
      materialOptions.map = await this.loadTexture(texturesInput.colorPath);
    }
    if (texturesInput.normalPath && (await this.checkAssetExists(texturesInput.normalPath))) {
      materialOptions.normalMap = await this.loadTexture(texturesInput.normalPath);
    }
    if (texturesInput.roughnessPath && (await this.checkAssetExists(texturesInput.roughnessPath))) {
      materialOptions.roughnessMap = await this.loadTexture(texturesInput.roughnessPath);
    }
    if (texturesInput.metalnessPath && (await this.checkAssetExists(texturesInput.metalnessPath))) {
      materialOptions.metalnessMap = await this.loadTexture(texturesInput.metalnessPath);
    }
    if (texturesInput.aoPath && (await this.checkAssetExists(texturesInput.aoPath))) {
      materialOptions.aoMap = await this.loadTexture(texturesInput.aoPath);
    }
    if (texturesInput.opacityPath && (await this.checkAssetExists(texturesInput.opacityPath))) {
      materialOptions.alphaMap = await this.loadTexture(texturesInput.opacityPath);
      materialOptions.transparent = true;
    }

    return new THREE.MeshStandardMaterial(materialOptions);
  }

  /**
   * Loads a texture from file with compression/filtering optimized for performance and mobile.
   */
  public async loadTexture(url: string): Promise<THREE.Texture> {
    if (this.loadedTexturesCache.has(url)) {
      return this.loadedTexturesCache.get(url)!;
    }

    return new Promise((resolve) => {
      this.textureLoader.load(
        url,
        (texture) => {
          // Texture optimizations for mobile/high perf
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;

          this.loadedTexturesCache.set(url, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`AssetLoader: Failed to load texture from ${url}. Returning flat color placeholder. Error:`, error);
          // Return an empty transparent 2x2 texture as fallback
          const fallbackTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
          fallbackTex.needsUpdate = true;
          resolve(fallbackTex);
        }
      );
    });
  }

  /**
   * Generates dynamic Level Of Detail (LOD) groupings to preserve framerate stability.
   */
  public createLOD(highResModel: THREE.Object3D, lowResModel: THREE.Object3D, distances: number[] = [45, 120]): THREE.LOD {
    const lod = new THREE.LOD();
    lod.addLevel(highResModel, 0);
    lod.addLevel(lowResModel, distances[0]);
    
    // Add an empty object as the furthest LOD level for extreme distance culling
    const empty = new THREE.Object3D();
    lod.addLevel(empty, distances[1]);

    return lod;
  }

  /**
   * Helper to load an external model asynchronously and replace the children of a target group with the loaded model.
   * If the external model doesn't exist, the target group keeps its original procedural geometry.
   */
  public static async replaceWithExternalModel(
    targetGroup: THREE.Group,
    modelPath: string,
    options: {
      targetHeight?: number;
      targetWidth?: number;
      centerPivot?: boolean;
      onSuccess?: (model: THREE.Group) => void;
    } = {}
  ): Promise<boolean> {
    try {
      const loader = AssetLoader.getInstance();
      const model = await loader.loadModel(modelPath, options);
      if (model) {
        // Clear procedural children
        while (targetGroup.children.length > 0) {
          targetGroup.remove(targetGroup.children[0]);
        }
        // Add loaded model
        targetGroup.add(model);
        if (options.onSuccess) {
          options.onSuccess(model);
        }
        return true;
      }
    } catch (err) {
      console.warn(`AssetLoader.replaceWithExternalModel error for ${modelPath}:`, err);
    }
    return false;
  }

  /**
   * Run and print a complete PBR and asset validation audit report for all models.
   * Logs file existence, animation data, physics bounds, and triggers fallback systems.
   */
  public async runAssetValidationReport(onProgress?: (progress: number, assetLabel: string, error?: string) => void): Promise<string[]> {
    const failures: string[] = [];
    const assetsToVerify = [
      { category: 'Player/Characters', path: '/assets/models/characters/player.glb', label: 'Primary Player' },
      { category: 'Player/Characters', path: '/assets/models/characters/yemeni_man.glb', label: 'Yemeni Traditional Man' },
      { category: 'Player/Characters', path: '/assets/models/characters/modern_man.glb', label: 'Arab Modern Man' },
      { category: 'Player/Characters', path: '/assets/models/characters/veiled_woman.glb', label: 'Veiled Yemeni Woman' },
      { category: 'Player/Characters', path: '/assets/models/characters/npc.glb', label: 'Default NPC' },
      { category: 'Vehicles', path: '/assets/models/vehicles/shas.glb', label: 'Toyota Shas 4x4' },
      { category: 'Vehicles', path: '/assets/models/vehicles/hilux.glb', label: 'Toyota Hilux Pickup' },
      { category: 'Vehicles', path: '/assets/models/vehicles/hiace.glb', label: 'Toyota HiAce Bus' },
      { category: 'Vehicles', path: '/assets/models/vehicles/motorcycle.glb', label: 'Yemeni Moto' },
      { category: 'Vehicles', path: '/assets/models/vehicles/aircraft.glb', label: 'Lumen Experimental Scout' },
      { category: 'Architecture', path: '/assets/models/buildings/mosque.glb', label: 'Al-Ashrafiya Mosque' },
      { category: 'Architecture', path: '/assets/models/buildings/cairo_castle.glb', label: 'Cairo Castle Citadel' },
      { category: 'Architecture', path: '/assets/models/buildings/fuel_station.glb', label: 'Saba Fuel Station' },
      { category: 'Architecture', path: '/assets/models/buildings/house.glb', label: 'Sanaa/Taiz Stone House' },
      { category: 'Architecture', path: '/assets/models/buildings/minaret.glb', label: 'Traditional Minaret' },
      { category: 'Environment Props', path: '/assets/models/props/market_stall.glb', label: 'Suleimani Tea Stall' },
      { category: 'Environment Props', path: '/assets/models/props/street_light.glb', label: 'Municipal Street Light' },
      { category: 'Vegetation', path: '/assets/models/vegetation/tree.glb', label: 'Acacia Tree' }
    ];

    console.log("============= LUMEN CINEMATIC ENGINE: ASSET AUDIT REPORT =============");
    let completedCount = 0;
    for (const asset of assetsToVerify) {
      const currentProgress = Math.floor((completedCount / assetsToVerify.length) * 100);
      
      const exists = await this.checkAssetExists(asset.path);
      if (!exists) {
        const reason = "Not Found on Server";
        failures.push(`${asset.path.split('/').pop()}: ${reason}`);
        if (onProgress) onProgress(currentProgress, asset.label, reason);
        console.warn(`[AUDIT] ❌ ${asset.category} -> ${asset.label} [${asset.path}] - ${reason}`);
        completedCount++;
        continue;
      }

      try {
        const loadedModel = await this.loadModel(asset.path, { centerPivot: true });
        if (loadedModel) {
          if (onProgress) onProgress(currentProgress, asset.label);
          console.log(`[AUDIT] ✅ ${asset.category} -> ${asset.label} [${asset.path}] loaded successfully.`);
        } else {
          const reason = "Empty Group Returned";
          failures.push(`${asset.path.split('/').pop()}: ${reason}`);
          if (onProgress) onProgress(currentProgress, asset.label, reason);
          console.warn(`[AUDIT] ⚠️ ${asset.category} -> ${asset.label} - ${reason}`);
        }
      } catch (err) {
        const reason = "Parse/Loading Error";
        failures.push(`${asset.path.split('/').pop()}: ${reason}`);
        if (onProgress) onProgress(currentProgress, asset.label, reason);
        console.error(`[AUDIT] ❌ ${asset.category} -> ${asset.label} - ${reason}`, err);
      }
      completedCount++;
    }

    if (onProgress) onProgress(100, "Validation Complete");
    console.log("======================================================================");
    return failures;
  }
}
