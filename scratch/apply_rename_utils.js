import fs from 'fs';
import path from 'path';

const mapPathUtils = path.join(process.cwd(), 'scratch', 'function_map_utils.json');
const map = JSON.parse(fs.readFileSync(mapPathUtils, 'utf8'));

function applyToDir(dirName) {
  const dir = path.join(process.cwd(), dirName);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    for (const [oldName, newName] of Object.entries(map)) {
      if (oldName === newName) continue;
      
      // 1. Thay đổi export const oldName =
      const exportRegex = new RegExp(`export\\s+const\\s+${oldName}\\s*=`, 'g');
      content = content.replace(exportRegex, `export const ${newName} =`);
      
      // 2. Thay đổi gọi hàm nội bộ: oldName(
      const callRegex = new RegExp(`\\b${oldName}\\(`, 'g');
      content = content.replace(callRegex, `${newName}(`);
      
      // 3. Thay trong khối import { ... }
      const importRegex = new RegExp(`(import\\s+\\{[^}]*)\\b${oldName}\\b([^}]*\\}\\s*from)`, 'g');
      content = content.replace(importRegex, `$1${newName}$2`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${dirName}: ${file}`);
  });
}

applyToDir('controllers');
applyToDir('routes');
applyToDir('utils');
console.log('Done applying utils renames.');
