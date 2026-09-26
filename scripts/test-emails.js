import { sendEmail } from '../src/lib/resend.js';
import { NewsletterEmail } from '../src/emails/Newsletter.jsx';
import { WelcomeEmail } from '../src/emails/WelcomeEmail.jsx';
import { AffiliateMediaKit } from '../src/emails/AffiliateMediaKit.jsx';
import React from 'react';

const testTemplates = async () => {
  const testEmail = 'alecsomers1980@gmail.com'; // Change to user's email if needed

  console.log('--- Everest Motoring Email Test ---');

  // Test Newsletter
  console.log('Sending Newsletter Test...');
  await sendEmail({
    to: testEmail,
    subject: 'Monthly Showroom Highlights | Everest Motoring',
    react: React.createElement(NewsletterEmail),
  });

  // Test Welcome
  console.log('Sending Welcome Test...');
  await sendEmail({
    to: testEmail,
    subject: 'Welcome to Everest Motoring!',
    react: React.createElement(WelcomeEmail, { customerName: 'Alec' }),
  });

  // Test Affiliate
  console.log('Sending Affiliate Test...');
  await sendEmail({
    to: testEmail,
    subject: 'New Media Kit: Toyota Hilux 2024',
    react: React.createElement(AffiliateMediaKit),
  });

  console.log('Test emails initiated. Check your inbox/Resend dashboard.');
};

testTemplates().catch(console.error);
