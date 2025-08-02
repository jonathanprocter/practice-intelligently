#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { clients } from '../shared/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Complete client contact information from SimplePractice
const CLIENT_CONTACT_INFO = [
  {
    name: "Billy Aymami",
    alternativeName: "William Aymami",
    phone: "(917) 495-9421",
    email: "waymami@yahoo.com"
  },
  {
    name: "Chris Balabanick",
    alternativeName: "Christopher Balabanick", 
    phone: "(516) 738-2550",
    email: "pattonswarrior0777@gmail.com"
  },
  {
    name: "Paul N. Benjamin",
    alternativeName: "Paul Benjamin",
    phone: "(516) 297-7877",
    email: "ssb95@aol.com"
  },
  {
    name: "John Best",
    phone: "(646) 208-3202",
    email: "bestjm@gmail.com"
  },
  {
    name: "Nick Bonomi",
    alternativeName: "Nicholas Bonomi",
    phone: "(516) 816-6064", 
    email: "nick.bonomi22@gmail.com"
  },
  {
    name: "Michael Bower",
    phone: "(516) 313-4616",
    email: "mlbower1234@gmail.com"
  },
  {
    name: "Brianna Brickman",
    phone: "(845) 826-2186",
    email: "bbrickman1@gmail.com"
  },
  {
    name: "Mary Camarano", 
    phone: "(516) 361-6960",
    email: "mekc92016@gmail.com"
  },
  {
    name: "Amberly Comeau",
    phone: "(516) 506-2821",
    email: "afcomeau925@hotmail.com"
  },
  {
    name: "Michael Cserenyi",
    phone: "(631) 449-0268",
    alternatePhone: "(347) 821-8748",
    email: "Kiuorno22@gmail.com",
    alternateEmail: "Mcserenyi90@gmail.com"
  },
  {
    name: "Nick Dabreu",
    phone: "(631) 793-5564",
    email: "nick.dabreu@gmail.com"
  },
  {
    name: "Maryellen Dankenbrink",
    phone: "(516) 428-2797",
    email: "Maryellendankenbrink@gmail.com"
  },
  {
    name: "Bob Delmond",
    alternativeName: "Robert Delmond",
    phone: "(516) 313-3962",
    email: "mikenbob1@gmail.com"
  },
  {
    name: "Steven Deluca",
    phone: "(516) 477-1539",
    email: "sdeluca25@yahoo.com"
  },
  {
    name: "Ken Doyle",
    alternativeName: "Kenneth Doyle",
    phone: "(516) 263-9242",
    email: "kenjdoyleii@gmail.com"
  },
  {
    name: "Caitlin Dunn",
    phone: "(516) 761-7775", 
    email: "caitlindunn0721@gmail.com"
  },
  {
    name: "Gavin Fisch",
    phone: "(631) 383-5781",
    email: "gavindfisch@gmail.com"
  },
  {
    name: "Krista Flood",
    phone: "(516) 468-0508",
    email: "Krista.flood1@gmail.com"
  },
  {
    name: "Karen Foster",
    phone: "(646) 642-7582",
    email: "karendenise93@gmail.com"
  },
  {
    name: "Zena Frey",
    phone: "(516) 368-5468",
    email: "Zena@ZenaFrey.com"
  },
  {
    name: "James Fusco",
    phone: "(516) 459-5960"
  },
  {
    name: "Valentina Gjidoda",
    phone: "(914) 299-9442",
    email: "vgjidoda@gmail.com"
  },
  {
    name: "David Grossman",
    phone: "(516) 521-8497",
    email: "david100@optonline.net"
  },
  {
    name: "Nancy Grossman",
    phone: "(516) 521-7672",
    email: "nancy100@optonline.net"
  },
  {
    name: "Carlos F. Guerra",
    alternativeName: "Carlos Guerra",
    phone: "(347) 777-8930",
    email: "solrac819@yahoo.com"
  },
  {
    name: "Max Hafker",
    phone: "(516) 416-1974",
    email: "hafkermax@gmail.com"
  },
  {
    name: "Susan Hannigan",
    phone: "(516) 567-5710",
    email: "susanhanniganrn@gmail.com"
  },
  {
    name: "Richie Hayes",
    alternativeName: "Richard Hayes",
    phone: "(516) 526-0206",
    email: "richiehayesboe@hotmail.com"
  },
  {
    name: "Calvin Hill",
    phone: "(917) 675-0749",
    email: "hillcalvin337@yahoo.com"
  },
  {
    name: "Sherrifa Hoosein",
    phone: "(347) 624-2820",
    email: "sherrifa.hoosein@gmail.com"
  },
  {
    name: "Nick Jurios",
    alternativeName: "Niko Jurios",
    phone: "(917) 435-9630",
    email: "nick.jurios@gmail.com"
  },
  {
    name: "Bill Kanellis",
    alternativeName: "Vasilios Kanellis",
    phone: "(516) 343-0193",
    email: "kanellisvasilios@protonmail.com"
  },
  {
    name: "Luke Knox",
    phone: "(719) 338-6884",
    email: "lukeknoxfilms@gmail.com"
  },
  {
    name: "Brian Kolsch",
    phone: "(516) 238-5709",
    alternatePhone: "(516) 931-3535",
    email: "kk208@MSN.COM",
    alternateEmail: "bkolsch217@gmail.com"
  },
  {
    name: "Kieran Kriss",
    phone: "(516) 672-7632",
    email: "kierankriss@gmail.com"
  },
  {
    name: "Jason Laskin",
    phone: "(516) 728-2966",
    email: "jasonlaskin@optimum.net"
  },
  {
    name: "Owen Lennon",
    phone: "(516) 757-3268",
    email: "Olennon2006@outlook.com"
  },
  {
    name: "Nico Luppino",
    phone: "(516) 939-7577",
    email: "nicoluppino@gmail.com"
  },
  {
    name: "Matt Paccione",
    alternativeName: "Matthew Paccione",
    phone: "(516) 369-3505",
    email: "mpaccione10@aol.com",
    alternateEmail: "Mpaccione10@gmail.com"
  },
  {
    name: "Jennifer McNally",
    phone: "(516) 509-3484",
    email: "jennifermcnally11@gmail.com"
  },
  {
    name: "Vivian Meador",
    phone: "(304) 222-7667",
    email: "meadorve@yahoo.com"
  },
  {
    name: "Hector E. Mendez",
    alternativeName: "Hector Mendez",
    phone: "(201) 736-2966",
    email: "hector.e.mendez@gmail.com"
  },
  {
    name: "Matt Michelson",
    alternativeName: "Matthew Michelson",
    phone: "(516) 606-0689",
    email: "mattmichelson1@gmail.com"
  },
  {
    name: "Max Moskowitz",
    phone: "(516) 710-0573",
    email: "moskowitzemax@gmail.com"
  },
  {
    name: "Ava Moskowitz",
    phone: "(516) 375-2966",
    email: "ava.moskowitz@gmail.com"
  },
  {
    name: "Michael Neira",
    phone: "(516) 469-6407",
    email: "michaelneira94@gmail.com"
  },
  {
    name: "Gavin Perna",
    phone: "(304) 550-9281",
    email: "gavinperna@gmail.com"
  },
  {
    name: "Sarah Palladino",
    phone: "(631) 901-8200",
    email: "sapalladino1@gmail.com"
  },
  {
    name: "Kristi Rook",
    phone: "(480) 737-6666",
    email: "Kristirook10@gmail.com"
  },
  {
    name: "Angelica Ruden",
    phone: "(516) 512-0033",
    email: "arudenn@gmail.com"
  },
  {
    name: "Jordano Sanchez",
    phone: "(917) 331-2921",
    email: "jordanosanchez@gmail.com"
  },
  {
    name: "Dan Settle",
    phone: "(516) 253-9244",
    email: "Dfs9925@yahoo.com"
  },
  {
    name: "Noah Silverman",
    phone: "(516) 697-2997",
    email: "jen1971@gmail.com",
    alternateEmail: "noahs1stemail@gmail.com"
  },
  {
    name: "Ruben Spilberg",
    phone: "(516) 578-5118",
    email: "rspilberg118@gmail.com"
  },
  {
    name: "Trendall Storey",
    phone: "(516) 987-9787",
    email: "tracys1979@gmail.com"
  },
  {
    name: "Sarah Thomas",
    phone: "(516) 640-0738",
    email: "sarah8thomas@gmail.com"
  },
  {
    name: "Jaquan Williams",
    phone: "(646) 245-1762",
    email: "jaquanwilliamsnyc@gmail.com"
  },
  {
    name: "James Wright",
    phone: "(516) 972-4205"
  },
  {
    name: "Meera Zucker",
    phone: "(216) 650-3274",
    email: "meerazucker@gmail.com"
  },
  {
    name: "Freddy Rodriguez",
    phone: "(516) 425-6528",
    email: "fjrodriguez85@gmail.com"
  }
];

function findContactInfo(firstName: string, lastName: string) {
  const fullName = `${firstName} ${lastName}`;
  
  // Try exact match first
  let contactInfo = CLIENT_CONTACT_INFO.find(client => 
    client.name.toLowerCase() === fullName.toLowerCase()
  );
  
  // Try alternative name match
  if (!contactInfo) {
    contactInfo = CLIENT_CONTACT_INFO.find(client => 
      client.alternativeName?.toLowerCase() === fullName.toLowerCase()
    );
  }
  
  // Try partial matches (first name + last name)
  if (!contactInfo) {
    contactInfo = CLIENT_CONTACT_INFO.find(client => {
      const [clientFirst, ...clientLastParts] = client.name.split(' ');
      const clientLast = clientLastParts.join(' ');
      return clientFirst.toLowerCase() === firstName.toLowerCase() && 
             clientLast.toLowerCase() === lastName.toLowerCase();
    });
  }
  
  return contactInfo;
}

async function updateClientInfo() {
  console.log('🔄 Starting client information update process...');
  
  try {
    // Get all clients
    const allClients = await db.select().from(clients);
    console.log(`📊 Found ${allClients.length} clients in database`);
    
    let updatesApplied = 0;
    let skippedAlreadyComplete = 0;
    let notFoundInContactList = 0;
    
    for (const client of allClients) {
      const contactInfo = findContactInfo(client.firstName, client.lastName);
      
      if (!contactInfo) {
        console.log(`⚠️  No contact info found for: ${client.firstName} ${client.lastName}`);
        notFoundInContactList++;
        continue;
      }
      
      // Check what updates are needed
      const updates: any = {};
      let needsUpdate = false;
      
      // Update phone if missing
      if (!client.phone && contactInfo.phone) {
        updates.phone = contactInfo.phone;
        needsUpdate = true;
      }
      
      // Update alternate phone if missing
      if (!client.alternatePhone && contactInfo.alternatePhone) {
        updates.alternatePhone = contactInfo.alternatePhone;
        needsUpdate = true;
      }
      
      // Update email if missing
      if (!client.email && contactInfo.email) {
        updates.email = contactInfo.email;
        needsUpdate = true;
      }
      
      if (!needsUpdate) {
        console.log(`✅ ${client.firstName} ${client.lastName} already has complete contact info`);
        skippedAlreadyComplete++;
        continue;
      }
      
      // Apply updates
      try {
        await db.update(clients)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(clients.id, client.id));
          
        console.log(`✅ Updated ${client.firstName} ${client.lastName}:`, updates);
        updatesApplied++;
      } catch (error) {
        console.error(`❌ Failed to update ${client.firstName} ${client.lastName}:`, error);
      }
    }
    
    console.log('\n📈 Update Summary:');
    console.log(`✅ Updates Applied: ${updatesApplied}`);
    console.log(`⏭️  Already Complete: ${skippedAlreadyComplete}`);
    console.log(`⚠️  Not Found in Contact List: ${notFoundInContactList}`);
    console.log(`📊 Total Clients Processed: ${allClients.length}`);
    
  } catch (error) {
    console.error('❌ Error during client update process:', error);
    process.exit(1);
  }
}

// Run the update
updateClientInfo().then(() => {
  console.log('🎉 Client information update completed successfully!');
  process.exit(0);
});