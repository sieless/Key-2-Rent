
import { type Metadata } from 'next';
import { AboutClientPage } from './about-client-page';

export const metadata: Metadata = {
  title: 'About Timelaine',
  description: 'Learn about Timelaine, your number one source for finding rental properties in Machakos. Discover our mission and dedication to simplifying your housing search.',
};

export default function AboutPage() {
  return <AboutClientPage />;
}
