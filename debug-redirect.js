// Debug redirect URI issue
import { OAuth2Client } from 'google-auth-library';

console.log('=== Environment Variables ===');
console.log('REPLIT_DEV_DOMAIN:', process.env.REPLIT_DEV_DOMAIN);
console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
console.log('REPL_SLUG:', process.env.REPL_SLUG);
console.log('REPLIT_SLUG:', process.env.REPLIT_SLUG);

const getRedirectUri = () => {
  if (process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
    return `https://${domain}/api/auth/google/callback`;
  }
  return 'http://localhost:5000/api/auth/google/callback';
};

const redirectUri = getRedirectUri();
console.log('\n=== Redirect URI Logic ===');
console.log('Generated Redirect URI:', redirectUri);
console.log('URI Length:', redirectUri.length);
console.log('URI encoded:', encodeURIComponent(redirectUri));

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  prompt: 'consent'
});

console.log('\n=== Generated OAuth URL ===');
const urlObj = new URL(url);
console.log('Full redirect_uri parameter:', urlObj.searchParams.get('redirect_uri'));