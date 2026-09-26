import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text, Tailwind, Button, Row, Column,
} from '@react-email/components';
import * as React from 'react';

const LOGO_URL = 'https://everestmotoring.co.za/images/logo.png';

const brandConfig = {
  theme: { extend: { colors: { primary: '#ffff01', 'primary-dark': '#e6e600', secondary: '#000000' } } },
};

export const OneYearEmail = ({ customerName = 'Valued Client', vehicleModel = 'your vehicle' }) => {
  return (
    <Html>
      <Tailwind config={brandConfig}>
        <Head />
        <Preview>Happy 1-Year Anniversary from Everest Motoring! 🎉</Preview>
        <Body className="bg-neutral-100 font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <Container width="600" className="mx-auto my-10 w-[600px] max-w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {/* Header band */}
            <Section>
              <Row>
                <Column className="bg-secondary py-[32px] text-center border-b-4 border-primary">
                  <Img src={LOGO_URL} width="170" height="auto" alt="Everest Motoring" align="center" className="mx-auto" />
                </Column>
              </Row>
            </Section>

            {/* Intro */}
            <Section>
              <Row>
                <Column className="px-[40px] pt-[40px] pb-[16px] text-center">
                  <Heading className="text-3xl font-bold text-neutral-900 m-0 mb-4">Congratulations, {customerName}! 🎉</Heading>
                  <Text className="text-neutral-600 text-lg leading-relaxed m-0">
                    It's been one full year since you drove off in your {vehicleModel} from Everest Motoring. Thank you for trusting us and being part of the Everest family.
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Celebration image */}
            <Section>
              <Row>
                <Column className="px-[40px] pb-[24px]">
                  <Img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800" width="520" height="auto" alt="Your car, one year on" align="center" className="rounded-xl object-cover w-full h-auto mx-auto" />
                </Column>
              </Row>
            </Section>

            {/* Gift card */}
            <Section>
              <Row>
                <Column className="px-[40px] pb-[32px]">
                  <Section>
                    <Row>
                      <Column className="bg-neutral-50 border-2 border-dashed border-primary-dark rounded-xl px-[24px] py-[32px] text-center">
                        <Text className="text-neutral-500 font-bold text-xs uppercase tracking-[0.2em] m-0 mb-2">A Thank-You Gift For You</Text>
                        <Heading as="h2" className="text-2xl font-bold text-neutral-900 m-0 mb-3">A Complimentary Car Wash 🚗✨</Heading>
                        <Text className="text-neutral-600 m-0 mb-6">Pop in to the Everest Motoring dealership to claim your FREE car wash — celebrating one year on the road together.</Text>
                        <Button className="bg-primary text-black font-bold py-[16px] px-[32px] rounded-lg" href="https://everestmotoring.co.za/contact">Book Your Car Wash</Button>
                      </Column>
                    </Row>
                  </Section>
                </Column>
              </Row>
            </Section>

            {/* Small print */}
            <Section>
              <Row>
                <Column className="px-[40px] pb-[40px] text-center">
                  <Text className="text-neutral-400 text-xs m-0">Offer valid for 30 days. Please bring your ID when visiting.</Text>
                </Column>
              </Row>
            </Section>

            {/* Footer band */}
            <Section>
              <Row>
                <Column className="bg-secondary py-[32px] px-[32px] text-center">
                  <Text className="text-primary font-bold text-sm m-0 mb-1">EVEREST MOTORING</Text>
                  <Text className="text-neutral-400 text-sm m-0">White River, Mpumalanga</Text>
                  <Text className="text-neutral-400 text-sm m-0 mt-2">013 854 0600 • info@everestmotoring.co.za</Text>
                  <Text className="text-neutral-400 text-sm m-0">everestmotoring.co.za</Text>
                  <Text className="text-neutral-500 text-xs mt-4 m-0">You are receiving this because you subscribed to our communications.<br /><Link href="#" className="text-primary underline">Unsubscribe</Link></Text>
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OneYearEmail;
