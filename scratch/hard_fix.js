import fs from 'fs';
import path from 'path';

const mapPath = path.join(process.cwd(), 'scratch', 'function_map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const dir = path.join(process.cwd(), 'controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [oldName, newName] of Object.entries(map)) {
    if (oldName === newName) continue;
    
    // Instead of regex, just split and replace in imports
    // We can just replace the old name with the new name globally,
    // but only if it's not a URL or something.
    // Since we know it's in imports: "import { ... oldName ... } from"
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    if (content.includes(oldName)) {
      content = content.replace(regex, newName);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Hard fixed: ${file}`);
  }
});
