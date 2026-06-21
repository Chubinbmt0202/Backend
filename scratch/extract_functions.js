import fs from 'fs';
import path from 'path';

const controllersDir = path.join(process.cwd(), 'controllers');

const files = fs.readdirSync(controllersDir).filter(file => file.endsWith('.js'));

const functionMap = {};

files.forEach(file => {
  const filePath = path.join(controllersDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const regex = /export\s+const\s+([a-zA-Z0-9_]+)\s*=/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const funcName = match[1];
    functionMap[funcName] = funcName; // temporary mapping to itself
  }
});

fs.writeFileSync(path.join(process.cwd(), 'scratch', 'function_map.json'), JSON.stringify(functionMap, null, 2));
console.log('Function map generated at scratch/function_map.json');
