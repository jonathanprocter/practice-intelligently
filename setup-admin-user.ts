#!/usr/bin/env tsx

// Script to set up the admin user with proper hashed password

import bcrypt from 'bcrypt';
import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function setupAdminUser() {
  console.log('Setting up admin user...');
  
  const adminUserId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
  const adminPassword = 'admin123';
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('Password hashed successfully');
    
    // Check if user exists
    const existingUsers = await db.select().from(users).where(eq(users.id, adminUserId));
    
    if (existingUsers.length > 0) {
      // Update existing user
      console.log('Updating existing user to admin...');
      await db
        .update(users)
        .set({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@therapy.local',
          fullName: 'Admin User',
          role: 'therapist',
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, adminUserId));
      console.log('User updated successfully');
    } else {
      // Create new user
      console.log('Creating new admin user...');
      await db.insert(users).values({
        id: adminUserId,
        username: 'admin',
        password: hashedPassword,
        email: 'admin@therapy.local',
        fullName: 'Admin User',
        role: 'therapist',
        isActive: true
      });
      console.log('Admin user created successfully');
    }
    
    // Verify the user
    const [verifyUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);
    
    if (verifyUser) {
      console.log('✅ Admin user setup complete:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
      console.log('  Email:', verifyUser.email);
      console.log('  ID:', verifyUser.id);
      console.log('  Role:', verifyUser.role);
      
      // Test password verification
      const isValidPassword = await bcrypt.compare(adminPassword, verifyUser.password);
      console.log('  Password verification test:', isValidPassword ? '✅ PASSED' : '❌ FAILED');
    } else {
      console.error('❌ Failed to verify admin user');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin user:', error);
    process.exit(1);
  }
}

setupAdminUser();