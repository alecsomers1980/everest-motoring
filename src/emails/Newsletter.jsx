import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
  Row,
  Column,
  Button,
} from '@react-email/components';
import * as React from 'react';

const LOGO_URL = 'https://everestmotoring.co.za/images/logo.png';

const brandConfig = {
  theme: {
    extend: {
      colors: {
        primary: '#ffff01',
        'primary-dark': '#e6e600',
        secondary: '#000000',
      },
    },
  },
};

export const NewsletterEmail = ({
  // Editable each month — written to encourage clients to get in touch.
  welcomeText = "Welcome to this month's edition from the Everest Motoring family! Our showroom is busier than ever, and we've hand-picked some exceptional vehicles just for you. Whether you're upgrading, trading in, or buying your first car, our team is ready to make it effortless — give us a call or pop in for a no-pressure chat. The right car is waiting.",
  tips = [
    'Buying pre-owned? Always ask for the full service history — a well-documented car holds its value and tells you exactly how it was cared for.',
    'Get pre-approved for finance before you shop. Knowing your budget upfront means you can drive away in the right car, faster.',
  ],
  featuredVehicle = {
    make: 'Toyota',
    model: 'Fortuner 2.8GD-6',
    year: '2023',
    price: 'R 749,900',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
  },
  newArrivals = [
    { id: 1, name: 'VW Polo GTI', price: 'R 429,000', image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=400' },
    { id: 2, name: 'BMW 320i M-Sport', price: 'R 585,000', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=400' },
  ],
}) => {
  return (
    <Html>
      <Tailwind config={brandConfig}>
        <Head />
        <Preview>This month's premium arrivals at Everest Motoring</Preview>
        <Body className="bg-neutral-100 font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <Container width="600" className="mx-auto my-6 w-[600px] max-w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {/* Header / Logo */}
            <Section>
              <Row>
                <Column className="bg-secondary py-[32px] text-center border-b-4 border-primary">
                  <Img src={LOGO_URL} width="170" height="auto" alt="Everest Motoring" className="mx-auto" align="center" />
                  <Text className="text-primary text-xs font-bold uppercase tracking-[0.2em] mt-3 m-0">
                    Monthly Newsletter
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Editable monthly welcome */}
            <Section>
              <Row>
                <Column className="px-[40px] pt-[40px] pb-[24px]">
                  <Heading className="text-2xl font-bold text-neutral-900 m-0 mb-3">A note from the team</Heading>
                  <Text className="text-neutral-600 leading-relaxed m-0 mb-6">{welcomeText}</Text>
                  <Section>
                    <Row>
                      <Column className="text-center">
                        <Button className="bg-primary text-black font-bold py-3 px-8 rounded-lg" href="https://everestmotoring.co.za/contact">
                          Chat to Our Team
                        </Button>
                      </Column>
                    </Row>
                  </Section>
                </Column>
              </Row>
            </Section>

            {/* Hero / Showroom Highlight */}
            <Section>
              <Row>
                <Column className="px-[40px] pb-[24px] border-t border-neutral-200 pt-[32px]">
                  <Heading as="h2" className="text-lg font-bold text-neutral-900 uppercase tracking-wider m-0 mb-4">
                    Showroom Highlight
                  </Heading>
                  <Img
                    src={featuredVehicle.image}
                    width="520"
                    height="290"
                    alt={featuredVehicle.model}
                    className="rounded-xl object-cover w-full h-auto mb-4"
                  />
                  <Heading as="h3" className="text-xl font-bold text-neutral-900 m-0">
                    {featuredVehicle.year} {featuredVehicle.make} {featuredVehicle.model}
                  </Heading>
                  <Text className="text-neutral-900 text-2xl font-bold my-2">{featuredVehicle.price}</Text>
                  <Section>
                    <Row>
                      <Column className="text-center mt-2">
                        <Button className="bg-secondary text-primary font-bold py-3 px-8 rounded-lg" href="https://everestmotoring.co.za/inventory">
                          View Full Specifications
                        </Button>
                      </Column>
                    </Row>
                  </Section>
                </Column>
              </Row>
            </Section>

            {/* New Arrivals */}
            <Section>
              <Row>
                <Column className="bg-neutral-50 px-[40px] py-[32px] border-t border-neutral-200">
                  <Heading as="h3" className="text-lg font-bold text-neutral-900 uppercase tracking-wider m-0 mb-4">
                    New Arrivals
                  </Heading>
                  <Row>
                    {newArrivals.map((car) => (
                      <Column key={car.id} className="w-1/2 px-2 align-top">
                        <Section>
                          <Row>
                            <Column className="bg-white border border-neutral-200 rounded-xl p-[12px]">
                              {car.image && (
                                <Img src={car.image} width="230" height="120" alt={car.name} className="rounded-lg object-cover w-full h-auto mb-3" />
                              )}
                              <Text className="font-bold text-neutral-900 text-sm m-0">{car.name}</Text>
                              <Text className="text-neutral-700 font-bold text-sm m-0 mb-1">{car.price}</Text>
                              <Link href="https://everestmotoring.co.za/inventory" className="text-neutral-900 text-xs font-bold underline">
                                View Details →
                              </Link>
                            </Column>
                          </Row>
                        </Section>
                      </Column>
                    ))}
                  </Row>
                </Column>
              </Row>
            </Section>

            {/* Niche tips */}
            <Section>
              <Row>
                <Column className="px-[40px] py-[32px] border-t border-neutral-200">
                  <Heading as="h3" className="text-lg font-bold text-neutral-900 uppercase tracking-wider m-0 mb-4">
                    Smart Buyer Tips
                  </Heading>
                  {tips.map((tip, idx) => (
                    <Section key={idx}>
                      <Row>
                        <Column className="border-l-4 border-primary bg-neutral-50 rounded-r-lg px-[16px] py-[12px] mb-3">
                          <Text className="text-neutral-700 text-sm leading-relaxed m-0">💡 {tip}</Text>
                        </Column>
                      </Row>
                    </Section>
                  ))}
                </Column>
              </Row>
            </Section>

            {/* Footer */}
            <Section>
              <Row>
                <Column className="bg-secondary py-[32px] px-[32px] text-center">
                  <Text className="text-primary font-bold text-sm m-0 mb-1">EVEREST MOTORING</Text>
                  <Text className="text-neutral-400 text-sm m-0">White River, Mpumalanga</Text>
                  <Text className="text-neutral-400 text-sm m-0 mt-2">013 854 0600 • info@everestmotoring.co.za</Text>
                  <Text className="text-neutral-400 text-sm m-0">everestmotoring.co.za</Text>
                  <Text className="text-neutral-500 text-xs mt-4 m-0">
                    You are receiving this because you subscribed to our communications.
                    <br />
                    <Link href="#" className="text-primary underline">Unsubscribe</Link>
                  </Text>
                </Column>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default NewsletterEmail;
