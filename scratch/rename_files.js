import fs from 'fs';
import path from 'path';

const map = {
  // Controllers
  "attendanceController.js": "diemDanhController.js",
  "authController.js": "xacThucController.js",
  "departmentController.js": "phongBanController.js",
  "employeeController.js": "nhanVienController.js",
  "leaveController.js": "nghiPhepController.js",
  "notificationController.js": "thongBaoController.js",
  "officeController.js": "vanPhongController.js",
  "otController.js": "tangCaController.js",
  "roleController.js": "vaiTroController.js",
  "shiftController.js": "caLamViecController.js",
  "uploadController.js": "taiLenController.js",
  
  // Routes
  "attendanceRoutes.js": "diemDanhRoutes.js",
  "authRoutes.js": "xacThucRoutes.js",
  "departmentRoutes.js": "phongBanRoutes.js",
  "employeeRoutes.js": "nhanVienRoutes.js",
  "leaveRoutes.js": "nghiPhepRoutes.js",
  "notificationRoutes.js": "thongBaoRoutes.js",
  "officeRoutes.js": "vanPhongRoutes.js",
  "otRoutes.js": "tangCaRoutes.js",
  "roleRoutes.js": "vaiTroRoutes.js",
  "shiftRoutes.js": "caLamViecRoutes.js",
  "uploadRoutes.js": "taiLenRoutes.js",

  // Utils
  "faceUtils.js": "tienIchKhuonMat.js",
  "idGenerator.js": "tienIchTaoId.js",
  "notification.js": "tienIchThongBao.js"
};

const baseDir = process.cwd();

// Bước 1: Cập nhật tất cả các lệnh import trong các file .js
function updateImportsInDir(dirName) {
  const dir = path.join(baseDir, dirName);
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    for (const [oldName, newName] of Object.entries(map)) {
      if (content.includes(oldName)) {
        content = content.replace(new RegExp(oldName, 'g'), newName);
        changed = true;
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated imports in: ${dirName}/${file}`);
    }
  });
}

// Cập nhật index.js
let indexContent = fs.readFileSync(path.join(baseDir, 'index.js'), 'utf8');
let indexChanged = false;
for (const [oldName, newName] of Object.entries(map)) {
  if (indexContent.includes(oldName)) {
    indexContent = indexContent.replace(new RegExp(oldName, 'g'), newName);
    indexChanged = true;
  }
}
if (indexChanged) {
  fs.writeFileSync(path.join(baseDir, 'index.js'), indexContent, 'utf8');
  console.log(`Updated imports in: index.js`);
}

updateImportsInDir('controllers');
updateImportsInDir('routes');
updateImportsInDir('utils');

// Bước 2: Đổi tên file vật lý
function renameFilesInDir(dirName) {
  const dir = path.join(baseDir, dirName);
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  
  files.forEach(file => {
    if (map[file]) {
      const oldPath = path.join(dir, file);
      const newPath = path.join(dir, map[file]);
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed: ${dirName}/${file} -> ${map[file]}`);
    }
  });
}

renameFilesInDir('controllers');
renameFilesInDir('routes');
renameFilesInDir('utils');

console.log('All files renamed successfully.');
