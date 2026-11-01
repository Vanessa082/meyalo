import type { LocalizedLegalDocument } from './types';

/**
 * Apple (5.1.1(v)) and Google Play require account deletion in the app and a
 * web page that explains it. Follows "Spec: accounts" in
 * docs/product-decisions.md. Bracketed placeholders and [UNVERIFIED: ...]
 * marks follow the same rule as privacy.ts: do not replace them with guesses.
 */
export const deleteAccount: LocalizedLegalDocument = {
  en: {
    title: 'Delete your account and data',
    intro:
      'An account on Meyalo is optional and only backs up your plans. This page explains how to delete it, what is deleted at once, and what is kept and for how long. It also explains how to remove data if you use Meyalo as a guest.',
    sections: [
      {
        heading: 'Delete your account in the app',
        blocks: [
          {
            kind: 'list',
            items: [
              'Open the You tab.',
              'Choose Privacy and notifications.',
              'Choose Delete my account, then confirm.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'The app says the account is deleted only once our server has confirmed it. If something goes wrong, you see an error, you stay signed in, and you can try again.',
          },
        ],
      },
      {
        heading: 'Delete your account on the website',
        blocks: [
          {
            kind: 'list',
            items: [
              'On this page, sign in with the same method you use in the app.',
              'Choose Delete my account, then confirm.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'If you cannot sign in, write to [CONTACT EMAIL] from the email address of your account with the subject "Delete my account". We may ask for information to confirm the request is yours, and we complete it within [RESPONSE TIME].',
          },
        ],
      },
      {
        heading: 'What is deleted at once',
        blocks: [
          {
            kind: 'list',
            items: [
              'Your sign-in methods (email code, Apple, Google) and your email address.',
              'Your name, if Apple or Google shared it.',
              'Your backed up discovery profile and plans.',
              'The consents linked to your account.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Reports and event suggestions you sent while signed in are unlinked from your account. They stay without any link to you until their normal period ends (see below). What you sent as a guest was never linked to an account.',
          },
        ],
      },
      {
        heading: 'What is kept, and for how long',
        blocks: [
          {
            kind: 'table',
            headers: ['Data', 'How long'],
            rows: [
              [
                'Deletion record: a one-way code made from your account’s internal number (it cannot be turned back into that number, and it is not your email), the time the account was created and deleted, the notice versions you agreed to, and whether the request came from the app or the website. Nothing in it says who you are.',
                '3 years, then removed automatically. [UNVERIFIED: the 3 years stand in for the limitation period for claims in Cameroon and have not been checked against the law text.]',
              ],
              [
                'Event reports, no longer linked to you',
                '12 months after they were sent',
              ],
              [
                'Event suggestions, no longer linked to you',
                '12 months after the decision to accept or refuse them',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'We keep the deletion record to be able to show that the account was deleted and which notice versions applied, if a question or complaint comes later.',
          },
          {
            kind: 'paragraph',
            text: '[UNVERIFIED: whether Law No. 2010/012, art. 46 (10-year retention) applies to Meyalo has not been checked against the published text.] [UNVERIFIED: how long our host’s backups keep a copy of deleted data.]',
          },
        ],
      },
      {
        heading: 'Your plans on your phone',
        blocks: [
          {
            kind: 'paragraph',
            text: 'After deletion, the phone you used signs out and keeps its plans as a guest. Another phone that was signed in to the same account shows "Your account was deleted. Your plans stay on this phone." To remove them, open You, then Privacy and notifications, then Clear data on this phone.',
          },
        ],
      },
      {
        heading: 'Accounts not used for 24 months',
        blocks: [
          {
            kind: 'paragraph',
            text: 'If you do not sign in for 24 months, we email you a warning. The account is deleted 30 days after that email unless you sign in, in the same way as described above. [NOT BUILT YET: this needs an email provider; until it is built, inactive accounts are kept.]',
          },
        ],
      },
      {
        heading: 'Using Meyalo as a guest',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Without an account there is no account to delete. Your profile, plans, notes and settings are only on your phone.',
          },
          {
            kind: 'list',
            items: [
              'In the app: open You, then Privacy and notifications, then Clear data on this phone.',
              'On the website: clear the site data for Meyalo in your browser settings.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Reports and event suggestions sent as a guest are stored on our server without your name. To ask for one to be deleted, write to [CONTACT EMAIL] with enough detail to find it (for example the event, the date and what you wrote, or your suggestion’s status link).',
          },
        ],
      },
      {
        heading: 'Curator accounts',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Curator accounts cannot be deleted from the app or this page. An administrator removes them. Curators who want their account removed write to [CONTACT EMAIL].',
          },
        ],
      },
      {
        heading: 'Questions',
        blocks: [
          {
            kind: 'paragraph',
            text: 'See the Privacy Policy for your rights under Cameroon Law No. 2024/017, or contact [CONTACT EMAIL].',
          },
        ],
      },
    ],
  },
  fr: {
    title: 'Supprimer votre compte et vos données',
    intro:
      'Un compte Meyalo est facultatif et sert seulement à sauvegarder vos plans. Cette page explique comment le supprimer, ce qui est supprimé aussitôt, et ce qui est gardé et combien de temps. Elle explique aussi comment effacer vos données si vous utilisez Meyalo en invité.',
    sections: [
      {
        heading: 'Supprimer votre compte dans l’application',
        blocks: [
          {
            kind: 'list',
            items: [
              'Ouvrez l’onglet Vous.',
              'Choisissez Confidentialité et notifications.',
              'Choisissez Supprimer mon compte, puis confirmez.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'L’application indique que le compte est supprimé seulement après la confirmation de notre serveur. En cas de problème, un message d’erreur s’affiche, vous restez connecté et vous pouvez réessayer.',
          },
        ],
      },
      {
        heading: 'Supprimer votre compte sur le site web',
        blocks: [
          {
            kind: 'list',
            items: [
              'Sur cette page, connectez-vous avec le même mode de connexion que dans l’application.',
              'Choisissez Supprimer mon compte, puis confirmez.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Si vous ne pouvez pas vous connecter, écrivez à [E-MAIL DE CONTACT] depuis l’adresse e-mail de votre compte avec l’objet « Supprimer mon compte ». Nous pouvons demander des informations pour vérifier que la demande vient bien de vous, et nous la traitons sous [DÉLAI DE RÉPONSE].',
          },
        ],
      },
      {
        heading: 'Ce qui est supprimé aussitôt',
        blocks: [
          {
            kind: 'list',
            items: [
              'Vos modes de connexion (code par e-mail, Apple, Google) et votre adresse e-mail.',
              'Votre nom, si Apple ou Google l’a transmis.',
              'Votre profil de découverte et vos plans sauvegardés.',
              'Les consentements liés à votre compte.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Les signalements et propositions d’événements envoyés en étant connecté ne sont plus liés à votre compte. Ils restent sans aucun lien avec vous jusqu’à la fin de leur durée normale (voir plus bas). Ce que vous avez envoyé en invité n’a jamais été lié à un compte.',
          },
        ],
      },
      {
        heading: 'Ce qui est gardé, et combien de temps',
        blocks: [
          {
            kind: 'table',
            headers: ['Donnée', 'Durée'],
            rows: [
              [
                'Trace de suppression : un code à sens unique calculé à partir du numéro interne de votre compte (on ne peut pas retrouver ce numéro à partir du code, et ce n’est pas votre e-mail), les dates de création et de suppression du compte, les versions des textes que vous avez acceptés, et si la demande venait de l’application ou du site web. Rien dans cette trace ne dit qui vous êtes.',
                '3 ans, puis effacée automatiquement. [NON VÉRIFIÉ : ces 3 ans remplacent le délai de prescription des actions au Cameroun et n’ont pas été vérifiés dans le texte de loi.]',
              ],
              [
                'Signalements, qui ne sont plus liés à vous',
                '12 mois après leur envoi',
              ],
              [
                'Propositions d’événements, qui ne sont plus liées à vous',
                '12 mois après la décision de les accepter ou de les refuser',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Nous gardons la trace de suppression pour pouvoir montrer que le compte a été supprimé et quelles versions des textes s’appliquaient, si une question ou une plainte arrive plus tard.',
          },
          {
            kind: 'paragraph',
            text: '[NON VÉRIFIÉ : l’application à Meyalo de la loi n° 2010/012, art. 46 (conservation de 10 ans) n’a pas été vérifiée dans le texte publié.] [NON VÉRIFIÉ : combien de temps les sauvegardes de notre hébergeur gardent une copie des données supprimées.]',
          },
        ],
      },
      {
        heading: 'Vos plans sur votre téléphone',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Après la suppression, le téléphone utilisé se déconnecte et garde ses plans en mode invité. Un autre téléphone connecté au même compte affiche « Votre compte a été supprimé. Vos plans restent sur ce téléphone. » Pour les effacer, ouvrez Vous, puis Confidentialité et notifications, puis Effacer les données de ce téléphone.',
          },
        ],
      },
      {
        heading: 'Comptes inutilisés pendant 24 mois',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Si vous ne vous connectez pas pendant 24 mois, nous vous envoyons un e-mail d’avertissement. Le compte est supprimé 30 jours après cet e-mail si vous ne vous reconnectez pas, de la même façon que décrit plus haut. [PAS ENCORE EN PLACE : il faut un service d’envoi d’e-mails ; d’ici là, les comptes inactifs sont conservés.]',
          },
        ],
      },
      {
        heading: 'Utiliser Meyalo en invité',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Sans compte, il n’y a aucun compte à supprimer. Votre profil, vos plans, vos notes et vos réglages sont uniquement sur votre téléphone.',
          },
          {
            kind: 'list',
            items: [
              'Dans l’application : ouvrez Vous, puis Confidentialité et notifications, puis Effacer les données de ce téléphone.',
              'Sur le site web : effacez les données du site Meyalo dans les réglages de votre navigateur.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Les signalements et propositions d’événements envoyés en invité sont conservés sur notre serveur sans votre nom. Pour en demander la suppression, écrivez à [E-MAIL DE CONTACT] avec assez de détails pour les retrouver (par exemple l’événement, la date et ce que vous avez écrit, ou le lien de suivi de votre proposition).',
          },
        ],
      },
      {
        heading: 'Comptes curateurs',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Les comptes curateurs ne peuvent pas être supprimés depuis l’application ni depuis cette page. Un administrateur les retire. Les curateurs qui veulent faire retirer leur compte écrivent à [E-MAIL DE CONTACT].',
          },
        ],
      },
      {
        heading: 'Questions',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Consultez la Politique de confidentialité pour vos droits selon la loi camerounaise n° 2024/017, ou écrivez à [E-MAIL DE CONTACT].',
          },
        ],
      },
    ],
  },
};
