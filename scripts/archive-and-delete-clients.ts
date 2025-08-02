#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { clients } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Clients to archive (set status to 'archived')
const CLIENTS_TO_ARCHIVE = [
  { firstName: "James", lastName: "Wright" },
  { firstName: "Jerry", lastName: "MacKey" },
  { firstName: "Jared", lastName: "Vignola" },
  { firstName: "Andrew", lastName: "Ross" },
  { firstName: "Adelaida", lastName: "Mongelli" },
  { firstName: "Tracy", lastName: "Storey" },
  { firstName: "Nicola", lastName: "Marasco" },
  { firstName: "Robert", lastName: "Abbot" },
  { firstName: "Scott", lastName: "Berger" },
  { firstName: "Lindsey", lastName: "Grossman" },
  { firstName: "James", lastName: "Fusco" }
];

// Client to delete completely
const CLIENT_TO_DELETE = { firstName: "Test Update", lastName: "Frey" };

async function archiveAndDeleteClients() {
  console.log('🔄 Starting client archive and deletion process...');
  
  try {
    let archivedCount = 0;
    let notFoundCount = 0;
    let deletedCount = 0;
    
    // Archive specified clients
    console.log('\n📁 Archiving clients...');
    for (const clientInfo of CLIENTS_TO_ARCHIVE) {
      const existingClient = await db.select().from(clients)
        .where(
          and(
            eq(clients.firstName, clientInfo.firstName),
            eq(clients.lastName, clientInfo.lastName)
          )
        )
        .limit(1);
      
      if (existingClient.length === 0) {
        console.log(`⚠️  Client not found: ${clientInfo.firstName} ${clientInfo.lastName}`);
        notFoundCount++;
        continue;
      }
      
      const client = existingClient[0];
      
      try {
        await db.update(clients)
          .set({
            status: 'archived',
            updatedAt: new Date()
          })
          .where(eq(clients.id, client.id));
          
        console.log(`✅ Archived: ${client.firstName} ${client.lastName}`);
        archivedCount++;
      } catch (error) {
        console.error(`❌ Failed to archive ${client.firstName} ${client.lastName}:`, error);
      }
    }
    
    // Delete the test client
    console.log('\n🗑️  Deleting test client...');
    const testClient = await db.select().from(clients)
      .where(
        and(
          eq(clients.firstName, CLIENT_TO_DELETE.firstName),
          eq(clients.lastName, CLIENT_TO_DELETE.lastName)
        )
      )
      .limit(1);
    
    if (testClient.length > 0) {
      try {
        await db.delete(clients)
          .where(eq(clients.id, testClient[0].id));
          
        console.log(`✅ Deleted: ${CLIENT_TO_DELETE.firstName} ${CLIENT_TO_DELETE.lastName}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete ${CLIENT_TO_DELETE.firstName} ${CLIENT_TO_DELETE.lastName}:`, error);
      }
    } else {
      console.log(`⚠️  Test client not found: ${CLIENT_TO_DELETE.firstName} ${CLIENT_TO_DELETE.lastName}`);
    }
    
    console.log('\n📈 Archive & Delete Summary:');
    console.log(`📁 Clients Archived: ${archivedCount}`);
    console.log(`🗑️  Clients Deleted: ${deletedCount}`);
    console.log(`⚠️  Clients Not Found: ${notFoundCount}`);
    console.log(`📊 Total Operations: ${CLIENTS_TO_ARCHIVE.length + 1}`);
    
  } catch (error) {
    console.error('❌ Error during client archive/delete process:', error);
    process.exit(1);
  }
}

// Run the operations
archiveAndDeleteClients().then(() => {
  console.log('🎉 Client archive and deletion process completed successfully!');
  process.exit(0);
});