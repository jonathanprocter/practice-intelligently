#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { clients } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Client DOB information provided
const CLIENT_DOB_INFO = [
  {
    firstName: "Krista",
    lastName: "Flood",
    dateOfBirth: "2003-05-02"
  },
  {
    firstName: "Nick", 
    lastName: "Dabreu",
    dateOfBirth: "1990-09-02"
  },
  {
    firstName: "Steven",
    lastName: "Deluca", 
    dateOfBirth: "1996-09-08"
  },
  {
    firstName: "Sherrifa",
    lastName: "Hoosein",
    dateOfBirth: "1986-12-18"
  },
  {
    firstName: "Vivian",
    lastName: "Meador",
    dateOfBirth: "1962-04-23"
  },
  {
    firstName: "Scott",
    lastName: "Berger",
    dateOfBirth: "1994-12-02"
  },
  {
    firstName: "Billy",
    lastName: "Aymami",
    dateOfBirth: "1972-07-01"
  },
  {
    firstName: "Valentina",
    lastName: "Gjidoda",
    dateOfBirth: "1988-09-01"
  },
  {
    firstName: "Trendall",
    lastName: "Storey",
    dateOfBirth: "2006-06-13"
  },
  {
    firstName: "Zena",
    lastName: "Frey",
    dateOfBirth: "1959-09-16"
  },
  {
    firstName: "Tom",
    lastName: "Remy",
    dateOfBirth: "1988-05-09"
  },
  {
    firstName: "Susan",
    lastName: "Hannigan",
    dateOfBirth: "1990-07-04"
  }
];

async function updateClientDOB() {
  console.log('🔄 Starting client date of birth update process...');
  
  try {
    let updatesApplied = 0;
    let skippedAlreadyComplete = 0;
    let notFound = 0;
    
    for (const clientInfo of CLIENT_DOB_INFO) {
      // Find the client by first name and last name
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
        notFound++;
        continue;
      }
      
      const client = existingClient[0];
      
      // Check if DOB already exists
      if (client.dateOfBirth) {
        console.log(`✅ ${client.firstName} ${client.lastName} already has DOB: ${client.dateOfBirth.toDateString()}`);
        skippedAlreadyComplete++;
        continue;
      }
      
      // Update the client with DOB
      try {
        await db.update(clients)
          .set({
            dateOfBirth: new Date(clientInfo.dateOfBirth),
            updatedAt: new Date()
          })
          .where(eq(clients.id, client.id));
          
        console.log(`✅ Updated ${client.firstName} ${client.lastName} with DOB: ${clientInfo.dateOfBirth}`);
        updatesApplied++;
      } catch (error) {
        console.error(`❌ Failed to update ${client.firstName} ${client.lastName}:`, error);
      }
    }
    
    console.log('\n📈 DOB Update Summary:');
    console.log(`✅ DOB Updates Applied: ${updatesApplied}`);
    console.log(`⏭️  Already Had DOB: ${skippedAlreadyComplete}`);
    console.log(`⚠️  Clients Not Found: ${notFound}`);
    console.log(`📊 Total Clients Processed: ${CLIENT_DOB_INFO.length}`);
    
  } catch (error) {
    console.error('❌ Error during client DOB update process:', error);
    process.exit(1);
  }
}

// Run the update
updateClientDOB().then(() => {
  console.log('🎉 Client date of birth update completed successfully!');
  process.exit(0);
});