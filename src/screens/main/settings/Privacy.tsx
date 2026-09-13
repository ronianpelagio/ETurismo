import React from 'react';
import LegalDocument, { LegalSection } from '../../../features/settings/components/LegalDocument';

const SECTIONS: LegalSection[] = [
  {
    title: 'Introduction',
    body: 'eTorismo ("we", "our", or "us") operates the eTorismo application. This policy explains the collection, use, and disclosure of personal data when you use our service and the choices associated with that data.',
  },
  {
    title: 'Information collection and use',
    body: 'We collect several types of information to provide and improve the service. This may include personal data such as your name, email address, and phone number; usage data such as browser type, IP address, and pages visited; and device data such as device model, operating system, and unique identifiers.',
  },
  {
    title: 'Use of data',
    body: 'eTorismo uses collected data to provide and maintain the service, notify you about changes, support interactive features, provide customer care, improve the service through analysis, monitor usage, and detect, prevent, and address technical or security issues.',
  },
  {
    title: 'Security of data',
    body: 'The security of your data is important to us, but no method of internet transmission or electronic storage is completely secure. While we strive to use commercially acceptable means to protect personal data, we cannot guarantee absolute security.',
  },
  {
    title: 'Contact us',
    body: 'If you have questions about this privacy policy, contact us at privacy@etorismo.com.',
  },
];

export default function Privacy({ navigation }: any) {
  return <LegalDocument navigation={navigation} title="Privacy Policy" eyebrow="YOUR INFORMATION"
    headline="Privacy, explained clearly" updated="May 2026" icon="lock-closed-outline" sections={SECTIONS} />;
}
