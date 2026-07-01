import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const assetsDir = path.join(publicDir, 'assets');

const manifest = {
  models: [],
  textures: [],
  audio: []
};

function walkDir(currentPath, category, extensions) {
  if (!fs.existsSync(currentPath)) return;
  const files = fs.readdirSync(currentPath);
  for (const file of files) {
    const filePath = path.join(currentPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, category, extensions);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (extensions.includes(ext)) {
        // Get relative path from public directory
        let relativePath = path.relative(publicDir, filePath);
        // Normalize slashes to forward slashes and prepend a slash
        relativePath = '/' + relativePath.replace(/\\/g, '/');
        manifest[category].push(relativePath);
      }
    }
  }
}

walkDir(path.join(assetsDir, 'models'), 'models', ['.glb', '.gltf', '.fbx', '.obj']);
walkDir(path.join(assetsDir, 'textures'), 'textures', ['.png', '.jpg', '.jpeg', '.webp', '.ktx2']);
walkDir(path.join(assetsDir, 'audio'), 'audio', ['.mp3', '.wav', '.ogg']);

fs.writeFileSync(
  path.join(publicDir, 'assets_manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('Successfully generated assets_manifest.json!');
console.log(JSON.stringify(manifest, null, 2));
