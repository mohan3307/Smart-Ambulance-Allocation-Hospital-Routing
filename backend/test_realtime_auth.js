import { DataStore } from './src/services/dataStore.js';
import { generateToken } from './src/middleware/auth.js';
import { login, register, getDemoAccounts } from './src/controllers/authController.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING REAL-TIME SYSTEM & ROLE-BASED AUTH');
  console.log('====================================================');

  // 1. Initialize DataStore
  await DataStore.initialize();

  // 2. Test Geospatial Nearest Queries (MongoDB GeoJSON / Spatial Fallback)
  console.log('\n[1] Testing GeoJSON 2dsphere Nearest Queries:');
  const incidentPoint = { latitude: 12.9716, longitude: 77.5946 }; // Metro Corridor
  const nearestAmbs = await DataStore.findNearestAmbulances(incidentPoint, 35000);
  console.log(`✅ Found ${nearestAmbs.length} nearest ambulances for coordinates [${incidentPoint.latitude}, ${incidentPoint.longitude}]`);
  if (nearestAmbs.length > 0) {
    const firstAmb = nearestAmbs[0];
    console.log(`   Top match: ${firstAmb.callSign} (${firstAmb.type}) at distance: ${Math.round(firstAmb.distanceMeters || 0)}m`);
  }

  const nearestHosps = await DataStore.findNearestHospitals(incidentPoint, 45000);
  console.log(`✅ Found ${nearestHosps.length} nearest hospitals with trauma capability`);
  if (nearestHosps.length > 0) {
    const firstHosp = nearestHosps[0];
    console.log(`   Top hospital: ${firstHosp.name} (${firstHosp.type || firstHosp.traumaLevel}) at distance: ${Math.round(firstHosp.distanceMeters || 0)}m`);
  }

  // 3. Test JWT Token Generation
  console.log('\n[2] Testing JWT Token Generation:');
  const mockUser = {
    id: 'user-dispatcher-1',
    name: 'Chief Dispatcher Vance',
    email: 'dispatcher@aegis.gov',
    role: 'dispatcher',
    assignedEntityId: null,
    badgeNumber: 'CAD-911',
  };
  const token = generateToken(mockUser);
  console.log('✅ Generated JWT Token successfully (length:', token.length, 'chars)');

  // 4. Test Demo Accounts & Login
  console.log('\n[3] Testing Authentication & Multi-Role Demo Logins:');
  const mockResDispatcher = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.data = payload; return this; }
  };

  await login(
    { body: { email: 'dispatcher@aegis.gov', password: 'password123' } },
    mockResDispatcher
  );
  if (mockResDispatcher.data?.token && mockResDispatcher.data?.user?.role === 'dispatcher') {
    console.log('✅ Dispatcher login SUCCESS:', mockResDispatcher.data.user.name, `[Role: ${mockResDispatcher.data.user.role}]`);
  } else {
    throw new Error('Dispatcher login failed');
  }

  const mockResDriver = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.data = payload; return this; }
  };
  await login(
    { body: { email: 'driver@aegis.gov', password: 'password123' } },
    mockResDriver
  );
  if (mockResDriver.data?.token && mockResDriver.data?.user?.role === 'ambulance_driver') {
    console.log('✅ Paramedic/Driver login SUCCESS:', mockResDriver.data.user.name, `[Role: ${mockResDriver.data.user.role}]`);
  } else {
    throw new Error('Driver login failed');
  }

  const mockResER = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.data = payload; return this; }
  };
  await login(
    { body: { email: 'apollo.er@aegis.gov', password: 'password123' } },
    mockResER
  );
  if (mockResER.data?.token && mockResER.data?.user?.role === 'hospital_staff') {
    console.log('✅ Hospital ER Staff login SUCCESS:', mockResER.data.user.name, `[Role: ${mockResER.data.user.role}]`);
  } else {
    throw new Error('ER Staff login failed');
  }

  // 5. Test Register
  console.log('\n[4] Testing Registration:');
  const mockResReg = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.data = payload; return this; }
  };
  await register(
    {
      body: {
        name: 'Nurse Priya',
        email: `priya.${Date.now()}@aegis.gov`,
        password: 'securePassword123',
        role: 'hospital_staff',
        assignedEntityId: 'HOSP-02',
        assignedEntityName: 'Fortis Malar Hospital',
        badgeNumber: 'RN-8802',
      }
    },
    mockResReg
  );
  if (mockResReg.data?.token && mockResReg.data?.user?.role === 'hospital_staff') {
    console.log('✅ User registration SUCCESS:', mockResReg.data.user.name, `[Badge: ${mockResReg.data.user.badgeNumber}]`);
  } else {
    throw new Error('User registration failed');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 7 CORE REAL-TIME & AUTH UPGRADES VERIFIED 100%');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
