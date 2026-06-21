import fs from 'fs';
import path from 'path';

const mapPath = path.join(process.cwd(), 'scratch', 'function_map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

function applyToControllers() {
  const dir = path.join(process.cwd(), 'controllers');
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
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated controller: ${file}`);
  });
}

function applyToRoutes() {
  const dir = path.join(process.cwd(), 'routes');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    for (const [oldName, newName] of Object.entries(map)) {
      if (oldName === newName) continue;
      
      // 1. Thay trong khối import { ... }
      // Chỉ thay những chữ trùng khớp hoàn toàn (bỏ qua nếu tên là một phần của tên khác)
      const importRegex = new RegExp(`(import\\s+\\{[^}]*)\\b${oldName}\\b([^}]*\\}\\s*from)`, 'g');
      content = content.replace(importRegex, `$1${newName}$2`);
      
      // Thay đổi usages trong router callbacks
      // Vd: , oldName) -> , newName)
      const endParenthesisRegex = new RegExp(`,\\s*${oldName}\\s*\\)`, 'g');
      content = content.replace(endParenthesisRegex, `, ${newName})`);
      
      // Vd: , oldName, -> , newName,
      const commaRegex = new RegExp(`,\\s*${oldName}\\s*,`, 'g');
      content = content.replace(commaRegex, `, ${newName},`);
      
      // Vd: (oldName, -> (newName,
      const startParenthesisRegex = new RegExp(`\\(\\s*${oldName}\\s*,`, 'g');
      content = content.replace(startParenthesisRegex, `(${newName},`);

      // Vd: (oldName) -> (newName)
      const bothParenthesisRegex = new RegExp(`\\(\\s*${oldName}\\s*\\)`, 'g');
      content = content.replace(bothParenthesisRegex, `(${newName})`);
      
      // Vd: [oldName] (if it's in an array of middlewares)
      const arrayRegex = new RegExp(`\\[\\s*${oldName}\\s*\\]`, 'g');
      content = content.replace(arrayRegex, `[${newName}]`);
      const arrayStartRegex = new RegExp(`\\[\\s*${oldName}\\s*,`, 'g');
      content = content.replace(arrayStartRegex, `[${newName},`);
      const arrayEndRegex = new RegExp(`,\\s*${oldName}\\s*\\]`, 'g');
      content = content.replace(arrayEndRegex, `, ${newName}]`);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated route: ${file}`);
  });
}

applyToControllers();
applyToRoutes();
console.log('Done applying renames.');
