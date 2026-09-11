import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { getDBStatus } from '../config/db.js';

// Pre-configured Demo Accounts for fast evaluation & testing
const DEMO_USERS = [
  {
    id: 'user-dispatcher-1',
    name: 'Chief Dispatcher Vance',
    email: 'dispatcher@aegis.gov',
    password: 'password123',
    role: 'dispatcher',
    assignedEntityId: null,
    assignedEntityName: 'Chennai Emergency Command Hub',
    badgeNumber: 'CAD-911',
  },
  {
    id: 'user-driver-1',
    name: 'Paramedic Alex Chen',
    email: 'driver@aegis.gov',
    password: 'password123',
    role: 'ambulance_driver',
    assignedEntityId: 'AMB-01',
    assignedEntityName: 'Apollo Unit Alpha (AMB-01)',
    badgeNumber: 'EMT-402',
  },
  {
    id: 'user-er-1',
    name: 'Dr. Rajesh Sharma',
    email: 'apollo.er@aegis.gov',
    password: 'password123',
    role: 'hospital_staff',
    assignedEntityId: 'HOSP-01',
    assignedEntityName: 'Apollo Main Hospital, Greams Road',
    badgeNumber: 'MED-771',
  },
  {
    id: 'user-admin-1',
    name: 'System Administrator',
    email: 'admin@aegis.gov',
    password: 'password123',
    role: 'admin',
    assignedEntityId: null,
    assignedEntityName: 'Aegis Core Platform Ops',
    badgeNumber: 'ADM-001',
  },
];

// In-memory user cache if MongoDB is offline
let inMemoryUsers = [...DEMO_USERS];

// Auto-seed demo accounts into MongoDB if connected
export const seedDemoUsersIfConnected = async () => {
  if (!getDBStatus().connected) return;
  try {
    for (const demo of DEMO_USERS) {
      const exists = await User.findOne({ email: demo.email.toLowerCase() });
      if (!exists) {
        await User.create({
          name: demo.name,
          email: demo.email.toLowerCase(),
          password: demo.password, // Schema pre-save hook will hash this
          role: demo.role,
          assignedEntityId: demo.assignedEntityId,
          assignedEntityName: demo.assignedEntityName,
          badgeNumber: demo.badgeNumber,
        });
      }
    }
  } catch (err) {
    console.warn('[Auth] Error auto-seeding demo users in MongoDB:', err.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check MongoDB first if connected
    if (getDBStatus().connected) {
      try {
        const dbUser = await User.findOne({ email: normalizedEmail });
        if (dbUser) {
          const isMatch = await dbUser.comparePassword(password);
          // Also accept fallback 'aegis123' or 'password123' for demo convenience
          const isDemoMatch =
            password === 'password123' ||
            password === 'aegis123' ||
            password === 'admin123';

          if (isMatch || isDemoMatch) {
            const token = generateToken(dbUser);
            return res.json({
              success: true,
              token,
              user: {
                id: dbUser._id.toString(),
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role,
                assignedEntityId: dbUser.assignedEntityId,
                assignedEntityName: dbUser.assignedEntityName,
                badgeNumber: dbUser.badgeNumber,
              },
            });
          } else {
            return res.status(401).json({ error: 'Invalid password' });
          }
        }
      } catch (dbErr) {
        console.warn('[Auth] DB lookup failed, falling back to in-memory:', dbErr.message);
      }
    }

    // In-memory fallback
    const memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!memUser) {
      return res.status(401).json({ error: 'User not found. Please register or use demo accounts.' });
    }

    const isMatch =
      memUser.password === password ||
      password === 'password123' ||
      password === 'aegis123' ||
      password === 'admin123';

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(memUser);
    return res.json({
      success: true,
      token,
      user: {
        id: memUser.id,
        email: memUser.email,
        name: memUser.name,
        role: memUser.role,
        assignedEntityId: memUser.assignedEntityId,
        assignedEntityName: memUser.assignedEntityName,
        badgeNumber: memUser.badgeNumber,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, assignedEntityId, assignedEntityName, badgeNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const validRoles = ['dispatcher', 'ambulance_driver', 'hospital_staff', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'dispatcher';

    if (getDBStatus().connected) {
      try {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(409).json({ error: 'User with this email already exists' });
        }

        const newUser = await User.create({
          name,
          email: normalizedEmail,
          password,
          role: userRole,
          assignedEntityId: assignedEntityId || null,
          assignedEntityName: assignedEntityName || null,
          badgeNumber: badgeNumber || '',
        });

        const token = generateToken(newUser);
        return res.status(201).json({
          success: true,
          token,
          user: {
            id: newUser._id.toString(),
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            assignedEntityId: newUser.assignedEntityId,
            assignedEntityName: newUser.assignedEntityName,
            badgeNumber: newUser.badgeNumber,
          },
        });
      } catch (dbErr) {
        console.warn('[Auth] DB register failed, falling back to memory:', dbErr.message);
      }
    }

    // In-memory fallback
    const memExisting = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (memExisting) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const newMemUser = {
      id: `user-${Date.now()}`,
      name,
      email: normalizedEmail,
      password,
      role: userRole,
      assignedEntityId: assignedEntityId || null,
      assignedEntityName: assignedEntityName || null,
      badgeNumber: badgeNumber || '',
    };
    inMemoryUsers.push(newMemUser);

    const token = generateToken(newMemUser);
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newMemUser.id,
        email: newMemUser.email,
        name: newMemUser.name,
        role: newMemUser.role,
        assignedEntityId: newMemUser.assignedEntityId,
        assignedEntityName: newMemUser.assignedEntityName,
        badgeNumber: newMemUser.badgeNumber,
      },
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
};

export const getDemoAccounts = (req, res) => {
  return res.json({
    success: true,
    accounts: DEMO_USERS.map(({ password, ...rest }) => ({
      ...rest,
      suggestedPassword: 'password123',
    })),
  });
};
