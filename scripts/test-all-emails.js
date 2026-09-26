import { sendEmail } from '../src/lib/resend.js';
import { NewsletterEmail } from '../src/emails/Newsletter.jsx';
import { WelcomeEmail } from '../src/emails/WelcomeEmail.jsx';
import { AffiliateMediaKit } from '../src/emails/AffiliateMediaKit.jsx';
import { OneMonthFollowupEmail } from '../src/emails/1MonthFollowup.jsx';
import { ThreeYearTradeInEmail } from '../src/emails/3YearTradeIn.jsx';
import { OneYearEmail } from '../src/emails/OneYearEmail.jsx';
import { SystemNotificationEmail } from '../src/emails/SystemNotification.jsx';
import React from 'react';

const testTemplates = async () => {
  const testEmail = 'alecsomers1980@gmail.com';

  console.log('--- Everest Motoring Comprehensive Email Test ---');

  const emails = [
    {
      name: 'Newsletter',
      subject: 'v3 - Monthly Showroom Highlights | Everest Motoring',
      react: React.createElement(NewsletterEmail),
    },
    {
      name: 'Welcome',
      subject: 'v3 - Welcome to Everest Motoring!',
      react: React.createElement(WelcomeEmail, { customerName: 'Alec' }),
    },
    {
      name: 'Affiliate Media Kit',
      subject: 'v3 - New Media Kit: Toyota Hilux 2024',
      react: React.createElement(AffiliateMediaKit),
    },
    {
      name: '1-Month Follow-up',
      subject: 'v3 - How is your new Toyota Fortuner?',
      react: React.createElement(OneMonthFollowupEmail, { customerName: 'Alec' }),
    },
    {
      name: '3-Year Trade-in',
      subject: 'v3 - Exclusive Upgrade Offer for your 2021 Toyota Hilux',
      react: React.createElement(ThreeYearTradeInEmail, { customerName: 'Alec' }),
    },
    {
      name: '1-Year Anniversary',
      subject: 'v3 - Happy 1-Year Anniversary from Everest Motoring! 🎉',
      react: React.createElement(OneYearEmail, { customerName: 'Alec', vehicleModel: '2024 Toyota Hilux' }),
    },
    {
      name: 'System Notification',
      subject: 'v3 - New Finance Lead Received',
      react: React.createElement(SystemNotificationEmail),
    },
  ];

  for (const email of emails) {
    console.log(`Sending ${email.name} Test...`);
    const result = await sendEmail({
      to: testEmail,
      subject: email.subject,
      react: email.react,
    });
    if (!result.success) {
        console.error(`Failed to send ${email.name}:`, result.error);
    }
  }

  console.log('\n--- All test emails initiated. Check your inbox. ---');
};

testTemplates().catch(console.error);
