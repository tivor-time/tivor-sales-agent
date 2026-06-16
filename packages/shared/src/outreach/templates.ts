import type { Language } from '../constants'
import { scoreSpam } from './spam'
import type { DraftInput, GeneratedDraft, StepKind } from './types'

interface Tmpl {
  subject: string
  body: string
}

/**
 * Short, native-phrased fallback templates per language + step kind, used when no
 * AI key is configured. Placeholders: {greeting} {company} {sender} {productLine}
 * {industry} {certsParen}. AI generation (when enabled) replaces these entirely.
 */
const TEMPLATES: Record<Language, Record<StepKind, Tmpl>> = {
  en: {
    intro: {
      subject: '{productLine} for {company}',
      body: '{greeting}\n\nI’m reaching out from {sender} — we export {productLine} {certsParen}. Given {company}’s work in {industry}, I think our range could be a strong fit.\n\nWould you be open to samples or a short call?\n\nBest regards,\n{sender}',
    },
    follow_up: {
      subject: 'Following up — {productLine}',
      body: '{greeting}\n\nJust following up on my note about {productLine} for {company}. Happy to send specs or a sample if useful.\n\nBest regards,\n{sender}',
    },
    value: {
      subject: 'Specs & certifications — {sender}',
      body: '{greeting}\n\nA quick note: our {productLine} ships {certsParen} with consistent grading and reliable lead times. Many buyers in {industry} start with a trial pallet.\n\nWould a sample help?\n\nBest regards,\n{sender}',
    },
    breakup: {
      subject: 'Closing the loop',
      body: '{greeting}\n\nI haven’t heard back, so I’ll close the loop for now. If sourcing {productLine} becomes relevant for {company}, just reply and I’ll pick it up.\n\nBest regards,\n{sender}',
    },
  },
  de: {
    intro: {
      subject: '{productLine} für {company}',
      body: '{greeting}\n\nich melde mich von {sender} – wir exportieren {productLine} {certsParen}. Angesichts der Tätigkeit von {company} im Bereich {industry} könnte unser Sortiment gut passen.\n\nWären Muster oder ein kurzes Gespräch interessant?\n\nMit freundlichen Grüßen\n{sender}',
    },
    follow_up: {
      subject: 'Kurze Nachfrage — {productLine}',
      body: '{greeting}\n\nich komme kurz auf meine Nachricht zu {productLine} für {company} zurück. Gerne sende ich Spezifikationen oder ein Muster.\n\nMit freundlichen Grüßen\n{sender}',
    },
    value: {
      subject: 'Spezifikationen & Zertifikate — {sender}',
      body: '{greeting}\n\nkurz zur Info: unser {productLine} wird {certsParen} mit gleichbleibender Qualität und zuverlässigen Lieferzeiten geliefert. Viele Einkäufer starten mit einer Testpalette.\n\nWürde ein Muster helfen?\n\nMit freundlichen Grüßen\n{sender}',
    },
    breakup: {
      subject: 'Letzte Nachricht',
      body: '{greeting}\n\nda ich nichts gehört habe, schließe ich den Vorgang vorerst ab. Sollte {productLine} für {company} relevant werden, antworten Sie einfach.\n\nMit freundlichen Grüßen\n{sender}',
    },
  },
  es: {
    intro: {
      subject: '{productLine} para {company}',
      body: '{greeting}\n\nle escribo desde {sender}: exportamos {productLine} {certsParen}. Dado el trabajo de {company} en {industry}, creo que nuestra gama podría encajar bien.\n\n¿Le interesaría recibir muestras o una breve llamada?\n\nUn saludo,\n{sender}',
    },
    follow_up: {
      subject: 'Seguimiento — {productLine}',
      body: '{greeting}\n\nretomo mi mensaje sobre {productLine} para {company}. Con gusto le envío especificaciones o una muestra.\n\nUn saludo,\n{sender}',
    },
    value: {
      subject: 'Especificaciones y certificados — {sender}',
      body: '{greeting}\n\nuna nota breve: nuestro {productLine} se envía {certsParen} con calidad constante y plazos fiables. Muchos compradores empiezan con un palet de prueba.\n\n¿Le ayudaría una muestra?\n\nUn saludo,\n{sender}',
    },
    breakup: {
      subject: 'Cierro el seguimiento',
      body: '{greeting}\n\nal no tener respuesta, cierro el seguimiento por ahora. Si {productLine} llega a ser relevante para {company}, basta con responder.\n\nUn saludo,\n{sender}',
    },
  },
  fr: {
    intro: {
      subject: '{productLine} pour {company}',
      body: '{greeting}\n\nje me permets de vous contacter de la part de {sender} : nous exportons {productLine} {certsParen}. Compte tenu de l’activité de {company} dans {industry}, notre gamme pourrait bien convenir.\n\nSeriez-vous ouvert à des échantillons ou à un bref échange ?\n\nCordialement,\n{sender}',
    },
    follow_up: {
      subject: 'Relance — {productLine}',
      body: '{greeting}\n\nje reviens vers vous au sujet de {productLine} pour {company}. Je peux volontiers vous envoyer les spécifications ou un échantillon.\n\nCordialement,\n{sender}',
    },
    value: {
      subject: 'Spécifications et certifications — {sender}',
      body: '{greeting}\n\nune note rapide : notre {productLine} est expédié {certsParen}, avec une qualité constante et des délais fiables. Beaucoup d’acheteurs commencent par une palette d’essai.\n\nUn échantillon vous aiderait-il ?\n\nCordialement,\n{sender}',
    },
    breakup: {
      subject: 'Je clos le suivi',
      body: '{greeting}\n\nsans retour de votre part, je clos le suivi pour le moment. Si {productLine} devient pertinent pour {company}, répondez simplement à ce message.\n\nCordialement,\n{sender}',
    },
  },
  pl: {
    intro: {
      subject: '{productLine} dla {company}',
      body: '{greeting}\n\npiszę z ramienia {sender} – eksportujemy {productLine} {certsParen}. Biorąc pod uwagę działalność {company} w obszarze {industry}, nasza oferta może dobrze pasować.\n\nCzy był(a)by Pan(i) zainteresowany(a) próbkami lub krótką rozmową?\n\nZ poważaniem,\n{sender}',
    },
    follow_up: {
      subject: 'Przypomnienie — {productLine}',
      body: '{greeting}\n\nwracam do mojej wiadomości dotyczącej {productLine} dla {company}. Chętnie prześlę specyfikację lub próbkę.\n\nZ poważaniem,\n{sender}',
    },
    value: {
      subject: 'Specyfikacja i certyfikaty — {sender}',
      body: '{greeting}\n\nkrótka informacja: nasz {productLine} dostarczamy {certsParen} ze stałą jakością i pewnymi terminami. Wielu kupujących zaczyna od palety próbnej.\n\nCzy próbka by pomogła?\n\nZ poważaniem,\n{sender}',
    },
    breakup: {
      subject: 'Zamykam temat',
      body: '{greeting}\n\nwobec braku odpowiedzi na razie zamykam temat. Jeśli {productLine} stanie się istotny dla {company}, wystarczy odpowiedzieć.\n\nZ poważaniem,\n{sender}',
    },
  },
}

const GREETING: Record<Language, (name: string) => string> = {
  en: (n) => (n ? `Hi ${n},` : 'Hello,'),
  de: (n) => (n ? `Guten Tag ${n},` : 'Guten Tag,'),
  es: (n) => (n ? `Hola ${n},` : 'Hola,'),
  fr: (n) => (n ? `Bonjour ${n},` : 'Bonjour,'),
  pl: (n) => (n ? `Dzień dobry ${n},` : 'Dzień dobry,'),
}

const INDUSTRY_FALLBACK: Record<Language, string> = {
  en: 'your sector',
  de: 'Ihrer Branche',
  es: 'su sector',
  fr: 'votre secteur',
  pl: 'Pań­stwa branży',
}

const UNSUB: Record<Language, string> = {
  en: 'You received this because we believe our products are relevant to your business. Unsubscribe:',
  de: 'Sie erhalten diese Nachricht, weil wir unsere Produkte für Ihr Unternehmen für relevant halten. Abmelden:',
  es: 'Recibe este mensaje porque creemos que nuestros productos son relevantes para su empresa. Cancelar suscripción:',
  fr: 'Vous recevez ce message car nous pensons que nos produits sont pertinents pour votre entreprise. Se désabonner :',
  pl: 'Otrzymujesz tę wiadomość, ponieważ uważamy, że nasze produkty są istotne dla Twojej firmy. Wypisz się:',
}

export function buildProductLine(catalog: DraftInput['catalog']): string {
  if (!catalog.length) return 'our products'
  const names = catalog.slice(0, 2).map((c) => c.name)
  return names.join(' & ')
}

export function buildFooter(input: DraftInput): string {
  const { language, sender, unsubscribeUrl } = input
  const addr = sender.physicalAddress ? ` · ${sender.physicalAddress}` : ''
  return `—\n${UNSUB[language]} ${unsubscribeUrl}\n${sender.companyName}${addr}`
}

/** Render a localized fallback draft (no AI). */
export function renderFallbackDraft(input: DraftInput): GeneratedDraft {
  const t = TEMPLATES[input.language][input.step.kind]
  const name = input.contact?.firstName?.trim() ?? ''
  const certs = input.sender.certifications?.filter(Boolean) ?? []
  const vars: Record<string, string> = {
    greeting: GREETING[input.language](name),
    company: input.lead.companyName,
    sender: input.sender.companyName,
    productLine: buildProductLine(input.catalog),
    industry: input.lead.industry?.trim() || INDUSTRY_FALLBACK[input.language],
    certsParen: certs.length ? `(${certs.join(', ')})` : '',
  }
  const fill = (s: string) =>
    s
      .replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
      .replace(/ {2,}/g, ' ')
      .replace(/ +([.,])/g, '$1')
      .trim()

  const subject = fill(t.subject)
  const bodyText = `${fill(t.body)}\n\n${buildFooter(input)}`
  return {
    subject,
    subjectVariants: [subject],
    bodyText,
    spam: scoreSpam(subject, bodyText),
    generatedByAi: false,
  }
}
