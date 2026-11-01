import { LegalPage } from '@/components/legal/legal-page';
import { privacyPolicy } from '@/content/legal/privacy';

export default function PrivacyScreen() {
  return <LegalPage document={privacyPolicy} />;
}
