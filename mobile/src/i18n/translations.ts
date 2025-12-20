export type LanguageCode = 'en' | 'sk';

export type LanguageDefinition = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flagEmoji: string;
};

export const LANGUAGE_DEFINITIONS: Record<LanguageCode, LanguageDefinition> = {
  en: { code: 'en', label: 'English', nativeLabel: 'English', flagEmoji: '🇺🇸' },
  sk: { code: 'sk', label: 'Slovak', nativeLabel: 'Slovenčina', flagEmoji: '🇸🇰' }
};

const baseTranslation = {
  languageSwitcher: {
    buttonLabel: 'Change language',
    dialogTitle: 'Choose your language',
    closeLabel: 'Close language selection'
  },
  navigation: {
    help: 'Help & FAQ',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    reportAbuse: 'Report abuse',
    openMenu: 'Open menu',
    closeMenu: 'Close menu'
  },
  footer: {
    copyright: '© {year} ChatOrbit. Peer-to-peer chat without server-side archives.',
    help: 'Help',
    terms: 'Terms',
    privacy: 'Privacy'
  },
  home: {
    heroBadge: 'ChatOrbit Sessions',
    heroTitle: 'Spin up a private two-person chat in seconds',
    heroSubtitle:
      'Generate a shareable access token, send it to your contact, and meet in an ephemeral chat room. Once the second device connects a secure countdown begins—when it reaches zero the session closes itself.',
    needToken: 'Need token',
    haveToken: 'Have token',
    howItWorks: 'How it works',
    step1: 'Request a token and choose the activation window plus the countdown for the live session.',
    step2: 'Share the token however you like. The first partner to log in reserves the host seat.',
    step3: 'Once both devices connect, message bundles flow directly with end-to-end encryption and a live timer.'
  },
  joinCard: {
    title: 'Join with an existing token',
    subtitle:
      'Paste the token you received. Once two devices join the same token the session starts immediately and no other logins are permitted.',
    tokenLabel: 'Session token',
    tokenPlaceholder: 'Paste token',
    submitIdle: 'Enter session',
    submitLoading: 'Connecting…',
    missingTokenError: 'Enter the token you received from your partner.',
    unknownError: 'Unknown error',
    hintTitle: 'Heads up',
    hint1: 'Sessions close automatically when the timer hits zero.',
    hint2: 'You can reconnect on the same device before the countdown ends.',
    hint3: 'Messages stay private to the two connected devices.'
  },
  tokenCard: {
    title: 'Request a new session token',
    subtitle:
      'Define how long the token stays claimable and how long the active session should last. Each device can mint ten tokens per hour.',
    validityLabel: 'Validity window',
    validityOneDay: '1 day',
    validityOneWeek: '1 week',
    validityOneMonth: '1 month',
    validityOneYear: '1 year',
    ttlLabel: 'Session time-to-live (minutes)',
    ttlApproxHours: '≈ {hours} hours',
    ttlCustomOption: 'Custom',
    messageLimitLabel: 'Message character limit',
    messageLimitHelper: 'Between 200 and 16,000 characters per message.',
    submitIdle: 'Generate token',
    submitLoading: 'Issuing token…',
    tokenHeader: 'Token',
    copyLabel: 'Copy session token',
    copyIdle: 'Copy',
    copySuccess: 'Copied',
    copySuccessStatus: 'Token copied to clipboard',
    copyErrorStatus: 'Unable to copy token',
    startSession: 'Start session',
    startSessionLoading: 'Starting…',
    validUntil: 'Valid until',
    sessionTtl: 'Session TTL',
    characterLimit: 'Character limit',
    ttlMinutes: '{minutes} minutes',
    characterCount: '{count} characters',
    unknownError: 'Unknown error',
    tokenIssueError: 'Unable to issue a token.',
    tokenJoinError: 'Unable to join this token.'
  },
  termsModal: {
    title: 'Review and accept the Terms of Service',
    description:
      'The chat session will only start after you confirm that you have read and agree to the Terms of Service. Last updated {date}.',
    contentLabel: 'Terms of Service content',
    helper: 'Scroll through the entire document to enable the AGREE button.',
    agree: 'AGREE',
    cancel: 'Cancel'
  },
  legalOverlay: {
    closeButton: 'Close',
    closeLabel: 'Close legal document',
    helpTitle: 'Help & FAQ',
    termsTitle: 'Terms of Service',
    privacyTitle: 'Privacy Policy'
  },
  legalPages: {
    termsTitle: 'Terms of Service',
    privacyTitle: 'Privacy Policy',
    lastUpdated: 'Last updated {date}'
  },
  preventNavigation: {
    message: 'Are you sure you want to leave this page?'
  },
  reportAbuse: {
    title: 'Report abuse',
    helper: 'End the session and notify ChatOrbit about unlawful behavior.'
  },
  session: {
    statusCard: {
      connectedParticipants: 'Connected participants: {current}/{max}',
      messageLimit: 'Limit: {limit} chars/message',
      messageLimitUnknown: 'Limit: — chars/message',
      tokenLabel: 'Token',
      timerLabel: 'Session timer',
      copyButtonIdle: 'Copy',
      copyButtonSuccess: 'Copied',
      copyButtonAriaLabel: 'Copy session token',
      copyStatusCopied: 'Token copied to clipboard',
      copyStatusFailed: 'Unable to copy token',
      roleLabel: 'You are signed in as {role}.',
      roleHost: 'host',
      roleGuest: 'guest',
      statusWaiting: 'Waiting',
      statusConnected: 'Connected',
      statusEnded: 'Ended',
      countdownWaiting: 'Waiting…',
      countdownStarting: 'Starting…',
      detailsToggleHide: 'Hide details',
      detailsToggleShow: 'Show details',
      detailsToggleHeaderVisible: 'Session details visible',
      detailsToggleHeaderHidden: 'Show session details',
      detailsToggleRegionLabel: 'Session details'
    },
    call: {
      statusIdle: 'Video chat ready',
      statusRequesting: 'Awaiting peer response',
      statusIncoming: 'Incoming video chat',
      statusConnecting: 'Connecting video chat',
      statusActive: 'Video chat active',
      labelPartner: 'Partner',
      labelYou: 'You',
      incomingTitle: 'Incoming video chat',
      incomingDescriptionWithName: '{name} wants to start a video chat.',
      incomingDescriptionWithoutName: 'Your peer wants to start a video chat.',
      incomingAccept: 'Accept',
      incomingDecline: 'Decline'
    },
    chat: {
      emptyState: 'No messages yet. Start the conversation!',
      composerPlaceholder: 'Type your message…',
      sendButton: 'Send'
    },
    controls: {
      endSessionIdle: 'End session',
      endSessionLoading: 'Ending…',
      endSessionEnded: 'Session ended',
      endSessionConfirmTitle: 'End session',
      endSessionConfirmDescription: 'Ending the session will immediately disconnect all participants.',
      endSessionConfirmLabel: 'End session',
      endSessionCancelLabel: 'Cancel'
    }
  }
};

export type AppTranslation = typeof baseTranslation;

export const TRANSLATIONS: Record<LanguageCode, AppTranslation> = {
  en: baseTranslation,
  sk: {
    ...baseTranslation,
    languageSwitcher: {
      buttonLabel: 'Zmeniť jazyk',
      dialogTitle: 'Vyberte si jazyk',
      closeLabel: 'Zavrieť výber jazyka'
    },
    navigation: {
      help: 'Pomoc a FAQ',
      terms: 'Podmienky používania',
      privacy: 'Ochrana súkromia',
      reportAbuse: 'Nahlásiť zneužitie',
      openMenu: 'Otvoriť menu',
      closeMenu: 'Zatvoriť menu'
    },
    footer: {
      copyright: '© {year} ChatOrbit. P2P chat bez serverových archívov.',
      help: 'Pomoc',
      terms: 'Podmienky',
      privacy: 'Súkromie'
    },
    home: {
      heroBadge: 'ChatOrbit relácie',
      heroTitle: 'Spustite súkromný dvojčlenný chat za pár sekúnd',
      heroSubtitle:
        'Vygenerujte zdieľateľný prístupový token, pošlite ho kontaktu a stretnite sa v efemérnej miestnosti. Keď sa pripojí druhé zariadenie, spustí sa bezpečné odpočítavanie a po jeho skončení sa relácia automaticky ukončí.',
      needToken: 'Potrebujem token',
      haveToken: 'Mám token',
      howItWorks: 'Ako to funguje',
      step1: 'Požiadajte o token a zvoľte aktivačné okno a dĺžku odpočítavania pre živú reláciu.',
      step2: 'Token zdieľajte akýmkoľvek spôsobom. Prvý prihlásený účastník získa miesto hostiteľa.',
      step3: 'Keď sa pripoja obe zariadenia, správy prechádzajú priamo s end-to-end šifrovaním a živým časovačom.'
    },
    joinCard: {
      title: 'Pripojiť sa pomocou existujúceho tokenu',
      subtitle:
        'Vložte token, ktorý ste dostali. Len čo sa k rovnakému tokenu pripoja dve zariadenia, relácia sa okamžite spustí a ďalšie prihlásenia nie sú povolené.',
      tokenLabel: 'Token relácie',
      tokenPlaceholder: 'Vložte token',
      submitIdle: 'Vstúpiť do relácie',
      submitLoading: 'Pripájanie…',
      missingTokenError: 'Zadajte token, ktorý ste dostali od partnera.',
      unknownError: 'Neznáma chyba',
      hintTitle: 'Dôležité',
      hint1: 'Relácia sa automaticky ukončí, keď časovač klesne na nulu.',
      hint2: 'Na rovnakom zariadení sa môžete znovu pripojiť, kým odpočítavanie neskončí.',
      hint3: 'Správy zostávajú súkromné medzi dvoma pripojenými zariadeniami.'
    },
    tokenCard: {
      title: 'Vyžiadať nový token relácie',
      subtitle:
        'Určte, ako dlho zostane token použiteľný a ako dlho má trvať aktívna relácia. Každé zariadenie môže za hodinu vytvoriť desať tokenov.',
      validityLabel: 'Platnosť tokenu',
      validityOneDay: '1 deň',
      validityOneWeek: '1 týždeň',
      validityOneMonth: '1 mesiac',
      validityOneYear: '1 rok',
      ttlLabel: 'Životnosť relácie (minúty)',
      ttlApproxHours: '≈ {hours} hod',
      ttlCustomOption: 'Vlastné',
      messageLimitLabel: 'Limit znakov správy',
      messageLimitHelper: 'Medzi 200 a 16 000 znakmi na jednu správu.',
      submitIdle: 'Vygenerovať token',
      submitLoading: 'Vydáva sa token…',
      tokenHeader: 'Token',
      copyLabel: 'Kopírovať token relácie',
      copyIdle: 'Kopírovať',
      copySuccess: 'Skopírované',
      copySuccessStatus: 'Token bol skopírovaný do schránky',
      copyErrorStatus: 'Token sa nepodarilo skopírovať',
      startSession: 'Spustiť reláciu',
      startSessionLoading: 'Spúšťanie…',
      validUntil: 'Platný do',
      sessionTtl: 'Životnosť relácie',
      characterLimit: 'Limit znakov',
      ttlMinutes: '{minutes} minút',
      characterCount: '{count} znakov',
      unknownError: 'Neznáma chyba',
      tokenIssueError: 'Token sa nepodarilo vydať.',
      tokenJoinError: 'K tomuto tokenu sa nedá pripojiť.'
    },
    termsModal: {
      title: 'Skontrolujte a potvrďte Podmienky používania',
      description:
        'Relácia sa spustí až po tom, čo potvrdíte, že ste si prečítali a súhlasíte s Podmienkami používania. Naposledy aktualizované {date}.',
      contentLabel: 'Obsah podmienok používania',
      helper: 'Prejdite celý dokument, aby sa tlačidlo SÚHLASÍM aktivovalo.',
      agree: 'SÚHLASÍM',
      cancel: 'Zrušiť'
    },
    legalOverlay: {
      closeButton: 'Zavrieť',
      closeLabel: 'Zavrieť právny dokument',
      helpTitle: 'Pomoc a FAQ',
      termsTitle: 'Podmienky používania',
      privacyTitle: 'Ochrana súkromia'
    },
    legalPages: {
      termsTitle: 'Podmienky používania',
      privacyTitle: 'Ochrana súkromia',
      lastUpdated: 'Naposledy aktualizované {date}'
    },
    preventNavigation: {
      message: 'Naozaj chcete opustiť túto stránku?'
    },
    reportAbuse: {
      title: 'Nahlásiť zneužitie',
      helper: 'Ukončite reláciu a informujte ChatOrbit o protiprávnom správaní.'
    },
    session: {
      statusCard: {
        connectedParticipants: 'Pripojení účastníci: {current}/{max}',
        messageLimit: 'Limit: {limit} znakov/správa',
        messageLimitUnknown: 'Limit: — znakov/správa',
        tokenLabel: 'Token',
        timerLabel: 'Časovač relácie',
        copyButtonIdle: 'Kopírovať',
        copyButtonSuccess: 'Skopírované',
        copyButtonAriaLabel: 'Skopírovať token relácie',
        copyStatusCopied: 'Token skopírovaný do schránky',
        copyStatusFailed: 'Token sa nepodarilo skopírovať',
        roleLabel: 'Ste prihlásený ako {role}.',
        roleHost: 'hostiteľ',
        roleGuest: 'hosť',
        statusWaiting: 'Čaká sa',
        statusConnected: 'Pripojené',
        statusEnded: 'Ukončené',
        countdownWaiting: 'Čaká sa…',
        countdownStarting: 'Spúšťa sa…',
        detailsToggleHide: 'Skryť detaily',
        detailsToggleShow: 'Zobraziť detaily',
        detailsToggleHeaderVisible: 'Detaily relácie sú viditeľné',
        detailsToggleHeaderHidden: 'Zobraziť detaily relácie',
        detailsToggleRegionLabel: 'Detaily relácie'
      },
      call: {
        statusIdle: 'Videochat pripravený',
        statusRequesting: 'Čaká sa na reakciu partnera',
        statusIncoming: 'Prichádzajúci videochat',
        statusConnecting: 'Pripájanie videochatu',
        statusActive: 'Videochat aktívny',
        labelPartner: 'Partner',
        labelYou: 'Vy',
        incomingTitle: 'Prichádzajúci videochat',
        incomingDescriptionWithName: '{name} chce spustiť videochat.',
        incomingDescriptionWithoutName: 'Váš partner chce spustiť videochat.',
        incomingAccept: 'Prijať',
        incomingDecline: 'Odmietnuť'
      },
      chat: {
        emptyState: 'Zatiaľ žiadne správy. Začnite konverzáciu!',
        composerPlaceholder: 'Napíšte svoju správu…',
        sendButton: 'Odoslať'
      },
      controls: {
        endSessionIdle: 'Ukončiť reláciu',
        endSessionLoading: 'Ukončuje sa…',
        endSessionEnded: 'Relácia ukončená',
        endSessionConfirmTitle: 'Ukončiť reláciu',
        endSessionConfirmDescription: 'Ukončením relácie okamžite odpojíte všetkých účastníkov.',
        endSessionConfirmLabel: 'Ukončiť reláciu',
        endSessionCancelLabel: 'Zrušiť'
      }
    }
  }
};

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const SUPPORTED_LANGUAGES: LanguageCode[] = Object.keys(TRANSLATIONS) as LanguageCode[];

export function getTranslations(language: LanguageCode): AppTranslation {
  return TRANSLATIONS[language] ?? TRANSLATIONS[DEFAULT_LANGUAGE];
}

// Helper function to replace placeholders in translation strings
export function formatTranslation(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}
