
import { type Metadata } from 'next';
import { ContactClientPage } from './contact-client-page';

export const metadata: Metadata = {
  title: 'Contact Timelaine',
  description: 'Get in touch with the Timelaine team. Contact us via phone, email, or visit our office in Machakos for any inquiries or support.',
};

export default function ContactPage() {
    return <ContactClientPage />
}
