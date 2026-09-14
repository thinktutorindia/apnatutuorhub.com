import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import * as fs from 'fs';
import * as path from 'path';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = process.env.RESEND_FROM_EMAIL ?? 'ApnaTutorHub <noreply@mail.apnatutorhub.com>';

const htmlPath = path.join(__dirname, '../public/lead_email_preview.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

const RECIPIENTS = [
  { email: 'youhubteam@gmail.com',      name: 'Rohit Sharma'  },
  { email: 'thinktutorindia@gmail.com', name: 'Rahul Sir'     },
];

const SUBJECT = '🎯 New Tuition Inquiry Near You — Class 5th, Anand Niketan (#32202)';

async function sendTestEmails() {
  console.log(`\n📨 Sending lead notification email to ${RECIPIENTS.length} recipients…\n`);

  for (const recipient of RECIPIENTS) {
    // Personalise the greeting in the HTML
    const personalised = html.replace('Rohit Sharma', recipient.name);

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [recipient.email],
      subject: SUBJECT,
      html: personalised,
    });

    if (error) {
      console.error(`❌  Failed → ${recipient.email}`);
      console.error('   Error:', error.message);
    } else {
      console.log(`✅  Sent   → ${recipient.email}  (Resend ID: ${data?.id})`);
    }
  }

  console.log('\nDone.\n');
}

sendTestEmails().catch(console.error);
