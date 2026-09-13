import React from 'react';
import LegalDocument, { LegalSection } from '../../../features/settings/components/LegalDocument';

const SECTIONS: LegalSection[] = [
  {
    title: 'Acceptance of terms',
    body: 'By accessing and using the eTorismo application, you accept and agree to be bound by the terms and provisions of this agreement.',
  },
  {
    title: 'Use license',
    body: 'Permission is granted to temporarily download one copy of eTorismo materials for personal, non-commercial viewing. This is a license, not a transfer of title. You may not modify or copy materials, use them commercially, reverse engineer application software, or remove copyright or proprietary notices.',
  },
  {
    title: 'Disclaimer',
    body: "Materials in the eTorismo application are provided on an 'as is' basis. eTorismo disclaims expressed or implied warranties, including merchantability, fitness for a particular purpose, non-infringement, or other violation of rights.",
  },
  {
    title: 'Limitations',
    body: "eTorismo and its suppliers shall not be liable for damages, including loss of data or profit or business interruption, arising from use of or inability to use materials in the eTorismo application.",
  },
  {
    title: 'Accuracy of materials',
    body: 'Materials in the eTorismo application may include technical, typographical, or photographic errors. eTorismo does not warrant that application materials are accurate, complete, or current.',
  },
];

export default function Terms({ navigation }: any) {
  return <LegalDocument navigation={navigation} title="Terms & Conditions" eyebrow="USING ETURISMO"
    headline="A respectful way to explore" updated="May 2026" icon="document-text-outline" sections={SECTIONS} />;
}
