import pool from '../config/db.js';
import { getLateExplanations } from '../controllers/attendanceController.js';

const mockReq = {};
const mockRes = {
    status: function(code) {
        this.statusCode = code;
        return this;
    },
    json: function(data) {
        console.log('Response Status:', this.statusCode);
        console.log('Data retrieved:', JSON.stringify(data, null, 2));
        process.exit(0);
    }
};

console.log('--- Testing Get Late Explanations ---');
getLateExplanations(mockReq, mockRes);
