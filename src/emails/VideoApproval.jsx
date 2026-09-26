import {
  Body, Container, Head, Heading, Html, Img, Link, Preview,
  Section, Text, Tailwind, Row, Column, Button,
} from '@react-email/components';
import * as React from 'react';

const LOGO_URL = 'https://everestmotoring.co.za/images/logo.png';

const brandConfig = {
  theme: { extend: { colors: {
    primary: '#ffff01', 'primary-dark': '#e6e600', secondary: '#000000',
  } } },
};

export const VideoApprovalEmail = ({
  carLabel = '2021 Toyota Fortuner 2.8 GD-6',
  priceLabel = 'R 549 900',
  thumbnailUrl = 'https://placehold.co/520x293/jpg?text=Walkaround+Video+Still',
  videoWatchUrl = 'https://everestmotoring.co.za/video-preview',
  approveUrl = 'https://everestmotoring.co.za/video/approve',
  rejectUrl = 'https://everestmotoring.co.za/video/reject',
  scheduleNote = 'Approve today and both posts go out tomorrow: reel at 11:00, full walkthrough at 16:00.',
}) => {
  return (
    <Html>
      <Tailwind config={brandConfig}>
        <Head />
        <Preview>Walkaround video ready for approval: {carLabel}</Preview>
        <Body className="bg-neutral-100 font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <Container width="600" className="mx-auto my-10 w-[600px] max-w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <Section><Row><Column className="bg-secondary py-[32px] text-center border-b-4 border-primary">
              <Img src={LOGO_URL} width="170" height="auto" alt="Everest Motoring" className="mx-auto" align="center" />
              <Text className="text-primary text-xs font-bold uppercase tracking-[0.2em] mt-3 m-0">Internal Notification</Text>
            </Column></Row></Section>

            <Section><Row><Column className="px-[40px] py-[40px]">
              <Heading className="text-xl font-bold text-secondary m-0 mb-4">Walkaround video ready for approval</Heading>

              <Text className="text-base text-neutral-900 m-0">
                <strong>{carLabel}</strong>
              </Text>
              <Text className="text-lg font-bold text-neutral-900 m-0 mb-6">{priceLabel}</Text>

              <Link href={videoWatchUrl} className="block">
                <Img src={thumbnailUrl} width="520" height="auto" alt={`${carLabel} walkaround video thumbnail`} className="rounded-xl border border-neutral-200 mx-auto" align="center" />
              </Link>
              <Text className="text-center text-xs text-neutral-500 mt-2 m-0">
                <Link href={videoWatchUrl} className="text-neutral-500">Watch the full video</Link>
              </Text>

              <Text className="text-neutral-700 text-sm leading-6 mt-6 m-0">
                The photo-and-specs post is already scheduled — this approval controls only the two video posts.
              </Text>

              <Row className="mt-6">
                <Column className="pr-2">
                  <Button href={approveUrl} className="bg-primary text-black font-bold py-4 px-8 rounded-lg">
                    Approve &amp; schedule
                  </Button>
                </Column>
                <Column className="pl-2">
                  <Button href={rejectUrl} className="bg-neutral-200 text-neutral-700 font-bold py-4 px-8 rounded-lg">
                    Reject
                  </Button>
                </Column>
              </Row>

              <Text className="text-neutral-400 text-xs mt-10 m-0">
                {scheduleNote} Both links open a confirmation page — nothing is posted until you confirm there.
              </Text>
            </Column></Row></Section>

            <Section><Row><Column className="bg-secondary py-[32px] px-[32px] text-center">
              <Text className="text-primary font-bold text-sm m-0 mb-1">EVEREST MOTORING</Text>
              <Text className="text-neutral-400 text-sm m-0">White River, Mpumalanga</Text>
              <Text className="text-neutral-400 text-sm m-0 mt-2">013 854 0600 • info@everestmotoring.co.za</Text>
              <Text className="text-neutral-400 text-sm m-0">everestmotoring.co.za</Text>
            </Column></Row></Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VideoApprovalEmail;