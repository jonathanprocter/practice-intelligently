
import { db } from "./server/db";
import { clients } from "./shared/schema";

// Sample client data based on the dashboard information
const clientsData = [
  {
    firstName: "Jason",
    lastName: "Laskin",
    email: "jason.laskin@example.com",
    phone: "(555) 123-4567",
    dateOfBirth: new Date("1985-03-15"),
    therapistId: "therapist-1", // You'll need to replace this with actual therapist ID
    status: "active",
    address: {
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zipCode: "90210"
    },
    emergencyContact: {
      name: "Emergency Contact",
      phone: "(555) 987-6543",
      relationship: "spouse"
    }
  },
  // Add more clients as you provide their information
  {
    firstName: "Sample",
    lastName: "Client",
    email: "sample.client@example.com", 
    phone: "(555) 234-5678",
    dateOfBirth: new Date("1990-07-22"),
    therapistId: "therapist-1",
    status: "active",
    address: {
      street: "456 Oak Ave",
      city: "Somewhere",
      state: "NY", 
      zipCode: "10001"
    }
  }
];

async function populateClients() {
  try {
    console.log('Starting client population...');
    
    for (const clientData of clientsData) {
      const [existingClient] = await db
        .select()
        .from(clients)
        .where(eq(clients.email, clientData.email));
        
      if (!existingClient) {
        const [newClient] = await db
          .insert(clients)
          .values(clientData)
          .returning();
        console.log(`Created client: ${newClient.firstName} ${newClient.lastName}`);
      } else {
        console.log(`Client already exists: ${clientData.firstName} ${clientData.lastName}`);
      }
    }
    
    console.log('Client population completed successfully!');
  } catch (error) {
    console.error('Error populating clients:', error);
  }
}

// Run the script
populateClients();
