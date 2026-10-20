import type { LocalizedLegalDocument } from './types';

/**
 * Drafted from what the app stores (supabase/migrations, the on-device stores)
 * and the decisions in docs/product-decisions.md ("Spec: accounts" and "Spec:
 * consent, privacy settings and notifications"). Written without a lawyer.
 * Bracketed placeholders are facts only the owner or a lawyer can supply, and
 * [UNVERIFIED: ...] marks a point not yet checked against the law text. Do not
 * replace either with guesses.
 */
export const privacyPolicy: LocalizedLegalDocument = {
  en: {
    title: 'Privacy Policy',
    intro:
      'Meyalo helps you discover growth events in Cameroon. You can use it as a guest, without an account. An account is optional: it only backs up your plans so you find them on another phone. This policy explains what data Meyalo handles, where it is kept, why, for how long, and the rights you have under Cameroon Law No. 2024/017 on the protection of personal data.',
    sections: [
      {
        heading: '1. Who is responsible',
        blocks: [
          {
            kind: 'paragraph',
            text: 'The data controller is [CONTROLLER NAME], [LEGAL FORM AND REGISTRATION NUMBER], [POSTAL ADDRESS], Cameroon.',
          },
          {
            kind: 'paragraph',
            text: 'Contact for any privacy question or request: [CONTACT EMAIL].',
          },
        ],
      },
      {
        heading: '2. What stays on your phone and what reaches our server',
        blocks: [
          {
            kind: 'table',
            headers: ['Data', 'Where it is kept', 'Sent to us'],
            rows: [
              [
                'Discovery profile: area, event format, interests, goals',
                'Your phone. With an account, also our server',
                'Only if you sign in',
              ],
              [
                'Plans: events marked Saved or Going, whether you registered, your "Did you go?" answers, the time each of these changed, and a copy of each event',
                'Your phone. With an account, also our server',
                'Only if you sign in',
              ],
              [
                'Private notes you write after "Did you go?"',
                'Your phone only',
                'No',
              ],
              [
                'Events you marked Not interested, and your reason',
                'Your phone only',
                'No',
              ],
              [
                'Events you opened (to improve For You; can be switched off in Privacy and notifications)',
                'Your phone only',
                'No',
              ],
              [
                'Settings: language, reminders, learning from your activity, age group',
                'Your phone only',
                'No',
              ],
              [
                'Account: email address, how you sign in (email code, Apple or Google), the name Apple or Google shares if any, and the consent you gave when you created it',
                'Our server',
                'Only if you create an account',
              ],
              [
                'Event report: event, reason, optional note, and the consent you gave',
                'Our server',
                'Yes, when you send a report',
              ],
              [
                'Event suggestion: link, text or image, a status token, and the consent you gave',
                'Our server',
                'Yes, when you suggest an event',
              ],
              [
                'Feedback: category, message, optional screenshot, optional reply email, app version, operating system, language',
                'Our server',
                'Yes, when you send feedback',
              ],
              [
                'Curator account: email address, password (stored hashed), role',
                'Our server',
                'Only for curators',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Past plans are removed from your phone 90 days after the event ended.',
          },
        ],
      },
      {
        heading: '3. Optional accounts',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Every feature works without an account. An account exists only to back up your plans and your discovery profile and to find them on another phone.',
          },
          {
            kind: 'list',
            items: [
              'Sign in with a 6-digit code sent to your email. There is no password.',
              'On iPhone, you can also use Sign in with Apple. If you choose "Hide my email", we receive an Apple relay address instead of your real one. Apple may share your name only the first time, and we do not require it.',
              'Sign in with Google will be added later. We will receive your email address and the name Google shares.',
              'We never ask for your contacts, your calendar or any other access when you sign in.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Before the account is created, a box that is not ticked in advance explains what is stored, why, where, for how long and how to delete it. Nothing is created until you tick it. We record the version of that notice, the language, your age group, a parent’s or guardian’s agreement if you are under 18, and the time.',
          },
          {
            kind: 'paragraph',
            text: 'What is backed up: your plans (Saved or Going, registered, "Did you go?" answers, each with the time it changed and the copy of the event) and your discovery profile (area, format, interests, goals). The first time you sign in on a phone, its plans are combined with those of your account, without duplicates.',
          },
          {
            kind: 'paragraph',
            text: 'What never leaves your phone, even with an account: your private notes, the events you hid or opened, and your settings (language, reminders, learning from your activity).',
          },
          {
            kind: 'paragraph',
            text: 'If you send a report or suggest an event while signed in, it is linked to your account until you delete the account. At deletion the link is removed and the report or suggestion stays without any link to you. What you sent as a guest was never linked to an account.',
          },
          {
            kind: 'paragraph',
            text: 'Signing out keeps the copy on your phone and returns you to guest mode. "Clear data on this phone" also signs you out.',
          },
        ],
      },
      {
        heading: '4. Why we keep data on our server, and for how long',
        blocks: [
          {
            kind: 'list',
            items: [
              'Account and backed up plans: to keep your plans safe and the same on each phone you use.',
              'Event reports: to correct or remove inaccurate, cancelled or fraudulent listings. We do not ask who you are.',
              'Event suggestions: to review and, if accepted, publish an event. The status token lets you check the outcome without an account.',
              'Feedback: to fix problems and improve Meyalo. Your reply email is optional and used only to answer you.',
              'Curator accounts: to let authorised curators sign in and review events.',
              'Deletion record: to be able to show that an account was deleted and which notice versions applied, if a question or complaint comes later.',
            ],
          },
          {
            kind: 'table',
            headers: ['Data', 'How long we keep it'],
            rows: [
              [
                'Account and backed up data',
                'While you use it. After 24 months without signing in, we email you a warning. The account is deleted 30 days after that email unless you sign in. [NOT BUILT YET: this needs an email provider; until it is built, inactive accounts are kept.]',
              ],
              [
                'Deletion record',
                '3 years after the deletion, then removed automatically. [UNVERIFIED: the 3 years stand in for the limitation period for claims in Cameroon and have not been checked against the law text.]',
              ],
              ['Event reports', '12 months after they were sent'],
              [
                'Event suggestions',
                '12 months after the decision to accept or refuse them',
              ],
              [
                'Consent given with a report, a suggestion or an account',
                'As long as the report, suggestion or account it belongs to',
              ],
              ['Feedback', '[RETENTION PERIOD]'],
              [
                'Curator accounts',
                'While the person is a curator, then [RETENTION PERIOD]',
              ],
              [
                'Technical logs kept by our host (such as IP address and request time)',
                '[CONFIRM WHAT IS LOGGED AND RETENTION PERIOD]',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: '[UNVERIFIED: whether Law No. 2010/012, art. 46 (10-year retention) applies to Meyalo has not been checked against the published text. If it applies, some periods above will change.]',
          },
          {
            kind: 'paragraph',
            text: '[UNVERIFIED: how long our host’s backups keep a copy of deleted data.]',
          },
          {
            kind: 'paragraph',
            text: 'Please do not include personal information about yourself or others in notes, messages or screenshots unless it is needed.',
          },
        ],
      },
      {
        heading: '5. Deleting your account',
        blocks: [
          {
            kind: 'paragraph',
            text: 'You can delete your account in the app (You, then Privacy and notifications, then Delete my account) or on our website after signing in. The Delete your account page gives the steps.',
          },
          {
            kind: 'paragraph',
            text: 'When you confirm, our server deletes at once your sign-in methods, your email address, your name, your backed up profile and plans, and the consents linked to your account. Reports and suggestions you sent while signed in are unlinked from you.',
          },
          {
            kind: 'paragraph',
            text: 'We keep only a deletion record. It contains a one-way code made from your account’s internal number (it cannot be turned back into that number, and it is not your email), the time the account was created, the time it was deleted, the versions of the notices you agreed to, and whether the request came from the app or the website. Nothing in it says who you are. It is removed automatically after 3 years.',
          },
          {
            kind: 'paragraph',
            text: 'Your plans stay on the phone you used, as a guest, until you clear them with "Clear data on this phone".',
          },
        ],
      },
      {
        heading: '6. Service providers, hosting and transfers outside Cameroon',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Our database, accounts and file storage are provided by Supabase, which stores them in France (European Union). This provider currently has no hosting region in Africa, so data sent to our server is transferred outside Cameroon. Supabase also sends the sign-in codes by email. [UNVERIFIED: the email provider used at launch is not chosen yet.]',
          },
          {
            kind: 'paragraph',
            text: 'Under Law No. 2024/017, this transfer requires prior authorisation from the data protection authority. [AUTHORISATION STATUS AND REFERENCE. UNVERIFIED: the authority does not appear to be operating yet, so no authorisation could be requested.] [TRANSFER SAFEGUARDS, e.g. contractual clauses].',
          },
          {
            kind: 'paragraph',
            text: 'If you use Sign in with Apple, Apple handles that sign-in under its own privacy policy. The same will apply to Google when Sign in with Google is added.',
          },
          {
            kind: 'paragraph',
            text: 'To translate an event, we send Google Cloud Translation the public text of the event and its number, never anything about you.',
          },
          {
            kind: 'paragraph',
            text: 'The website is hosted by Expo. [CONFIRM HOSTING LOCATION]. On phones, maps are shown by Apple Maps on iPhone or Google Maps, which receive the map area being viewed and technical data such as your IP address. [LINK PROVIDER POLICIES].',
          },
        ],
      },
      {
        heading: '7. Legal basis',
        blocks: [
          {
            kind: 'paragraph',
            text: 'We rely on your consent for everything that reaches our server. You give it by ticking the box before you send a report or a suggestion, or before you create an account. You can withdraw it at any time: delete your account, or ask us to delete a report or a suggestion. Withdrawing does not affect what was done before.',
          },
          {
            kind: 'paragraph',
            text: 'We do not use "legitimate interest" or a contract as a basis, because Law No. 2024/017 does not provide for them. [UNVERIFIED: this wording follows our reading of Law No. 2024/017, art. 9 and 50, and has not been checked by a lawyer. The basis for keeping the deletion record after you withdraw consent is also to be confirmed.]',
          },
        ],
      },
      {
        heading: '8. Your rights',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Under Law No. 2024/017 you have the right to:',
          },
          {
            kind: 'list',
            items: [
              'access the personal data we hold about you;',
              'have inaccurate data corrected (rectification);',
              'have your data erased;',
              'object to processing;',
              'receive your data in a portable format;',
              'withdraw your consent at any time, without affecting earlier processing.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'You can delete your account yourself, in the app or on the website. For any other request, write to [CONTACT EMAIL]. We may ask for information to confirm the request is yours. We answer within [RESPONSE TIME]. Reports and suggestions sent as a guest are anonymous, so we may not be able to find one unless you tell us which event, when, and what you wrote, or give your suggestion’s status link.',
          },
          {
            kind: 'paragraph',
            text: 'Data kept on your phone is under your control. In You, then Privacy and notifications, "Clear data on this phone" removes your profile, plans, notes, hidden and opened events and settings, and signs you out. On the website, you can also clear the site data in your browser.',
          },
          {
            kind: 'paragraph',
            text: 'You can also lodge a complaint with the data protection authority: [AUTHORITY NAME AND CONTACT].',
          },
        ],
      },
      {
        heading: '9. Under 18',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Meyalo can be browsed without giving personal data. Under Law No. 2024/017, processing the personal data of a person under 18 requires the consent of a parent or guardian. The first time you send something to our server or create an account, we ask whether you are 18 or older. If you are under 18, a second box asks you to confirm that a parent or guardian agrees, and nothing is sent without it. Your answer is kept on your phone and can be changed in Privacy and notifications. [UNVERIFIED: what counts as a valid parent’s consent is to be confirmed by a lawyer.]',
          },
        ],
      },
      {
        heading: '10. Security and breach notification',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Data travels over encrypted connections (HTTPS). On phones, your sign-in session is kept in the phone’s secure storage. Database rules let each person read and change only their own account data, keep anonymous visitors from reading reports, feedback or other people’s suggestions, and let only curators review them. Account deletion acts only on the account that is signed in. Requests for sign-in codes are limited, and our app does not write email addresses or sign-in tokens to its logs. Our host’s sign-in service keeps its own technical logs of sign-ins, which can include the email address. [CONFIRM: what the host’s auth logs keep and for how long.]',
          },
          {
            kind: 'paragraph',
            text: 'If a breach affects your personal data, we will notify the data protection authority and the people affected without delay, as the law requires. [BREACH PROCEDURE OWNER AND CONTACT].',
          },
        ],
      },
      {
        heading: '11. What we do not do',
        blocks: [
          {
            kind: 'list',
            items: [
              'Meyalo shows no advertising and sends no marketing messages.',
              'Meyalo contains no analytics or advertising trackers and does not track you across other apps or websites.',
              'We do not sell your personal data.',
              'We do not use your phone’s GPS location. Your area is the one you choose.',
            ],
          },
        ],
      },
      {
        heading: '12. Changes',
        blocks: [
          {
            kind: 'paragraph',
            text: 'We will update this policy when Meyalo changes what it handles. The date at the top shows the latest version. Significant changes will be announced in the app. Each consent notice has a version number, and we record the version you agreed to.',
          },
        ],
      },
    ],
  },
  fr: {
    title: 'Politique de confidentialité',
    intro:
      'Meyalo vous aide à découvrir des événements pour progresser au Cameroun. Vous pouvez l’utiliser en invité, sans compte. Le compte est facultatif : il sert seulement à sauvegarder vos plans pour les retrouver sur un autre téléphone. Cette politique explique quelles données Meyalo traite, où elles sont conservées, pourquoi, combien de temps, et les droits que vous donne la loi camerounaise n° 2024/017 relative à la protection des données à caractère personnel.',
    sections: [
      {
        heading: '1. Responsable du traitement',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Le responsable du traitement est [NOM DU RESPONSABLE], [FORME JURIDIQUE ET NUMÉRO D’IMMATRICULATION], [ADRESSE POSTALE], Cameroun.',
          },
          {
            kind: 'paragraph',
            text: 'Contact pour toute question ou demande relative à vos données : [E-MAIL DE CONTACT].',
          },
        ],
      },
      {
        heading:
          '2. Ce qui reste sur votre téléphone et ce qui arrive sur notre serveur',
        blocks: [
          {
            kind: 'table',
            headers: ['Donnée', 'Lieu de conservation', 'Envoyée chez nous'],
            rows: [
              [
                'Profil de découverte : zone, format, centres d’intérêt, objectifs',
                'Votre téléphone. Avec un compte, aussi notre serveur',
                'Seulement si vous vous connectez',
              ],
              [
                'Plans : événements marqués Enregistré ou « J’y vais », votre inscription, vos réponses à « Vous y êtes allé ? », l’heure de chaque changement et une copie de chaque événement',
                'Votre téléphone. Avec un compte, aussi notre serveur',
                'Seulement si vous vous connectez',
              ],
              [
                'Notes privées écrites après « Vous y êtes allé ? »',
                'Votre téléphone uniquement',
                'Non',
              ],
              [
                'Événements marqués Pas intéressé, et votre raison',
                'Votre téléphone uniquement',
                'Non',
              ],
              [
                'Événements ouverts (pour améliorer Pour vous ; désactivable dans Confidentialité et notifications)',
                'Votre téléphone uniquement',
                'Non',
              ],
              [
                'Réglages : langue, rappels, apprentissage de votre activité, tranche d’âge',
                'Votre téléphone uniquement',
                'Non',
              ],
              [
                'Compte : adresse e-mail, mode de connexion (code par e-mail, Apple ou Google), le nom transmis par Apple ou Google le cas échéant, et le consentement donné à la création',
                'Notre serveur',
                'Seulement si vous créez un compte',
              ],
              [
                'Signalement : événement, motif, note facultative, et le consentement donné',
                'Notre serveur',
                'Oui, quand vous signalez',
              ],
              [
                'Proposition d’événement : lien, texte ou image, un jeton de suivi, et le consentement donné',
                'Notre serveur',
                'Oui, quand vous proposez un événement',
              ],
              [
                'Avis : catégorie, message, capture d’écran facultative, e-mail de réponse facultatif, version de l’app, système d’exploitation, langue',
                'Notre serveur',
                'Oui, quand vous envoyez un avis',
              ],
              [
                'Compte curateur : adresse e-mail, mot de passe (stocké haché), rôle',
                'Notre serveur',
                'Uniquement pour les curateurs',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Les plans passés sont retirés de votre téléphone 90 jours après la fin de l’événement.',
          },
        ],
      },
      {
        heading: '3. Comptes facultatifs',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Toutes les fonctions marchent sans compte. Un compte sert uniquement à sauvegarder vos plans et votre profil de découverte, et à les retrouver sur un autre téléphone.',
          },
          {
            kind: 'list',
            items: [
              'Connectez-vous avec un code à 6 chiffres envoyé par e-mail. Il n’y a pas de mot de passe.',
              'Sur iPhone, vous pouvez aussi utiliser Se connecter avec Apple. Si vous choisissez « Masquer mon adresse e-mail », nous recevons une adresse relais d’Apple au lieu de la vôtre. Apple peut ne transmettre votre nom que la première fois, et nous ne l’exigeons pas.',
              'La connexion avec Google sera ajoutée plus tard. Nous recevrons votre adresse e-mail et le nom transmis par Google.',
              'Nous ne demandons jamais vos contacts, votre agenda ou un autre accès lors de la connexion.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Avant la création du compte, une case non cochée d’avance explique ce qui est conservé, pourquoi, où, combien de temps et comment le supprimer. Rien n’est créé tant que vous ne la cochez pas. Nous enregistrons la version de ce texte, la langue, votre tranche d’âge, l’accord d’un parent ou tuteur si vous avez moins de 18 ans, et l’heure.',
          },
          {
            kind: 'paragraph',
            text: 'Ce qui est sauvegardé : vos plans (Enregistré ou « J’y vais », inscription, réponses à « Vous y êtes allé ? », chacun avec l’heure de son changement et la copie de l’événement) et votre profil de découverte (zone, format, centres d’intérêt, objectifs). La première fois que vous vous connectez sur un téléphone, ses plans sont réunis avec ceux de votre compte, sans doublons.',
          },
          {
            kind: 'paragraph',
            text: 'Ce qui ne quitte jamais votre téléphone, même avec un compte : vos notes privées, les événements masqués ou ouverts, et vos réglages (langue, rappels, apprentissage de votre activité).',
          },
          {
            kind: 'paragraph',
            text: 'Si vous envoyez un signalement ou proposez un événement en étant connecté, il est lié à votre compte jusqu’à ce que vous supprimiez le compte. À la suppression, ce lien est retiré et le signalement ou la proposition reste sans aucun lien avec vous. Ce que vous avez envoyé en invité n’a jamais été lié à un compte.',
          },
          {
            kind: 'paragraph',
            text: 'Se déconnecter garde la copie sur votre téléphone et vous remet en mode invité. « Effacer les données de ce téléphone » vous déconnecte aussi.',
          },
        ],
      },
      {
        heading:
          '4. Pourquoi nous gardons des données sur notre serveur, et combien de temps',
        blocks: [
          {
            kind: 'list',
            items: [
              'Compte et plans sauvegardés : pour garder vos plans en sécurité et identiques sur chaque téléphone que vous utilisez.',
              'Signalements : pour corriger ou retirer les annonces inexactes, annulées ou frauduleuses. Nous ne demandons pas qui vous êtes.',
              'Propositions d’événements : pour examiner et, si elles sont acceptées, publier un événement. Le jeton de suivi vous permet de connaître la décision sans compte.',
              'Avis : pour corriger les problèmes et améliorer Meyalo. L’e-mail de réponse est facultatif et sert uniquement à vous répondre.',
              'Comptes curateurs : pour permettre aux curateurs autorisés de se connecter et d’examiner les événements.',
              'Trace de suppression : pour pouvoir montrer qu’un compte a été supprimé et quelles versions des textes s’appliquaient, si une question ou une plainte arrive plus tard.',
            ],
          },
          {
            kind: 'table',
            headers: ['Donnée', 'Durée de conservation'],
            rows: [
              [
                'Compte et données sauvegardées',
                'Tant que vous l’utilisez. Après 24 mois sans connexion, nous vous envoyons un e-mail d’avertissement. Le compte est supprimé 30 jours après cet e-mail si vous ne vous reconnectez pas. [PAS ENCORE EN PLACE : il faut un service d’envoi d’e-mails ; d’ici là, les comptes inactifs sont conservés.]',
              ],
              [
                'Trace de suppression',
                '3 ans après la suppression, puis effacée automatiquement. [NON VÉRIFIÉ : ces 3 ans remplacent le délai de prescription des actions au Cameroun et n’ont pas été vérifiés dans le texte de loi.]',
              ],
              ['Signalements', '12 mois après leur envoi'],
              [
                'Propositions d’événements',
                '12 mois après la décision de les accepter ou de les refuser',
              ],
              [
                'Consentement donné avec un signalement, une proposition ou un compte',
                'Aussi longtemps que le signalement, la proposition ou le compte auquel il se rattache',
              ],
              ['Avis', '[DURÉE DE CONSERVATION]'],
              [
                'Comptes curateurs',
                'Tant que la personne est curatrice, puis [DURÉE DE CONSERVATION]',
              ],
              [
                'Journaux techniques de notre hébergeur (comme l’adresse IP et l’heure de la requête)',
                '[CONFIRMER CE QUI EST JOURNALISÉ ET LA DURÉE]',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: '[NON VÉRIFIÉ : l’application à Meyalo de la loi n° 2010/012, art. 46 (conservation de 10 ans) n’a pas été vérifiée dans le texte publié. Si elle s’applique, certaines durées ci-dessus changeront.]',
          },
          {
            kind: 'paragraph',
            text: '[NON VÉRIFIÉ : combien de temps les sauvegardes de notre hébergeur gardent une copie des données supprimées.]',
          },
          {
            kind: 'paragraph',
            text: 'Merci de ne pas inclure d’informations personnelles sur vous ou sur d’autres personnes dans les notes, messages ou captures d’écran, sauf si c’est nécessaire.',
          },
        ],
      },
      {
        heading: '5. Supprimer votre compte',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Vous pouvez supprimer votre compte dans l’application (Vous, puis Confidentialité et notifications, puis Supprimer mon compte) ou sur notre site web après vous être connecté. La page Supprimer votre compte donne les étapes.',
          },
          {
            kind: 'paragraph',
            text: 'Quand vous confirmez, notre serveur supprime aussitôt vos modes de connexion, votre adresse e-mail, votre nom, votre profil et vos plans sauvegardés, et les consentements liés à votre compte. Les signalements et propositions envoyés en étant connecté ne sont plus liés à vous.',
          },
          {
            kind: 'paragraph',
            text: 'Nous gardons seulement une trace de suppression. Elle contient un code à sens unique calculé à partir du numéro interne de votre compte (on ne peut pas retrouver ce numéro à partir du code, et ce n’est pas votre e-mail), la date de création du compte, la date de sa suppression, les versions des textes que vous avez acceptés, et si la demande venait de l’application ou du site web. Rien dans cette trace ne dit qui vous êtes. Elle est effacée automatiquement après 3 ans.',
          },
          {
            kind: 'paragraph',
            text: 'Vos plans restent sur le téléphone utilisé, en mode invité, jusqu’à ce que vous les effaciez avec « Effacer les données de ce téléphone ».',
          },
        ],
      },
      {
        heading: '6. Prestataires, hébergement et transferts hors du Cameroun',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Notre base de données, les comptes et le stockage de fichiers sont fournis par Supabase, qui les conserve en France (Union européenne). Ce prestataire ne propose actuellement aucune région d’hébergement en Afrique : les données envoyées à notre serveur sont donc transférées hors du Cameroun. Supabase envoie aussi les codes de connexion par e-mail. [NON VÉRIFIÉ : le service d’envoi d’e-mails utilisé au lancement n’est pas encore choisi.]',
          },
          {
            kind: 'paragraph',
            text: 'Selon la loi n° 2024/017, ce transfert nécessite l’autorisation préalable de l’autorité de protection des données. [STATUT ET RÉFÉRENCE DE L’AUTORISATION. NON VÉRIFIÉ : l’autorité ne semble pas encore fonctionner, aucune autorisation n’a donc pu être demandée.] [GARANTIES DU TRANSFERT, p. ex. clauses contractuelles].',
          },
          {
            kind: 'paragraph',
            text: 'Si vous utilisez Se connecter avec Apple, Apple gère cette connexion selon sa propre politique de confidentialité. Il en ira de même pour Google quand la connexion avec Google sera ajoutée.',
          },
          {
            kind: 'paragraph',
            text: 'Pour traduire un événement, nous envoyons à Google Cloud Translation le texte public de l’événement et son numéro, jamais rien sur vous.',
          },
          {
            kind: 'paragraph',
            text: 'Le site web est hébergé par Expo. [CONFIRMER LE LIEU D’HÉBERGEMENT]. Sur téléphone, les cartes sont affichées par Apple Plans sur iPhone ou par Google Maps, qui reçoivent la zone consultée et des données techniques comme votre adresse IP. [LIER LES POLITIQUES DES FOURNISSEURS].',
          },
        ],
      },
      {
        heading: '7. Base légale',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Nous nous fondons sur votre consentement pour tout ce qui arrive sur notre serveur. Vous le donnez en cochant la case avant d’envoyer un signalement ou une proposition, ou avant de créer un compte. Vous pouvez le retirer à tout moment : supprimez votre compte, ou demandez-nous de supprimer un signalement ou une proposition. Le retrait ne remet pas en cause ce qui a été fait avant.',
          },
          {
            kind: 'paragraph',
            text: 'Nous n’utilisons ni l’« intérêt légitime » ni un contrat comme base, car la loi n° 2024/017 ne les prévoit pas. [NON VÉRIFIÉ : cette formulation suit notre lecture de la loi n° 2024/017, art. 9 et 50, et n’a pas été vérifiée par un avocat. La base permettant de garder la trace de suppression après le retrait du consentement reste aussi à confirmer.]',
          },
        ],
      },
      {
        heading: '8. Vos droits',
        blocks: [
          {
            kind: 'paragraph',
            text: 'La loi n° 2024/017 vous donne le droit :',
          },
          {
            kind: 'list',
            items: [
              'd’accéder aux données personnelles que nous détenons sur vous ;',
              'de faire corriger des données inexactes (rectification) ;',
              'de faire effacer vos données ;',
              'de vous opposer au traitement ;',
              'de recevoir vos données dans un format portable ;',
              'de retirer votre consentement à tout moment, sans effet sur les traitements antérieurs.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Vous pouvez supprimer votre compte vous-même, dans l’application ou sur le site web. Pour toute autre demande, écrivez à [E-MAIL DE CONTACT]. Nous pouvons demander des informations pour vérifier que la demande vient bien de vous. Nous répondons sous [DÉLAI DE RÉPONSE]. Les signalements et propositions envoyés en invité sont anonymes : nous ne pourrons peut-être pas en retrouver un sans que vous indiquiez l’événement, la date et ce que vous avez écrit, ou le lien de suivi de votre proposition.',
          },
          {
            kind: 'paragraph',
            text: 'Les données conservées sur votre téléphone restent sous votre contrôle. Dans Vous, puis Confidentialité et notifications, « Effacer les données de ce téléphone » supprime votre profil, vos plans, vos notes, les événements masqués et ouverts et vos réglages, et vous déconnecte. Sur le site web, vous pouvez aussi effacer les données du site dans votre navigateur.',
          },
          {
            kind: 'paragraph',
            text: 'Vous pouvez aussi déposer une plainte auprès de l’autorité de protection des données : [NOM ET CONTACT DE L’AUTORITÉ].',
          },
        ],
      },
      {
        heading: '9. Moins de 18 ans',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Meyalo peut être consulté sans fournir de données personnelles. Selon la loi n° 2024/017, le traitement des données d’une personne de moins de 18 ans nécessite le consentement d’un parent ou tuteur. La première fois que vous envoyez quelque chose à notre serveur ou créez un compte, nous vous demandons si vous avez 18 ans ou plus. Si vous avez moins de 18 ans, une deuxième case vous demande de confirmer qu’un parent ou tuteur est d’accord, et rien n’est envoyé sans elle. Votre réponse est gardée sur votre téléphone et peut être changée dans Confidentialité et notifications. [NON VÉRIFIÉ : ce qui vaut consentement valable d’un parent reste à confirmer par un avocat.]',
          },
        ],
      },
      {
        heading: '10. Sécurité et notification des violations',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Les données circulent par des connexions chiffrées (HTTPS). Sur téléphone, votre session de connexion est gardée dans le stockage sécurisé du téléphone. Les règles de la base permettent à chaque personne de lire et de modifier uniquement les données de son propre compte, empêchent les visiteurs anonymes de lire les signalements, les avis ou les propositions des autres, et réservent leur examen aux curateurs. La suppression de compte n’agit que sur le compte connecté. Les demandes de codes de connexion sont limitées, et notre application n’écrit ni adresses e-mail ni jetons de connexion dans ses journaux. Le service de connexion de notre hébergeur garde ses propres journaux techniques des connexions, qui peuvent contenir l’adresse e-mail. [À CONFIRMER : ce que gardent ces journaux et pendant combien de temps.]',
          },
          {
            kind: 'paragraph',
            text: 'En cas de violation touchant vos données personnelles, nous en informerons sans délai l’autorité de protection des données et les personnes concernées, comme la loi l’exige. [RESPONSABLE ET CONTACT DE LA PROCÉDURE].',
          },
        ],
      },
      {
        heading: '11. Ce que nous ne faisons pas',
        blocks: [
          {
            kind: 'list',
            items: [
              'Meyalo n’affiche aucune publicité et n’envoie aucun message marketing.',
              'Meyalo ne contient aucun outil d’analyse ou traceur publicitaire et ne vous suit pas sur d’autres applications ou sites.',
              'Nous ne vendons pas vos données personnelles.',
              'Nous n’utilisons pas la localisation GPS de votre téléphone. Votre zone est celle que vous choisissez.',
            ],
          },
        ],
      },
      {
        heading: '12. Modifications',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Nous mettrons à jour cette politique lorsque Meyalo changera ce qu’il traite. La date en haut indique la dernière version. Les changements importants seront annoncés dans l’application. Chaque texte de consentement a un numéro de version, et nous enregistrons la version que vous avez acceptée.',
          },
        ],
      },
    ],
  },
};
