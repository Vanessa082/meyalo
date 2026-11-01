import { LegalPage } from '@/components/legal/legal-page';
import { termsOfUse } from '@/content/legal/terms';

export default function TermsScreen() {
  return <LegalPage document={termsOfUse} />;
}
