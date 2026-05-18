import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/Administrator/Desktop/New folder/Backend/.env' });

async function testConnection() {
  console.log('--- TESTING ACTIVE FIREBASE READ/WRITE ---');
  try {
    const { default: admin } = await import('../config/firebase.js');
    
    if (!admin) {
      console.error('Firebase Admin not initialized properly.');
      return;
    }
    
    const db = admin.database();
    const testRef = db.ref('test_connection');
    
    console.log('Attempting to write data to Firebase...');
    await testRef.set({
      status: 'success',
      timestamp: Date.now(),
      message: 'Connection check from Backend server'
    });
    console.log('✅ Write successful!');

    console.log('Attempting to read data from Firebase...');
    const snapshot = await testRef.once('value');
    console.log('✅ Read successful! Data:', snapshot.val());

    // Clean up
    console.log('Cleaning up test data...');
    await testRef.remove();
    console.log('✅ Cleanup successful!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Active test failed with error:', error);
    process.exit(1);
  }
}

testConnection();
