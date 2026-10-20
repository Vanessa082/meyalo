import { LegalPage } from '@/components/legal/legal-page';
import { deleteAccount } from '@/content/legal/delete-account';

export default function DeleteAccountScreen() {
  return <LegalPage document={deleteAccount} />;
}
