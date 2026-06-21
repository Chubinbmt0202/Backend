import fs from 'fs';
import path from 'path';

const mapPath = path.join(process.cwd(), 'scratch', 'function_map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const dir = path.join(process.cwd(), 'controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const [oldName, newName] of Object.entries(map)) {
    if (oldName === newName) continue;
    
    // 3. Thay trong khối import { ... }
    const importRegex = new RegExp(`(import\\s+\\{[^}]*)\\b${oldName}\\b([^}]*\\}\\s*from)`, 'g');
    content = content.replace(importRegex, `$1${newName}$2`);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated controller import: ${file}`);
});
