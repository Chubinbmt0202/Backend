import fs from 'fs';
import path from 'path';

const map = {
  "getAttendanceStatus": "layTrangThaiDiemDanh",
  "getAllAttendance": "layTatCaDiemDanh",
  "verifyAttendanceFace": "xacThucKhuonMatDiemDanh",
  "getEmployeeAttendanceHistory": "layLichSuDiemDanhNhanVien",
  "getLateExplanations": "layDanhSachGiaiTrinhDiMuon",
  "getEmployeeLateExplanations": "layGiaiTrinhDiMuonCuaNhanVien",
  "updateLateExplanationStatus": "capNhatTrangThaiGiaiTrinh",
  "getAttendanceTrend": "layXuHuongDiemDanh",
  "login": "dangNhap",
  "logout": "dangXuat",
  "addDepartment": "themPhongBan",
  "getDepartments": "layDanhSachPhongBan",
  "updateDepartment": "capNhatPhongBan",
  "deleteDepartment": "xoaPhongBan",
  "addEmployee": "themNhanVien",
  "getEmployees": "layDanhSachNhanVien",
  "getEmployeesByDepartment": "layNhanVienTheoPhongBan",
  "getEmployeeByID": "layNhanVienTheoID",
  "updateEmployee": "capNhatNhanVien",
  "deleteEmployee": "xoaNhanVien",
  "uploadEmployeeFace": "taiLenKhuonMatNhanVien",
  "requestFaceUpdate": "yeuCauCapNhatKhuonMat",
  "requestProfileUpdate": "yeuCauCapNhatHoSo",
  "recognizeEmployeeFace": "nhanDienKhuonMatNhanVien",
  "getEmployeeDashboard": "layThongKeNhanVien",
  "updateFcmToken": "capNhatFcmToken",
  "changePassword": "doiMatKhau",
  "createLeaveRequest": "taoYeuCauNghiPhep",
  "getEmployeeLeaves": "layDonNghiPhepNhanVien",
  "getAllLeaveRequests": "layTatCaDonNghiPhep",
  "updateLeaveStatus": "capNhatTrangThaiNghiPhep",
  "getAllLeaveTypes": "layTatCaLoaiNghiPhep",
  "updateLeaveType": "capNhatLoaiNghiPhep",
  "createNotificationHelper": "taoThongBaoHelper",
  "createNotification": "taoThongBao",
  "getEmployeeNotifications": "layThongBaoNhanVien",
  "markAsRead": "danhDauDaDoc",
  "markAllAsRead": "danhDauTatCaDaDoc",
  "deleteNotification": "xoaThongBao",
  "addOfficeGPS": "themToaDoVanPhong",
  "getOffices": "layDanhSachVanPhong",
  "updateOfficeGPS": "capNhatToaDoVanPhong",
  "deleteOffice": "xoaVanPhong",
  "updateOfficeWifi": "capNhatWifiVanPhong",
  "addOfficeWifi": "themWifiVanPhong",
  "deleteOfficeWifi": "xoaWifiVanPhong",
  "getAllWifis": "layTatCaWifi",
  "createOTRequest": "taoDonTangCa",
  "getAllOTRequests": "layTatCaDonTangCa",
  "updateOTStatus": "capNhatTrangThaiTangCa",
  "getEmployeeOTRequests": "layDonTangCaNhanVien",
  "addRole": "themVaiTro",
  "assignRole": "ganVaiTro",
  "getRoles": "layDanhSachVaiTro",
  "addShift": "themCaLamViec",
  "getAllShifts": "layTatCaCaLamViec",
  "getMyShift": "layCaLamViecCuaToi",
  "updateShift": "capNhatCaLamViec",
  "deleteShift": "xoaCaLamViec",
  "uploadFile": "taiLenTep",
  "sendPushNotification": "guiThongBaoPush",
  "sendMulticastNotification": "guiThongBaoNhieuNguoi",
  "generateId": "taoId",
  "euclideanDistance": "khoangCachEuclid",
  "calculateSimilarity": "tinhDoTuongDong",
  "findBestMatch": "timKetQuaTotNhat"
};

const filePath = path.join(process.cwd(), 'controllers', 'attendanceController.js');
let content = fs.readFileSync(filePath, 'utf8');

for (const [oldName, newName] of Object.entries(map)) {
  if (oldName === newName) continue;
  
  // 1. Thay đổi export const oldName =
  const exportRegex = new RegExp(`export\\s+const\\s+${oldName}\\s*=`, 'g');
  content = content.replace(exportRegex, `export const ${newName} =`);
  
  // 2. Thay đổi gọi hàm nội bộ: oldName(
  const callRegex = new RegExp(`\\b${oldName}\\(`, 'g');
  content = content.replace(callRegex, `${newName}(`);
  
  // 3. Thay đổi trong các import / destructuring tĩnh hoặc động
  const importRegex = new RegExp(`\\b${oldName}\\b`, 'g');
  // Thay thế cẩn thận:
  // Vì là attendanceController.js, những chữ như `findBestMatch` hay `createNotificationHelper`
  // chỉ xuất hiện dưới dạng tên hàm được gọi hoặc import. Chúng ta replace trực tiếp an toàn
  // cho file này vì các tên hàm tiếng anh khá dài và unique.
  
  content = content.replace(importRegex, newName);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed attendanceController.js');
