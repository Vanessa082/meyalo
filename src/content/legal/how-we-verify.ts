import type { LocalizedLegalDocument } from './types';

/** Mirrors VerificationState in src/types/event.type.ts. */
export const howWeVerify: LocalizedLegalDocument = {
  en: {
    title: 'How we verify events',
    intro:
      'Every event on Meyalo is reviewed by a person before it is public, and each listing shows how it was checked. Verification lowers the risk of wrong or fake listings; it is not a guarantee.',
    sections: [
      {
        heading: 'Verification levels',
        blocks: [
          {
            kind: 'table',
            headers: ['Level', 'What it means', 'Public'],
            rows: [
              [
                'Unreviewed',
                'Received from a submission, a feed or a curator draft, and not yet checked.',
                'Never shown publicly',
              ],
              [
                'Source confirmed',
                'A curator checked the title, date and time, place, format and links against the organiser’s official source, and recorded who checked and when.',
                'Yes',
              ],
              [
                'Organiser confirmed',
                'The organiser confirmed the details directly, through a verified contact or by claiming the listing.',
                'Yes',
              ],
              [
                'Partner (coming soon)',
                'A badge for organisations Meyalo has an established partnership with. Not shown in the app yet.',
                'Coming soon',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Events can change after we check them. When we learn that an event was changed or cancelled, we update or hide it.',
          },
        ],
      },
      {
        heading: 'What we check, and the rules we follow',
        blocks: [
          {
            kind: 'list',
            items: [
              'Every check is recorded with the link to the official source the curator used, the date, and who checked.',
              'A listing with any red flag below cannot be confirmed.',
              'If an opportunity charges a fee to apply or register, two different curators must confirm it before it is public.',
              'If two people report a listing as a possible scam within 24 hours, it is taken down for review straight away, unless the organiser confirmed it directly.',
              'Each listing shows when it was last checked, so you can judge how fresh the details are.',
            ],
          },
        ],
      },
      {
        heading: 'Red flags',
        blocks: [
          {
            kind: 'list',
            items: [
              'You are asked to pay to apply, or to pay an application, processing or “guarantee” fee.',
              'Payment is requested by mobile money to a personal number.',
              'Only a WhatsApp number is given, with no organisation, website or official page.',
              'The offer is guaranteed or sounds too good to be true (“100% scholarship, no selection”).',
              'You are pressured to decide or pay immediately.',
              'You are asked for passport, ID or bank details before any selection.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Meyalo never asks you for money. When in doubt, contact the organiser through their official website.',
          },
        ],
      },
      {
        heading: 'How to report',
        blocks: [
          {
            kind: 'paragraph',
            text: 'On the event page, use “Report” and choose a reason: cancelled or postponed, wrong date or time, wrong place, broken link, possible scam, duplicate, or other. Reports are anonymous and reviewed by a curator. You can also write to [CONTACT EMAIL].',
          },
        ],
      },
    ],
  },
  fr: {
    title: 'Comment nous vérifions les événements',
    intro:
      'Chaque événement sur Meyalo est examiné par une personne avant d’être public, et chaque annonce indique comment elle a été vérifiée. La vérification réduit le risque d’annonces erronées ou fausses ; ce n’est pas une garantie.',
    sections: [
      {
        heading: 'Niveaux de vérification',
        blocks: [
          {
            kind: 'table',
            headers: ['Niveau', 'Signification', 'Public'],
            rows: [
              [
                'Non examiné',
                'Reçu par une proposition, un flux ou un brouillon de curateur, et pas encore vérifié.',
                'Jamais affiché publiquement',
              ],
              [
                'Source confirmée',
                'Un curateur a vérifié le titre, la date et l’heure, le lieu, le format et les liens auprès de la source officielle de l’organisateur, et a noté qui a vérifié et quand.',
                'Oui',
              ],
              [
                'Confirmé par l’organisateur',
                'L’organisateur a confirmé les détails directement, via un contact vérifié ou en revendiquant l’annonce.',
                'Oui',
              ],
              [
                'Partenaire (bientôt)',
                'Un badge pour les organisations avec lesquelles Meyalo a un partenariat établi. Pas encore disponible.',
                'Bientôt',
              ],
            ],
          },
          {
            kind: 'paragraph',
            text: 'Un événement peut changer après notre vérification. Quand nous apprenons qu’il a été modifié ou annulé, nous le mettons à jour ou le masquons.',
          },
        ],
      },
      {
        heading: 'Ce que nous vérifions, et nos règles',
        blocks: [
          {
            kind: 'list',
            items: [
              'Chaque vérification est enregistrée avec le lien vers la source officielle utilisée, la date et le nom du curateur.',
              'Une annonce présentant l’un des signaux d’alerte ci-dessous ne peut pas être confirmée.',
              'Si une opportunité fait payer des frais pour postuler ou s’inscrire, deux curateurs différents doivent la confirmer avant qu’elle soit publique.',
              'Si deux personnes signalent une annonce comme arnaque possible en 24 heures, elle est retirée immédiatement pour examen, sauf si l’organisateur l’a confirmée directement.',
              'Chaque annonce indique la date de sa dernière vérification, pour juger de la fraîcheur des informations.',
            ],
          },
        ],
      },
      {
        heading: 'Signaux d’alerte',
        blocks: [
          {
            kind: 'list',
            items: [
              'On vous demande de payer pour postuler, ou des frais de dossier, de traitement ou de « garantie ».',
              'Le paiement est demandé par mobile money vers un numéro personnel.',
              'Seul un numéro WhatsApp est donné, sans organisation, site ni page officielle.',
              'L’offre est garantie ou trop belle pour être vraie (« bourse à 100 %, sans sélection »).',
              'On vous presse de décider ou de payer immédiatement.',
              'On vous demande passeport, pièce d’identité ou coordonnées bancaires avant toute sélection.',
            ],
          },
          {
            kind: 'paragraph',
            text: 'Meyalo ne vous demande jamais d’argent. En cas de doute, contactez l’organisateur via son site officiel.',
          },
        ],
      },
      {
        heading: 'Comment signaler',
        blocks: [
          {
            kind: 'paragraph',
            text: 'Sur la page de l’événement, utilisez « Signaler » et choisissez un motif : annulé ou reporté, mauvaise date ou heure, mauvais lieu, lien cassé, arnaque possible, doublon, ou autre. Les signalements sont anonymes et examinés par un curateur. Vous pouvez aussi écrire à [E-MAIL DE CONTACT].',
          },
        ],
      },
    ],
  },
};
