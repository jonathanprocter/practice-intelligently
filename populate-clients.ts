
import { db } from "./server/db";
import { clients } from "./shared/schema";
import { eq } from "drizzle-orm";

// Sample client data based on the dashboard information
const clientsData = [
  {
    firstName: "Jason",
    lastName: "Laskin",
    email: "jason.laskin@example.com",
    phone: "(555) 123-4567",
    dateOfBirth: new Date("1985-03-15"),
    therapistId: "therapist-1", // You'll need to replace this with actual therapist ID
    status: "active" as const,
    address: {
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zipCode: "90210"
    },
    emergencyContact: {
      name: "Sarah Laskin",
      phone: "(555) 987-6543",
      relationship: "spouse"
    }
  },
  {
    firstName: "Maria",
    lastName: "Rodriguez",
    email: "maria.rodriguez@example.com", 
    phone: "(555) 234-5678",
    dateOfBirth: new Date("1992-08-14"),
    therapistId: "therapist-1",
    status: "active" as const,
    address: {
      street: "456 Oak Ave",
      city: "Springfield",
      state: "NY", 
      zipCode: "10001"
    },
    emergencyContact: {
      name: "Carlos Rodriguez",
      phone: "(555) 876-5432",
      relationship: "brother"
    }
  },
  {
    firstName: "David",
    lastName: "Chen",
    email: "david.chen@example.com",
    phone: "(555) 345-6789",
    dateOfBirth: new Date("1988-12-03"),
    therapistId: "therapist-1",
    status: "active" as const,
    address: {
      street: "789 Pine St",
      city: "Riverside",
      state: "CA",
      zipCode: "92501"
    },
    emergencyContact: {
      name: "Linda Chen",
      phone: "(555) 765-4321",
      relationship: "mother"
    }
  },
  {
    firstName: "Emily",
    lastName: "Johnson",
    email: "emily.johnson@example.com",
    phone: "(555) 456-7890",
    dateOfBirth: new Date("1995-05-28"),
    therapistId: "therapist-1",
    status: "active" as const,
    address: {
      street: "321 Elm St",
      city: "Lakewood",
      state: "FL",
      zipCode: "33701"
    },
    emergencyContact: {
      name: "Michael Johnson",
      phone: "(555) 654-3210",
      relationship: "father"
    }
  },
  {
    firstName: "Robert",
    lastName: "Williams",
    email: "robert.williams@example.com",
    phone: "(555) 567-8901",
    dateOfBirth: new Date("1980-09-17"),
    therapistId: "therapist-1",
    status: "active" as const,
    address: {
      street: "654 Maple Ave",
      city: "Portland",
      state: "OR",
      zipCode: "97201"
    },
    emergencyContact: {
      name: "Jennifer Williams",
      phone: "(555) 543-2109",
      relationship: "spouse"
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
