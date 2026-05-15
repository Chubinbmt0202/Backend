// Note: This script simulates the request data and checks if the controller logic works.
// It doesn't actually run the server.
import { createLeaveRequest } from '../controllers/leaveController.js';


const mockReq = {
    body: {
        leaveType: "Nghỉ ốm",
        fromDate: "15/5/2026",
        toDate: "15/5/2026",
        reason: "Test reason",
        id_nhan_vien: "NV001"
    },
    file: null // Simulate no file for simple test
};

const mockRes = {
    status: function(code) {
        this.statusCode = code;
        return this;
    },
    json: function(data) {
        console.log('Response Status:', this.statusCode);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    }
};

console.log('--- Testing Create Leave Request ---');
createLeaveRequest(mockReq, mockRes);
