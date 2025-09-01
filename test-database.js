#!/usr/bin/env node
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'therapy.db');
console.log('Testing database at:', dbPath);

const db = new Database(dbPath);

// Check tables
console.log('\n📊 Database Tables:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
  console.log(`   - ${table.name}: ${count.count} records`);
});

// Check if we have any users
const users = db.prepare('SELECT * FROM users').all();
console.log('\n👤 Users in database:', users.length);
if (users.length > 0) {
  users.forEach(user => {
    console.log(`   - ${user.username} (${user.email}) - Role: ${user.role}`);
  });
}

// Check if we have any clients
const clients = db.prepare('SELECT * FROM clients').all();
console.log('\n👥 Clients in database:', clients.length);
if (clients.length > 0) {
  clients.forEach(client => {
    console.log(`   - ${client.first_name} ${client.last_name} (${client.email})`);
  });
}

// Add test data if needed
if (clients.length === 0) {
  console.log('\n➕ Adding test data...');
  
  // Get admin user
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  
  if (admin) {
    // Add test clients
    const insertClient = db.prepare(`
      INSERT INTO clients (first_name, last_name, email, therapist_id, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const testClients = [
      ['John', 'Doe', 'john.doe@example.com'],
      ['Jane', 'Smith', 'jane.smith@example.com'],
      ['Bob', 'Johnson', 'bob.johnson@example.com'],
      ['Alice', 'Williams', 'alice.williams@example.com'],
      ['Charlie', 'Brown', 'charlie.brown@example.com']
    ];
    
    testClients.forEach(([first, last, email]) => {
      try {
        insertClient.run(first, last, email, admin.id, 'active');
        console.log(`   ✅ Added client: ${first} ${last}`);
      } catch (error) {
        console.log(`   ⚠️ Failed to add ${first} ${last}:`, error.message);
      }
    });
    
    // Add test appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const insertAppointment = db.prepare(`
      INSERT INTO appointments (client_id, therapist_id, start_time, end_time, type, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const clientsWithAppointments = db.prepare('SELECT id, first_name, last_name FROM clients LIMIT 3').all();
    
    clientsWithAppointments.forEach((client, index) => {
      const appointmentTime = new Date(tomorrow);
      appointmentTime.setHours(9 + index, 0, 0, 0);
      const endTime = new Date(appointmentTime);
      endTime.setHours(appointmentTime.getHours() + 1);
      
      try {
        insertAppointment.run(
          client.id,
          admin.id,
          appointmentTime.toISOString(),
          endTime.toISOString(),
          'therapy_session',
          'scheduled'
        );
        console.log(`   ✅ Added appointment for ${client.first_name} ${client.last_name}`);
      } catch (error) {
        console.log(`   ⚠️ Failed to add appointment:`, error.message);
      }
    });
    
    // Add test documents
    const insertDocument = db.prepare(`
      INSERT INTO documents (
        therapist_id, client_id, file_name, original_name, 
        file_type, file_size, file_path, extracted_text, 
        category, is_processed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    clientsWithAppointments.forEach(client => {
      try {
        insertDocument.run(
          admin.id,
          client.id,
          `${client.first_name.toLowerCase()}_${client.last_name.toLowerCase()}_notes.txt`,
          `Session Notes - ${client.first_name} ${client.last_name}.txt`,
          'text/plain',
          1024,
          `/uploads/${client.first_name.toLowerCase()}_${client.last_name.toLowerCase()}_notes.txt`,
          `Session notes for ${client.first_name} ${client.last_name}. 
          Client presented with anxiety and stress. 
          Discussed coping strategies and mindfulness exercises.
          Progress noted in emotional regulation.`,
          'session_notes',
          1
        );
        console.log(`   ✅ Added document for ${client.first_name} ${client.last_name}`);
      } catch (error) {
        console.log(`   ⚠️ Failed to add document:`, error.message);
      }
    });
  }
}

// Final summary
console.log('\n📈 Final Database Statistics:');
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
  console.log(`   - ${table.name}: ${count.count} records`);
});

db.close();
console.log('\n✅ Database test complete!');