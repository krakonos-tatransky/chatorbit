/**
 * Translations for ChatOrbit Mobile
 *
 * Supports English, Slovak, and Hungarian languages with flag emojis for selector.
 */

export type LanguageCode = 'en' | 'sk' | 'hu';

export type LanguageDefinition = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flagEmoji: string;
};

export const LANGUAGE_DEFINITIONS: Record<LanguageCode, LanguageDefinition> = {
  en: { code: 'en', label: 'English', nativeLabel: 'English', flagEmoji: '🇺🇸' },
  sk: { code: 'sk', label: 'Slovak', nativeLabel: 'Slovenčina', flagEmoji: '🇸🇰' },
  hu: { code: 'hu', label: 'Hungarian', nativeLabel: 'Magyar', flagEmoji: '🇭🇺' },
};

const baseTranslation = {
  // Language switcher
  languageSwitcher: {
    buttonLabel: 'Change language',
    dialogTitle: 'Choose your language',
  },

  // Landing page
  landing: {
    getToken: 'Get Token',
    createRoom: 'Create Room',
    hasToken: 'Has Token',
    joinRoom: 'Join Room',
    description:
      'Generate a shareable access token, send it to your contact, and meet in an ephemeral chat room. Once connected, a secure countdown begins.',
    badgePrivate: 'Private',
    badgeEncrypted: 'Encrypted',
    badgeEphemeral: 'Ephemeral',
  },

  // Mint token page
  mint: {
    pageTitle: 'Create New Session',
    pageSubtitle: 'Configure your session parameters',

    // Validity section
    validityTitle: 'Token Validity',
    validityDescription: 'How long the token can be used to join',
    validityOptions: {
      oneDay: '1 Day',
      oneWeek: '1 Week',
      oneMonth: '1 Month',
      oneYear: '1 Year',
    },

    // Duration section
    durationTitle: 'Session Duration',
    durationDescription: 'How long the session stays active',
    durationOptions: {
      fiveMin: '5 minutes',
      fifteenMin: '15 minutes',
      thirtyMin: '30 minutes',
      oneHour: '1 hour',
      threeHours: '3 hours',
      oneDay: '1 day',
    },

    // Message limit section
    messageLimitTitle: 'Message Character Limit',
    messageLimitDescription: 'Maximum characters per message',
    messageLimitOptions: {
      chars200: '200 characters',
      chars500: '500 characters',
      chars1000: '1,000 characters',
      chars2000: '2,000 characters',
      chars5000: '5,000 characters',
      chars10000: '10,000 characters',
      chars16000: '16,000 characters',
    },

    // Buttons
    createButton: 'Create Token',
    creatingButton: 'Creating Token...',

    // Success screen
    successTitle: 'Token Created!',
    successSubtitle: 'Share this token with the other participant',
    yourToken: 'Your Token',
    copyButton: 'Copy',
    shareButton: 'Share',
    qrCodeButton: 'QR Code',
    qrCodeTitle: 'Scan to Join',
    qrCodeHint: 'Scan this QR code with another device to join the session',
    startSessionButton: 'Start Session',
    joiningButton: 'Joining...',
    createAnotherButton: 'Create Another Token',

    // Alerts
    invalidParams: 'Invalid Parameters',
    errorTitle: 'Error',
    copied: 'Copied!',
    copiedMessage: 'Token copied to clipboard',
    noTokenError: 'No token available',

    // Share message
    shareMessage: 'Join my ChatOrbit session!\n\nToken: {token}\n\nOpen the ChatOrbit app, tap "Have token", and paste this token to connect.',
    shareTitle: 'ChatOrbit Session Token',

    // Ad related
    adRequiredTitle: 'Watch Ad',
    adRequiredMessage: 'Please watch the complete ad to generate a free token.',
    adLoadingButton: 'Loading Ad...',
    watchAdButton: 'Watch Ad & Generate',
  },

  // Accept/Join page
  accept: {
    pageTitle: 'Join Session',
    pageSubtitle: 'Enter the token you received',

    tokenTitle: 'Session Token',
    tokenDescription: 'Paste the 32-character token shared with you',
    tokenPlaceholder: 'Paste token here',

    joinButton: 'Join Session',

    footer: 'Mobile-to-Mobile • End-to-End Encrypted',

    // Alerts
    invalidToken: 'Invalid Token',
    invalidTokenMessage: 'Please paste a valid 32-character token',
    joinFailed: 'Join Failed',
    failedMessage: 'Failed to join session',
    scanQRButton: 'Scan QR Code',
    scanQRTitle: 'Scan QR Code',
    scanQRHint: 'Point your camera at the QR code to scan the session token',
    invalidQRCode: 'This QR code does not contain a valid session token',
    cameraPermissionDenied: 'Camera permission is required to scan QR codes',
  },

  // Session screen
  session: {
    statusWaiting: 'Waiting for peer...',
    statusConnected: 'Connected',
    statusEnded: 'Session ended',
    roleHost: 'Host',
    roleGuest: 'Guest',
    messagePlaceholder: 'Type a message...',
    sendButton: 'Send',
    endSession: 'End Session',
    endSessionConfirm: 'Are you sure you want to end this session? The token will be decommissioned and cannot be reused.',
    endSessionCancel: 'Cancel',
    endSessionConfirmButton: 'End Session',
    videoCall: 'Video Call',
    endVideo: 'End Video',
    incomingCall: 'The other participant wants to start a video call',
    accept: 'Accept',
    decline: 'Decline',
    connecting: 'Connecting...',
    noMessages: 'No messages yet',
    reorderMessages: 'Reorder',
    startTyping: 'Start typing to chat...',
    waitingForParticipant: 'Waiting for the other participant to join...',
    sendFailed: 'Send Failed',
    sendFailedMessage: 'Failed to send message',
    cameraError: 'Failed to start camera',
    sessionEndedByOther: 'The other participant has ended the session.',
    returnToHome: 'Return to Home',
  },

  // Common
  common: {
    back: 'Back',
    cancel: 'Cancel',
    confirm: 'Confirm',
    error: 'Error',
    retry: 'Retry',
    loading: 'Loading...',
    close: 'Close',
  },

  // Report Abuse
  reportAbuse: {
    title: 'Report abuse',
    helper: 'End the session and notify ChatOrbit about unlawful behavior.',
    // Warning stage
    warningTitle: 'Report abusive or illegal behavior',
    warningDescription: 'Abuse reports are taken extremely seriously. False or malicious reports may be shared with law enforcement and could lead to penalties. If you continue, the current session will be terminated and our team will investigate the incident. Please proceed only if you believe the activity may violate the law or our terms of service.',
    warningNote: 'If someone is in immediate danger, contact local emergency services first.',
    continueButton: 'Continue',
    // Form stage
    formTitle: 'Submit abuse report',
    formDescription: 'Provide the details below so our incident response team can investigate. You will receive an email confirming the report once it has been recorded.',
    emailLabel: 'Contact email',
    emailPlaceholder: 'you@example.com',
    summaryLabel: 'Summary of the incident',
    summaryPlaceholder: 'Describe what happened and why it is abusive.',
    questionnaireTitle: 'Questionnaire',
    immediateThreat: 'Someone may be in immediate danger.',
    criminalActivity: 'The behavior may involve criminal activity.',
    followUp: 'I am willing to cooperate with a follow-up investigation.',
    additionalDetailsLabel: 'Additional context (optional)',
    additionalDetailsPlaceholder: 'Any additional notes, evidence, or identifiers that may help our team.',
    submitButton: 'Submit report',
    submitting: 'Submitting…',
    // Success stage
    successTitle: 'Report received',
    successDescription: 'Thank you. We have recorded the incident and ended the current session. A confirmation email has been sent to you—please keep it for your records. Our team will contact you if we need additional information.',
    // Errors
    submitError: 'Unable to submit report. Please try again.',
  },

  // Terms Consent Modal (shown on first app launch)
  termsConsent: {
    title: 'Review and accept the Terms of Service',
    description: 'The app will only start after you confirm that you have read and agree to the Terms of Service. Last updated {date}.',
    helper: 'Scroll through the entire document to enable the AGREE button.',
    agree: 'AGREE',
    cancel: 'Cancel',
  },

  // Navigation / Menu
  navigation: {
    help: 'Help & FAQ',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    settings: 'Settings',
    about: 'About',
    support: 'Support',
  },

  // Settings page
  settings: {
    title: 'Settings',
    subtitle: 'Customize your ChatOrbit experience',
    backgroundPattern: 'Background Pattern',
    backgroundPatternDescription: 'Choose a pattern for the app background',
    patternSize: 'Pattern Size',
    patternSizeDescription: 'Adjust the size of the pattern elements',
    patternDimmer: 'Pattern Brightness',
    patternDimmerDescription: 'Adjust the visibility of the background pattern',
    patterns: {
      logo: 'Logo',
      bubbles: 'Bubbles',
      orbits: 'Orbits',
      hexagons: 'Hexagons',
      waves: 'Waves',
      constellation: 'Constellation',
      mesh: 'Mesh',
      diamonds: 'Diamonds',
      shields: 'Shields',
      circuits: 'Circuits',
      hologram: 'Hologram',
      panels: 'Panels',
      scanlines: 'Scanlines',
      reactor: 'Reactor',
    },
    infoText: 'Your settings are saved locally on this device and will persist between app launches.',
  },

  // Help page
  help: {
    heading: 'Help & FAQ',
    intro: 'Having trouble starting a video chat? Follow the steps below for your device to restore camera and microphone access and get back into your session.',
    troubleshootingTitle: 'Video call fails or camera never starts',
    troubleshootingDescription: 'ChatOrbit needs permission to use both your camera and microphone before a call can begin. If either permission is blocked, the call request will stop with an error. Use the tips below for your platform to re-enable access.',
    sections: {
      iphone: {
        title: 'iPhone and iPad (Safari or Firefox)',
        steps: [
          'Open Settings → Privacy & Security → Camera/Microphone and make sure Firefox or Safari is allowed to use both.',
          'In the browser, open the address bar menu for your session and set both Camera and Microphone permissions to Allow.',
          'If prompts still do not appear, clear the website data for chat-orbit.com (or your deployment) and reload the session to trigger a fresh permission request.',
        ],
      },
      android: {
        title: 'Android (Chrome, Firefox, or Edge)',
        steps: [
          'Check Settings → Apps → [Browser] → Permissions and confirm Camera and Microphone are enabled.',
          'Within the browser, tap the lock icon in the address bar and turn on both permissions for the site.',
          'Reload the page. If the call still fails, try starting the video request from the affected device so the permission prompt happens in direct response to your tap.',
        ],
      },
      desktop: {
        title: 'Desktop (Windows, macOS, or Linux)',
        steps: [
          'Close any other application that might already be using the camera or microphone.',
          'Use the browser\'s site information panel (typically the lock icon) to allow Camera and Microphone access.',
          'On macOS, open System Settings → Privacy & Security → Camera/Microphone and enable access for your browser. On Windows, go to Settings → Privacy & security → Camera/Microphone and make sure both system-wide and browser-specific toggles are on.',
        ],
      },
    },
    contactForm: {
      title: 'Contact Support',
      description: 'Have a question or need help? Send us a message and we will get back to you.',
      namePlaceholder: 'Your name',
      emailPlaceholder: 'you@example.com',
      subjectLabel: 'Subject',
      subjectOptions: {
        general: 'General Question',
        technical: 'Technical Issue',
        feature: 'Feature Request',
        other: 'Other',
      },
      messagePlaceholder: 'Describe your question or issue…',
      send: 'Send Message',
      sending: 'Sending…',
      success: 'Your message has been sent. We will get back to you soon.',
      error: 'Failed to send message. Please try again later.',
      required: 'This field is required.',
      invalidEmail: 'Please enter a valid email address.',
    },
  },

  // Terms of Service page
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'Last updated {date}',
    lastUpdatedDate: 'October 14, 2025',
    sections: [
      {
        title: '1. Acceptance of Terms',
        body: 'By accessing or using ChatOrbit (the "Service"), you agree to these Terms of Service. You must be at least 18 years old or have the legal capacity to enter into a binding agreement. If you do not agree, you may not use the Service.',
      },
      {
        title: '2. Description of Service',
        body: 'ChatOrbit is a peer-to-peer communication platform that connects participants directly using WebRTC technology. Messages travel straight between browsers without being stored on our servers. When supported by both browsers, end to end encryption using AES-GCM with keys derived from session tokens ensures that only the intended recipients can read the content.',
      },
      {
        title: '3. Prohibited Uses',
        body: 'You agree that you will not use the Service to: engage in illegal activity or violate any applicable law or regulation; harass, threaten, defame, or otherwise harm other users; transmit malware, viruses, or other harmful code; bypass or undermine security, encryption, or authentication mechanisms; impersonate another person or entity or submit false information. Any violation may result in immediate termination of access without notice.',
      },
      {
        title: '4. Session Lifecycle',
        body: 'Tokens can only be claimed within their activation window and expire automatically afterwards. Once two participants connect, a countdown begins. When it reaches zero, the session closes itself and cannot be reopened. Either participant may actively end a session at any time. When you choose to end a session, it is flagged as deleted in the database, all participants are notified, and the token can no longer be reused.',
      },
      {
        title: '5. No Message Storage or Backdoors',
        body: 'ChatOrbit does not store message content or encryption keys. Messages exist only in device memory during an active session. The Service is designed without backdoors or mechanisms that would allow us to decrypt messages. Signaling servers may temporarily process metadata such as session tokens, participant identifiers, and connection status to facilitate communication, but this information is not retained longer than necessary.',
      },
      {
        title: '6. User Responsibilities',
        body: 'You are solely responsible for your use of the Service and for the content you share. You must comply with all laws regarding data protection, privacy, and electronic communications. Because communications are peer to peer, you should only share session tokens with trusted parties and must secure your devices against unauthorized access.',
      },
      {
        title: '7. Intellectual Property',
        body: 'The Service, including code, design, and documentation, is the property of ChatOrbit and its licensors. You may not copy, modify, distribute, reverse engineer, or create derivative works except as permitted by applicable open-source licenses or with our prior written consent.',
      },
      {
        title: '8. Disclaimer of Warranties',
        body: 'The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the Service will be uninterrupted, secure, or error free.',
      },
      {
        title: '9. Limitation of Liability',
        body: 'To the fullest extent permitted by law, ChatOrbit will not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from or related to your use of the Service, including loss of data, privacy breaches, or illegal activity conducted by users. Our aggregate liability will not exceed the amount you paid (if any) in the twelve months preceding the claim.',
      },
      {
        title: '10. Indemnification',
        body: 'You agree to indemnify and hold harmless ChatOrbit, its affiliates, and agents from any claims, liabilities, damages, or expenses (including legal fees) arising from your use of the Service or violation of these Terms.',
      },
      {
        title: '11. Termination',
        body: 'We may suspend or terminate your access to the Service at our discretion, with or without notice, for any reason including suspected violations of these Terms or unlawful conduct.',
      },
      {
        title: '12. Governing Law',
        body: 'These Terms are governed by the laws of California, USA, without regard to conflict of law principles. You agree to submit to the exclusive jurisdiction of the state and federal courts located in California for resolution of any dispute related to the Service.',
      },
      {
        title: '13. Changes to Terms',
        body: 'We may update these Terms to reflect new features, legal requirements, or operational changes. When revisions are material we will post an updated notice in the application. Continued use of ChatOrbit after changes take effect constitutes acceptance of the revised Terms.',
      },
      {
        title: '14. Contact',
        body: 'Questions about these terms can be sent to legal@chatorbit.com.',
      },
    ],
  },

  // Privacy Policy page
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'Last updated {date}',
    lastUpdatedDate: 'October 14, 2025',
    sections: [
      {
        title: '1. Our Commitment to Privacy',
        body: 'ChatOrbit is designed to prioritize private, ephemeral conversations. The Service connects participants using peer-to-peer WebRTC technology so that messages flow directly between devices. When supported by both browsers, end to end encryption keeps message content accessible only to intended recipients.',
      },
      {
        title: '2. Information We Collect',
        body: 'Session metadata: We temporarily process session tokens, participant identifiers, countdown configuration, and connection status to coordinate joins and show who is connected. Signaling details: Our signaling server exchanges ICE candidates and WebSocket messages needed to establish a connection. These messages may include IP addresses and browser networking information. STUN/TURN authentication: Third-party relay services receive short-lived nonces (valid for 600 seconds) and IP addresses strictly to facilitate NAT traversal. Optional diagnostics: If you opt into client debugging, limited technical logs may be saved to your local device to troubleshoot connectivity issues.',
      },
      {
        title: '3. How We Use Your Information',
        body: 'The information described above is used solely to facilitate peer-to-peer connections, authenticate legitimate access to STUN/TURN servers, monitor whether a session remains active, and protect the Service from abuse. We do not profile users or use data for advertising.',
      },
      {
        title: '4. End-to-End Encryption',
        body: 'When supported, ChatOrbit negotiates AES-GCM encryption with keys derived from session tokens directly on users\' devices. We do not receive these keys and cannot decrypt message content. If encryption is not available in one or both browsers, messages are transmitted unencrypted and the application alerts participants.',
      },
      {
        title: '5. No Message Storage',
        body: 'Message content is never stored on our servers. Messages exist only in the memory of participating devices during an active session and disappear when the session ends or the application closes. This design means we cannot retrieve or provide message history to third parties, including law enforcement.',
      },
      {
        title: '6. Cookies and Local Storage',
        body: 'ChatOrbit relies on minimal local storage to remember session tokens on the same device. We do not use advertising cookies, third party analytics beacons, or cross-site tracking technologies.',
      },
      {
        title: '7. Data Retention',
        body: 'Session metadata is retained only as long as necessary to coordinate active connections and enforce abuse prevention. Logs related to security or fraud may be preserved for a limited period consistent with legal obligations.',
      },
      {
        title: '8. Your Choices',
        body: 'You can decline to generate or join sessions at any time. You may also delete local session data from your browser or use private browsing modes to avoid storing tokens. If you have questions about your information, contact us at privacy@chatorbit.com.',
      },
    ],
  },
};

export type AppTranslation = typeof baseTranslation;

export const TRANSLATIONS: Record<LanguageCode, AppTranslation> = {
  en: baseTranslation,
  sk: {
    languageSwitcher: {
      buttonLabel: 'Zmeniť jazyk',
      dialogTitle: 'Vyberte si jazyk',
    },

    landing: {
      getToken: 'Získať token',
      createRoom: 'Vytvoriť miestnosť',
      hasToken: 'Mám token',
      joinRoom: 'Vstúpiť',
      description:
        'Vygenerujte zdieľateľný prístupový token, pošlite ho kontaktu a stretnite sa v efemérnej miestnosti. Po pripojení sa spustí bezpečné odpočítavanie.',
      badgePrivate: 'Súkromné',
      badgeEncrypted: 'Šifrované',
      badgeEphemeral: 'Dočasné',
    },

    mint: {
      pageTitle: 'Vytvoriť novú reláciu',
      pageSubtitle: 'Nastavte parametre relácie',

      validityTitle: 'Platnosť tokenu',
      validityDescription: 'Ako dlho je možné token použiť na pripojenie',
      validityOptions: {
        oneDay: '1 deň',
        oneWeek: '1 týždeň',
        oneMonth: '1 mesiac',
        oneYear: '1 rok',
      },

      durationTitle: 'Trvanie relácie',
      durationDescription: 'Ako dlho relácia zostane aktívna',
      durationOptions: {
        fiveMin: '5 minút',
        fifteenMin: '15 minút',
        thirtyMin: '30 minút',
        oneHour: '1 hodina',
        threeHours: '3 hodiny',
        oneDay: '1 deň',
      },

      messageLimitTitle: 'Limit znakov správy',
      messageLimitDescription: 'Maximálny počet znakov na správu',
      messageLimitOptions: {
        chars200: '200 znakov',
        chars500: '500 znakov',
        chars1000: '1 000 znakov',
        chars2000: '2 000 znakov',
        chars5000: '5 000 znakov',
        chars10000: '10 000 znakov',
        chars16000: '16 000 znakov',
      },

      createButton: 'Vytvoriť token',
      creatingButton: 'Vytváram token...',

      successTitle: 'Token vytvorený!',
      successSubtitle: 'Zdieľajte tento token s druhým účastníkom',
      yourToken: 'Váš token',
      copyButton: 'Kopírovať',
      shareButton: 'Zdieľať',
      qrCodeButton: 'QR kód',
      qrCodeTitle: 'Naskenujte a pripojte sa',
      qrCodeHint: 'Naskenujte tento QR kód druhým zariadením pre pripojenie k relácii',
      startSessionButton: 'Spustiť reláciu',
      joiningButton: 'Pripájam...',
      createAnotherButton: 'Vytvoriť ďalší token',

      invalidParams: 'Neplatné parametre',
      errorTitle: 'Chyba',
      copied: 'Skopírované!',
      copiedMessage: 'Token bol skopírovaný do schránky',
      noTokenError: 'Žiadny token nie je k dispozícii',

      shareMessage: 'Pripoj sa k mojej ChatOrbit relácii!\n\nToken: {token}\n\nOtvor aplikáciu ChatOrbit, ťukni na „Mám token" a vlož tento token na pripojenie.',
      shareTitle: 'ChatOrbit token relácie',

      // Ad related
      adRequiredTitle: 'Pozrite si reklamu',
      adRequiredMessage: 'Pozrite si celú reklamu a získajte token zadarmo.',
      adLoadingButton: 'Načítava sa reklama...',
      watchAdButton: 'Pozrieť reklamu a vygenerovať',
    },

    accept: {
      pageTitle: 'Pripojiť sa k relácii',
      pageSubtitle: 'Zadajte token, ktorý ste dostali',

      tokenTitle: 'Token relácie',
      tokenDescription: 'Vložte 32-znakový token, ktorý vám bol zdieľaný',
      tokenPlaceholder: 'Vložte token sem',

      joinButton: 'Pripojiť sa',

      footer: 'Mobil-mobil • End-to-end šifrovanie',

      invalidToken: 'Neplatný token',
      invalidTokenMessage: 'Prosím vložte platný 32-znakový token',
      joinFailed: 'Pripojenie zlyhalo',
      failedMessage: 'Nepodarilo sa pripojiť k relácii',
      scanQRButton: 'Skenovať QR kód',
      scanQRTitle: 'Skenovať QR kód',
      scanQRHint: 'Namierte kameru na QR kód pre skenovanie tokenu relácie',
      invalidQRCode: 'Tento QR kód neobsahuje platný token relácie',
      cameraPermissionDenied: 'Na skenovanie QR kódov je potrebné povolenie kamery',
    },

    session: {
      statusWaiting: 'Čakám na partnera...',
      statusConnected: 'Pripojené',
      statusEnded: 'Relácia ukončená',
      roleHost: 'Hostiteľ',
      roleGuest: 'Hosť',
      messagePlaceholder: 'Napíšte správu...',
      sendButton: 'Odoslať',
      endSession: 'Ukončiť reláciu',
      endSessionConfirm: 'Naozaj chcete ukončiť túto reláciu? Token bude zneplatnený a nebude ho možné znovu použiť.',
      endSessionCancel: 'Zrušiť',
      endSessionConfirmButton: 'Ukončiť reláciu',
      videoCall: 'Videohovor',
      endVideo: 'Ukončiť video',
      incomingCall: 'Druhý účastník chce začať videohovor',
      accept: 'Prijať',
      decline: 'Odmietnuť',
      connecting: 'Pripájam...',
      noMessages: 'Zatiaľ žiadne správy',
      reorderMessages: 'Zoradiť',
      startTyping: 'Začnite písať...',
      waitingForParticipant: 'Čakám na pripojenie druhého účastníka...',
      sendFailed: 'Odoslanie zlyhalo',
      sendFailedMessage: 'Správu sa nepodarilo odoslať',
      cameraError: 'Nepodarilo sa spustiť kameru',
      sessionEndedByOther: 'Druhý účastník ukončil reláciu.',
      returnToHome: 'Späť na domov',
    },

    common: {
      back: 'Späť',
      cancel: 'Zrušiť',
      confirm: 'Potvrdiť',
      error: 'Chyba',
      retry: 'Skúsiť znova',
      loading: 'Načítavam...',
      close: 'Zavrieť',
    },

    reportAbuse: {
      title: 'Nahlásiť zneužitie',
      helper: 'Ukončite reláciu a informujte ChatOrbit o protiprávnom správaní.',
      // Warning stage
      warningTitle: 'Nahlásiť zneužívajúce alebo nezákonné správanie',
      warningDescription: 'Hlásenia o zneužití berieme mimoriadne vážne. Falošné alebo zlomyseľné hlásenia môžu byť zdieľané s orgánmi činnými v trestnom konaní a môžu viesť k postihom. Ak budete pokračovať, aktuálna relácia bude ukončená a náš tím incident prešetrí. Pokračujte len vtedy, ak sa domnievate, že činnosť môže porušovať zákon alebo naše podmienky používania.',
      warningNote: 'Ak je niekto v bezprostrednom nebezpečenstve, najprv kontaktujte miestne záchranné služby.',
      continueButton: 'Pokračovať',
      // Form stage
      formTitle: 'Odoslať hlásenie o zneužití',
      formDescription: 'Poskytnite nižšie uvedené údaje, aby náš tím pre riešenie incidentov mohol situáciu prešetriť. Po zaznamenaní hlásenia vám bude zaslaný potvrdzujúci email.',
      emailLabel: 'Kontaktný email',
      emailPlaceholder: 'vas@email.com',
      summaryLabel: 'Zhrnutie incidentu',
      summaryPlaceholder: 'Popíšte, čo sa stalo a prečo je to zneužívajúce.',
      questionnaireTitle: 'Dotazník',
      immediateThreat: 'Niekto môže byť v bezprostrednom nebezpečenstve.',
      criminalActivity: 'Správanie môže zahŕňať trestnú činnosť.',
      followUp: 'Som ochotný/á spolupracovať na následnom vyšetrovaní.',
      additionalDetailsLabel: 'Dodatočný kontext (voliteľné)',
      additionalDetailsPlaceholder: 'Akékoľvek ďalšie poznámky, dôkazy alebo identifikátory, ktoré môžu pomôcť nášmu tímu.',
      submitButton: 'Odoslať hlásenie',
      submitting: 'Odosielam…',
      // Success stage
      successTitle: 'Hlásenie prijaté',
      successDescription: 'Ďakujeme. Zaznamenali sme incident a ukončili aktuálnu reláciu. Potvrdzujúci email vám bol odoslaný – uchovajte si ho pre svoje záznamy. Náš tím vás bude kontaktovať, ak budeme potrebovať ďalšie informácie.',
      // Errors
      submitError: 'Nepodarilo sa odoslať hlásenie. Skúste to znova.',
    },

    // Terms Consent Modal (shown on first app launch)
    termsConsent: {
      title: 'Skontrolujte a potvrďte Podmienky používania',
      description: 'Aplikácia sa spustí až po tom, čo potvrdíte, že ste si prečítali a súhlasíte s Podmienkami používania. Naposledy aktualizované {date}.',
      helper: 'Prejdite celý dokument, aby sa tlačidlo SÚHLASÍM aktivovalo.',
      agree: 'SÚHLASÍM',
      cancel: 'Zrušiť',
    },

    navigation: {
      help: 'Pomoc a FAQ',
      terms: 'Podmienky používania',
      privacy: 'Ochrana súkromia',
      settings: 'Nastavenia',
      about: 'O aplikácii',
      support: 'Podpora',
    },

    // Settings page
    settings: {
      title: 'Nastavenia',
      subtitle: 'Prispôsobte si ChatOrbit podľa seba',
      backgroundPattern: 'Vzor pozadia',
      backgroundPatternDescription: 'Vyberte vzor pre pozadie aplikácie',
      patternSize: 'Veľkosť vzoru',
      patternSizeDescription: 'Upravte veľkosť prvkov vzoru',
      patternDimmer: 'Jas vzoru',
      patternDimmerDescription: 'Upravte viditeľnosť vzoru pozadia',
      patterns: {
        logo: 'Logo',
        bubbles: 'Bubliny',
        orbits: 'Orbity',
        hexagons: 'Šesťuholníky',
        waves: 'Vlny',
        constellation: 'Súhvezdie',
        mesh: 'Sieť',
        diamonds: 'Diamanty',
        shields: 'Štíty',
        circuits: 'Obvody',
        hologram: 'Hologram',
        panels: 'Panely',
        scanlines: 'Skenovacie línie',
        reactor: 'Reaktor',
      },
      infoText: 'Vaše nastavenia sú uložené lokálne na tomto zariadení a budú zachované medzi spusteniami aplikácie.',
    },

    help: {
      heading: 'Pomoc a FAQ',
      intro: 'Máte problém spustiť videochat? Nasledujte kroky podľa svojho zariadenia a obnovte prístup ku kamere a mikrofónu, aby ste sa mohli vrátiť do relácie.',
      troubleshootingTitle: 'Videohovor zlyhá alebo sa kamera nespustí',
      troubleshootingDescription: 'ChatOrbit potrebuje povolenie na používanie kamery aj mikrofónu ešte pred začiatkom hovoru. Ak je niektoré povolenie zablokované, požiadavka sa zastaví s chybou. Pomocou tipov nižšie podľa svojej platformy povolenia znovu povoľte.',
      sections: {
        iphone: {
          title: 'iPhone a iPad (Safari alebo Firefox)',
          steps: [
            'Otvorte Nastavenia → Ochrana súkromia a bezpečnosť → Kamera/Mikrofón a uistite sa, že Firefox alebo Safari má povolený prístup k obom.',
            'V prehliadači otvorte menu v paneli s adresou pre vašu reláciu a nastavte povolenia Kamera aj Mikrofón na Povoliť.',
            'Ak sa výzvy stále nezobrazujú, vymažte údaje webu pre chat-orbit.com (alebo vašu inštaláciu) a reláciu načítajte znova, aby sa spustila nová žiadosť o povolenie.',
          ],
        },
        android: {
          title: 'Android (Chrome, Firefox alebo Edge)',
          steps: [
            'Skontrolujte Nastavenia → Aplikácie → [Prehliadač] → Povolenia a overte, že kamera aj mikrofón sú povolené.',
            'V prehliadači ťuknite na ikonu zámku v adresnom riadku a povoľte obe povolenia pre stránku.',
            'Načítajte stránku znova. Ak hovor stále zlyháva, skúste spustiť požiadavku na video z postihnutého zariadenia, aby výzva na povolenie prišla priamo ako reakcia na váš dotyk.',
          ],
        },
        desktop: {
          title: 'Desktop (Windows, macOS alebo Linux)',
          steps: [
            'Zatvorte iné aplikácie, ktoré už môžu používať kameru alebo mikrofón.',
            'Použite panel informácií o stránke v prehliadači (zvyčajne ikona zámku) a povoľte prístup ku kamere a mikrofónu.',
            'V macOS otvorte System Settings → Privacy & Security → Camera/Microphone a povoľte prístup pre svoj prehliadač. Vo Windows prejdite do Nastavenia → Ochrana osobných údajov a zabezpečenie → Kamera/Mikrofón a uistite sa, že sú zapnuté systémové aj prehliadačové prepínače.',
          ],
        },
      },
      contactForm: {
        title: 'Kontaktovať podporu',
        description: 'Máte otázku alebo potrebujete pomoc? Pošlite nám správu a ozveme sa vám.',
        namePlaceholder: 'Vaše meno',
        emailPlaceholder: 'vas@email.com',
        subjectLabel: 'Predmet',
        subjectOptions: {
          general: 'Všeobecná otázka',
          technical: 'Technický problém',
          feature: 'Požiadavka na funkciu',
          other: 'Iné',
        },
        messagePlaceholder: 'Opíšte svoju otázku alebo problém…',
        send: 'Odoslať správu',
        sending: 'Odosiela sa…',
        success: 'Vaša správa bola odoslaná. Čoskoro sa vám ozveme.',
        error: 'Správu sa nepodarilo odoslať. Skúste to neskôr.',
        required: 'Toto pole je povinné.',
        invalidEmail: 'Zadajte platnú e-mailovú adresu.',
      },
    },

    terms: {
      title: 'Podmienky používania',
      lastUpdated: 'Naposledy aktualizované {date}',
      lastUpdatedDate: '14. októbra 2025',
      sections: [
        {
          title: '1. Prijatie podmienok',
          body: 'Používaním služby ChatOrbit (ďalej len „Služba") súhlasíte s týmito Podmienkami používania. Musíte mať aspoň 18 rokov alebo právnu spôsobilosť uzavrieť záväznú zmluvu. Ak nesúhlasíte, službu nemôžete používať.',
        },
        {
          title: '2. Popis služby',
          body: 'ChatOrbit je komunikačná platforma typu peer-to-peer, ktorá spája účastníkov priamo pomocou technológie WebRTC. Správy putujú priamo medzi prehliadačmi bez ukladania na našich serveroch. Ak to prehliadače podporujú, end-to-end šifrovanie AES-GCM s kľúčmi odvodenými z tokenov relácie zabezpečí, že obsah si prečítajú len určení príjemcovia.',
        },
        {
          title: '3. Zakázané použitia',
          body: 'Zaväzujete sa, že službu nebudete používať na: páchanie nezákonnej činnosti alebo porušovanie zákonov a predpisov; obťažovanie, vyhrážanie sa, ohováranie či iné ubližovanie používateľom; šírenie malvéru, vírusov alebo iného škodlivého kódu; obchádzanie či narúšanie bezpečnostných, šifrovacích alebo autentifikačných mechanizmov; vydávanie sa za inú osobu alebo poskytovanie nepravdivých informácií. Akékoľvek porušenie môže viesť k okamžitému zrušeniu prístupu bez predchádzajúceho upozornenia.',
        },
        {
          title: '4. Životný cyklus relácie',
          body: 'Tokeny je možné uplatniť iba v rámci aktivačného okna; po jeho skončení sa automaticky zneplatnia. Keď sa pripoja dvaja účastníci, spustí sa odpočítavanie. Po jeho skončení sa relácia uzavrie a nie je možné ju znovu otvoriť. Každý účastník môže reláciu kedykoľvek ukončiť. Po ukončení sa relácia označí ako zmazaná, všetci účastníci sú informovaní a token už nie je možné znova použiť.',
        },
        {
          title: '5. Bez ukladania správ a zadných vrátok',
          body: 'ChatOrbit neukladá obsah správ ani šifrovacie kľúče. Správy existujú len v pamäti zariadení počas aktívnej relácie. Služba je navrhnutá bez zadných vrátok alebo mechanizmov, ktoré by nám umožnili správy dešifrovať. Signalizačné servery môžu dočasne spracúvať metadáta, ako sú tokeny relácií, identifikátory účastníkov a stav pripojenia, iba na uľahčenie komunikácie a tieto informácie sa neuchovávajú dlhšie, než je nevyhnutné.',
        },
        {
          title: '6. Zodpovednosť používateľa',
          body: 'Za svoje používanie služby a obsah, ktorý zdieľate, nesiete plnú zodpovednosť. Musíte dodržiavať všetky zákony týkajúce sa ochrany údajov, súkromia a elektronickej komunikácie. Keďže komunikácia prebieha priamo medzi účastníkmi, tokeny relácií zdieľajte len s dôveryhodnými osobami a svoje zariadenia chráňte pred neoprávneným prístupom.',
        },
        {
          title: '7. Duševné vlastníctvo',
          body: 'Služba vrátane kódu, dizajnu a dokumentácie je majetkom ChatOrbit a jeho poskytovateľov licencií. Bez nášho predchádzajúceho písomného súhlasu nesmiete kopírovať, upravovať, distribuovať, spätne analyzovať ani vytvárať odvodené diela, okrem prípadov, ktoré povoľujú príslušné open-source licencie.',
        },
        {
          title: '8. Zrieknutie sa záruk',
          body: 'Služba sa poskytuje „tak, ako je" a „ako je dostupná" bez akýchkoľvek záruk, či už výslovných alebo implicitných, vrátane záruky predajnosti, vhodnosti na konkrétny účel alebo neporušovania práv. Nezaručujeme nepretržitú, bezpečnú ani bezchybnú prevádzku služby.',
        },
        {
          title: '9. Obmedzenie zodpovednosti',
          body: 'V maximálnom rozsahu povolenom zákonom nebude ChatOrbit zodpovedať za žiadne priame, nepriame, náhodné, následné ani represívne škody vzniknuté používaním služby vrátane straty údajov, porušenia súkromia alebo nezákonnej činnosti používateľov. Naša celková zodpovednosť neprekročí sumu, ktorú ste zaplatili (ak vôbec) za dvanásť mesiacov pred uplatnením nároku.',
        },
        {
          title: '10. Odškodnenie',
          body: 'Súhlasíte, že odškodníte a budete chrániť ChatOrbit, jeho pobočky a zástupcov pred nárokmi, zodpovednosťou, škodami alebo výdavkami (vrátane právnych poplatkov) vyplývajúcimi z používania služby alebo porušenia týchto podmienok.',
        },
        {
          title: '11. Ukončenie',
          body: 'Môžeme pozastaviť alebo ukončiť váš prístup k službe podľa vlastného uváženia, s upozornením alebo bez neho, z akéhokoľvek dôvodu vrátane podozrenia na porušenie týchto podmienok alebo nezákonného konania.',
        },
        {
          title: '12. Rozhodné právo',
          body: 'Tieto podmienky sa riadia právom štátu Kalifornia, USA, bez ohľadu na kolízne normy. Súhlasíte s výlučnou právomocou súdov v Kalifornii pri riešení sporov súvisiacich so službou.',
        },
        {
          title: '13. Zmeny podmienok',
          body: 'Podmienky môžeme aktualizovať z dôvodu nových funkcií, legislatívnych požiadaviek alebo prevádzkových zmien. Ak pôjde o zásadné úpravy, zverejníme o tom oznámenie v aplikácii. Pokračovaním v používaní ChatOrbit po účinnosti zmien vyjadrujete súhlas s aktualizovanými podmienkami.',
        },
        {
          title: '14. Kontakt',
          body: 'Otázky k týmto podmienkam môžete poslať na adresu legal@chatorbit.com.',
        },
      ],
    },

    privacy: {
      title: 'Ochrana súkromia',
      lastUpdated: 'Naposledy aktualizované {date}',
      lastUpdatedDate: '14. októbra 2025',
      sections: [
        {
          title: '1. Náš záväzok k súkromiu',
          body: 'ChatOrbit je navrhnutý tak, aby uprednostňoval súkromné a dočasné rozhovory. Služba spája účastníkov pomocou technológie WebRTC typu peer-to-peer, takže správy putujú priamo medzi zariadeniami. Ak to podporujú oba prehliadače, end-to-end šifrovanie zaručí, že obsah správ je dostupný len určeným príjemcom.',
        },
        {
          title: '2. Aké informácie zhromažďujeme',
          body: 'Metadáta relácie: Dočasne spracúvame tokeny relácií, identifikátory účastníkov, nastavenia odpočítavania a stav pripojenia na koordináciu prístupov a zobrazenie pripojených osôb. Signalizačné údaje: Náš signalizačný server si vymieňa ICE kandidátov a správy WebSocket potrebné na nadviazanie spojenia. Tieto správy môžu obsahovať IP adresy a sieťové informácie prehliadača. Overenie STUN/TURN: Služby tretích strán získavajú krátkodobé nonce (platné 600 sekúnd) a IP adresy výlučne na uľahčenie prechodu cez NAT. Voliteľná diagnostika: Ak sa rozhodnete pre klientské ladenie, na vašom zariadení sa môžu ukladať obmedzené technické logy na riešenie problémov s pripojením.',
        },
        {
          title: '3. Ako používame vaše informácie',
          body: 'Vyššie uvedené informácie slúžia výlučne na uľahčenie spojenia peer-to-peer, overenie legitímneho prístupu k serverom STUN/TURN, sledovanie aktivity relácií a ochranu služby pred zneužitím. Neposkytujeme profilovanie používateľov ani nepoužívame údaje na reklamné účely.',
        },
        {
          title: '4. End-to-end šifrovanie',
          body: 'Ak je k dispozícii, ChatOrbit vyjednáva šifrovanie AES-GCM s kľúčmi odvodenými z tokenov relácie priamo v zariadeniach používateľov. Tieto kľúče nedostávame a obsah správ nedokážeme dešifrovať. Ak šifrovanie nie je dostupné v jednom alebo oboch prehliadačoch, správy sa prenášajú nešifrovane a aplikácia na to účastníkov upozorní.',
        },
        {
          title: '5. Žiadne ukladanie správ',
          body: 'Obsah správ sa na našich serveroch nikdy neukladá. Správy existujú len v pamäti zúčastnených zariadení počas aktívnej relácie a po jej skončení alebo zatvorení aplikácie zmiznú. Z tohto dôvodu nedokážeme obnoviť históriu správ pre tretie strany vrátane orgánov činných v trestnom konaní.',
        },
        {
          title: '6. Cookies a miestne úložisko',
          body: 'ChatOrbit používa len minimálne lokálne úložisko na zapamätanie tokenov na rovnakom zariadení. Nepoužívame reklamné cookies, sledovacie skripty tretích strán ani technológie krížového sledovania.',
        },
        {
          title: '7. Uchovávanie údajov',
          body: 'Metadáta relácií uchovávame len tak dlho, ako je potrebné na koordináciu pripojení a prevenciu zneužitia. Záznamy týkajúce sa bezpečnosti alebo podvodov môžu byť dočasne uchované v súlade s právnymi povinnosťami.',
        },
        {
          title: '8. Vaše možnosti',
          body: 'Reláciu môžete kedykoľvek odmietnuť vytvoriť alebo sa k nej pripojiť. Lokálne údaje o relácii môžete z prehliadača vymazať alebo používať režim súkromného prehliadania, aby sa tokeny neukladali. Ak máte otázky o svojich údajoch, kontaktujte nás na privacy@chatorbit.com.',
        },
      ],
    },
  },
  hu: {
    languageSwitcher: {
      buttonLabel: 'Nyelv váltása',
      dialogTitle: 'Válasszon nyelvet',
    },

    landing: {
      getToken: 'Token kérése',
      createRoom: 'Szoba létrehozása',
      hasToken: 'Van tokenom',
      joinRoom: 'Belépés',
      description:
        'Generáljon megosztható hozzáférési tokent, küldje el a kapcsolattartójának, és találkozzon egy ideiglenes csevegőszobában. Csatlakozás után biztonságos visszaszámlálás indul.',
      badgePrivate: 'Privát',
      badgeEncrypted: 'Titkosított',
      badgeEphemeral: 'Ideiglenes',
    },

    mint: {
      pageTitle: 'Új munkamenet létrehozása',
      pageSubtitle: 'Állítsa be a munkamenet paramétereit',

      validityTitle: 'Token érvényessége',
      validityDescription: 'Meddig használható a token a csatlakozáshoz',
      validityOptions: {
        oneDay: '1 nap',
        oneWeek: '1 hét',
        oneMonth: '1 hónap',
        oneYear: '1 év',
      },

      durationTitle: 'Munkamenet időtartama',
      durationDescription: 'Meddig marad aktív a munkamenet',
      durationOptions: {
        fiveMin: '5 perc',
        fifteenMin: '15 perc',
        thirtyMin: '30 perc',
        oneHour: '1 óra',
        threeHours: '3 óra',
        oneDay: '1 nap',
      },

      messageLimitTitle: 'Üzenet karakterkorlát',
      messageLimitDescription: 'Maximum karakterszám üzenetenként',
      messageLimitOptions: {
        chars200: '200 karakter',
        chars500: '500 karakter',
        chars1000: '1 000 karakter',
        chars2000: '2 000 karakter',
        chars5000: '5 000 karakter',
        chars10000: '10 000 karakter',
        chars16000: '16 000 karakter',
      },

      createButton: 'Token létrehozása',
      creatingButton: 'Token létrehozása...',

      successTitle: 'Token létrehozva!',
      successSubtitle: 'Ossza meg ezt a tokent a másik résztvevővel',
      yourToken: 'Az Ön tokenje',
      copyButton: 'Másolás',
      shareButton: 'Megosztás',
      qrCodeButton: 'QR kód',
      qrCodeTitle: 'Szkennelés a csatlakozáshoz',
      qrCodeHint: 'Szkennelje be ezt a QR kódot egy másik eszközzel a munkamenethez való csatlakozáshoz',
      startSessionButton: 'Munkamenet indítása',
      joiningButton: 'Csatlakozás...',
      createAnotherButton: 'Másik token létrehozása',

      invalidParams: 'Érvénytelen paraméterek',
      errorTitle: 'Hiba',
      copied: 'Másolva!',
      copiedMessage: 'Token másolva a vágólapra',
      noTokenError: 'Nincs elérhető token',

      shareMessage: 'Csatlakozz a ChatOrbit munkamenetemhez!\n\nToken: {token}\n\nNyisd meg a ChatOrbit alkalmazást, érintsd meg a „Van tokenom" gombot, és illeszd be ezt a tokent a csatlakozáshoz.',
      shareTitle: 'ChatOrbit munkamenet token',

      adRequiredTitle: 'Nézzen meg egy hirdetést',
      adRequiredMessage: 'Nézze meg a teljes hirdetést az ingyenes token generálásához.',
      adLoadingButton: 'Hirdetés betöltése...',
      watchAdButton: 'Hirdetés megtekintése és generálás',
    },

    accept: {
      pageTitle: 'Csatlakozás munkamenethez',
      pageSubtitle: 'Adja meg a kapott tokent',

      tokenTitle: 'Munkamenet token',
      tokenDescription: 'Illessze be a megosztott 32 karakteres tokent',
      tokenPlaceholder: 'Illessze be ide a tokent',

      joinButton: 'Csatlakozás',

      footer: 'Mobil-mobil • Végponttól végpontig titkosított',

      invalidToken: 'Érvénytelen token',
      invalidTokenMessage: 'Kérjük, illesszen be egy érvényes 32 karakteres tokent',
      joinFailed: 'Csatlakozás sikertelen',
      failedMessage: 'Nem sikerült csatlakozni a munkamenethez',
      scanQRButton: 'QR kód szkennelése',
      scanQRTitle: 'QR kód szkennelése',
      scanQRHint: 'Irányítsa a kamerát a QR kódra a munkamenet token beolvasásához',
      invalidQRCode: 'Ez a QR kód nem tartalmaz érvényes munkamenet tokent',
      cameraPermissionDenied: 'A QR kódok szkenneléséhez kamera engedély szükséges',
    },

    session: {
      statusWaiting: 'Várakozás a partnerre...',
      statusConnected: 'Csatlakozva',
      statusEnded: 'Munkamenet véget ért',
      roleHost: 'Házigazda',
      roleGuest: 'Vendég',
      messagePlaceholder: 'Írjon üzenetet...',
      sendButton: 'Küldés',
      endSession: 'Munkamenet befejezése',
      endSessionConfirm: 'Biztosan be szeretné fejezni ezt a munkamenetet? A token érvénytelenítésre kerül és nem használható újra.',
      endSessionCancel: 'Mégse',
      endSessionConfirmButton: 'Munkamenet befejezése',
      videoCall: 'Videohívás',
      endVideo: 'Videó befejezése',
      incomingCall: 'A másik résztvevő videohívást szeretne indítani',
      accept: 'Elfogadás',
      decline: 'Elutasítás',
      connecting: 'Csatlakozás...',
      noMessages: 'Még nincsenek üzenetek',
      reorderMessages: 'Átrendezés',
      startTyping: 'Kezdjen el gépelni...',
      waitingForParticipant: 'Várakozás a másik résztvevő csatlakozására...',
      sendFailed: 'Küldés sikertelen',
      sendFailedMessage: 'Az üzenet küldése sikertelen',
      cameraError: 'Nem sikerült elindítani a kamerát',
      sessionEndedByOther: 'A másik résztvevő befejezte a munkamenetet.',
      returnToHome: 'Vissza a kezdőlapra',
    },

    common: {
      back: 'Vissza',
      cancel: 'Mégse',
      confirm: 'Megerősítés',
      error: 'Hiba',
      retry: 'Újra',
      loading: 'Betöltés...',
      close: 'Bezárás',
    },

    reportAbuse: {
      title: 'Visszaélés jelentése',
      helper: 'Fejezze be a munkamenetet és értesítse a ChatOrbit-ot a jogellenes viselkedésről.',
      warningTitle: 'Visszaélő vagy illegális viselkedés jelentése',
      warningDescription: 'A visszaélési jelentéseket rendkívül komolyan vesszük. A hamis vagy rosszindulatú jelentéseket megoszthatjuk a bűnüldöző szervekkel, és büntetéshez vezethetnek. Ha folytatja, a jelenlegi munkamenet megszűnik, és csapatunk kivizsgálja az esetet. Csak akkor folytassa, ha úgy véli, hogy a tevékenység sértheti a törvényt vagy felhasználási feltételeinket.',
      warningNote: 'Ha valaki közvetlen veszélyben van, először hívja a helyi segélyhívó szolgálatokat.',
      continueButton: 'Folytatás',
      formTitle: 'Visszaélési jelentés beküldése',
      formDescription: 'Adja meg az alábbi adatokat, hogy incidenskezelő csapatunk kivizsgálhassa az esetet. A jelentés rögzítése után e-mailben kapja meg a megerősítést.',
      emailLabel: 'Kapcsolattartási e-mail',
      emailPlaceholder: 'on@email.com',
      summaryLabel: 'Az incidens összefoglalása',
      summaryPlaceholder: 'Írja le, mi történt és miért visszaélő.',
      questionnaireTitle: 'Kérdőív',
      immediateThreat: 'Valaki közvetlen veszélyben lehet.',
      criminalActivity: 'A viselkedés bűncselekményt foglalhat magában.',
      followUp: 'Hajlandó vagyok együttműködni az utólagos vizsgálatban.',
      additionalDetailsLabel: 'További kontextus (opcionális)',
      additionalDetailsPlaceholder: 'Bármilyen további megjegyzés, bizonyíték vagy azonosító, amely segíthet csapatunknak.',
      submitButton: 'Jelentés beküldése',
      submitting: 'Beküldés...',
      successTitle: 'Jelentés megérkezett',
      successDescription: 'Köszönjük. Rögzítettük az incidenst és befejeztük a jelenlegi munkamenetet. Megerősítő e-mailt küldtünk Önnek – kérjük, őrizze meg a nyilvántartásához. Csapatunk felveszi Önnel a kapcsolatot, ha további információra van szükségünk.',
      submitError: 'Nem sikerült elküldeni a jelentést. Kérjük, próbálja újra.',
    },

    termsConsent: {
      title: 'Tekintse át és fogadja el a Felhasználási feltételeket',
      description: 'Az alkalmazás csak azután indul el, miután megerősíti, hogy elolvasta és elfogadja a Felhasználási feltételeket. Utolsó frissítés: {date}.',
      helper: 'Görgessen végig az egész dokumentumon az ELFOGADOM gomb aktiválásához.',
      agree: 'ELFOGADOM',
      cancel: 'Mégse',
    },

    navigation: {
      help: 'Súgó és GYIK',
      terms: 'Felhasználási feltételek',
      privacy: 'Adatvédelmi irányelvek',
      settings: 'Beállítások',
      about: 'Névjegy',
      support: 'Támogatás',
    },

    settings: {
      title: 'Beállítások',
      subtitle: 'Szabja személyre ChatOrbit élményét',
      backgroundPattern: 'Háttérminta',
      backgroundPatternDescription: 'Válasszon mintát az alkalmazás hátteréhez',
      patternSize: 'Minta mérete',
      patternSizeDescription: 'Állítsa be a mintaelemek méretét',
      patternDimmer: 'Minta fényereje',
      patternDimmerDescription: 'Állítsa be a háttérminta láthatóságát',
      patterns: {
        logo: 'Logó',
        bubbles: 'Buborékok',
        orbits: 'Pályák',
        hexagons: 'Hatszögek',
        waves: 'Hullámok',
        constellation: 'Csillagkép',
        mesh: 'Háló',
        diamonds: 'Gyémántok',
        shields: 'Pajzsok',
        circuits: 'Áramkörök',
        hologram: 'Hologram',
        panels: 'Panelek',
        scanlines: 'Pásztázó vonalak',
        reactor: 'Reaktor',
      },
      infoText: 'A beállítások helyben, ezen az eszközön mentődnek és megmaradnak az alkalmazás újraindításai között.',
    },

    help: {
      heading: 'Súgó és GYIK',
      intro: 'Problémái vannak a videochat indításával? Kövesse az alábbi lépéseket az eszközéhez, hogy visszaállítsa a kamera és mikrofon hozzáférést, és visszatérhessen a munkamenetéhez.',
      troubleshootingTitle: 'A videohívás sikertelen vagy a kamera nem indul el',
      troubleshootingDescription: 'A ChatOrbit-nak engedélyre van szüksége a kamera és a mikrofon használatához a hívás megkezdése előtt. Ha bármelyik engedély blokkolva van, a hívási kérelem hibával leáll. Az alábbi tippek segítségével engedélyezze újra a hozzáférést a platformján.',
      sections: {
        iphone: {
          title: 'iPhone és iPad (Safari vagy Firefox)',
          steps: [
            'Nyissa meg a Beállítások → Adatvédelem és biztonság → Kamera/Mikrofon menüpontot, és győződjön meg róla, hogy a Firefox vagy Safari engedélyezve van mindkettőhöz.',
            'A böngészőben nyissa meg a címsor menüt a munkamenetéhez, és állítsa mindkét engedélyt (Kamera és Mikrofon) Engedélyezés-re.',
            'Ha a kérések továbbra sem jelennek meg, törölje a webhelydata-t a chat-orbit.com-hoz (vagy a telepítéséhez), és töltse újra a munkamenetet egy friss engedélykérés indításához.',
          ],
        },
        android: {
          title: 'Android (Chrome, Firefox vagy Edge)',
          steps: [
            'Ellenőrizze a Beállítások → Alkalmazások → [Böngésző] → Engedélyek menüpontot, és győződjön meg róla, hogy a Kamera és Mikrofon engedélyezve van.',
            'A böngészőben érintse meg a lakat ikont a címsorban, és kapcsolja be mindkét engedélyt a webhelyhez.',
            'Töltse újra az oldalt. Ha a hívás továbbra is sikertelen, próbálja meg a videokérést az érintett eszközről indítani, hogy az engedélykérés közvetlenül az érintésére reagáljon.',
          ],
        },
        desktop: {
          title: 'Asztali (Windows, macOS vagy Linux)',
          steps: [
            'Zárja be az esetlegesen kamerát vagy mikrofont használó alkalmazásokat.',
            'Használja a böngésző webhely-információs paneljét (általában a lakat ikon) a Kamera és Mikrofon hozzáférés engedélyezéséhez.',
            'macOS-en nyissa meg a Rendszerbeállítások → Adatvédelem és biztonság → Kamera/Mikrofon menüpontot, és engedélyezze a böngészőjének. Windows-on lépjen a Beállítások → Adatvédelem és biztonság → Kamera/Mikrofon menüpontra, és győződjön meg róla, hogy a rendszerszintű és böngészőspecifikus kapcsolók is be vannak kapcsolva.',
          ],
        },
      },
      contactForm: {
        title: 'Támogatás elérése',
        description: 'Kérdése van vagy segítségre van szüksége? Küldjön nekünk üzenetet, és hamarosan válaszolunk.',
        namePlaceholder: 'Az Ön neve',
        emailPlaceholder: 'on@email.com',
        subjectLabel: 'Tárgy',
        subjectOptions: {
          general: 'Általános kérdés',
          technical: 'Technikai probléma',
          feature: 'Funkció kérés',
          other: 'Egyéb',
        },
        messagePlaceholder: 'Írja le kérdését vagy problémáját…',
        send: 'Üzenet küldése',
        sending: 'Küldés…',
        success: 'Az üzenete elküldve. Hamarosan válaszolunk.',
        error: 'Az üzenet küldése sikertelen. Kérjük, próbálja újra később.',
        required: 'Ez a mező kötelező.',
        invalidEmail: 'Kérjük, adjon meg egy érvényes e-mail címet.',
      },
    },

    terms: {
      title: 'Felhasználási feltételek',
      lastUpdated: 'Utolsó frissítés: {date}',
      lastUpdatedDate: '2025. október 14.',
      sections: [
        {
          title: '1. Feltételek elfogadása',
          body: 'A ChatOrbit (a „Szolgáltatás") elérésével vagy használatával Ön elfogadja ezeket a Felhasználási feltételeket. Legalább 18 évesnek kell lennie, vagy rendelkeznie kell a kötelező érvényű szerződés megkötéséhez szükséges jogképességgel. Ha nem ért egyet, nem használhatja a Szolgáltatást.',
        },
        {
          title: '2. A Szolgáltatás leírása',
          body: 'A ChatOrbit egy peer-to-peer kommunikációs platform, amely közvetlenül összeköti a résztvevőket WebRTC technológia segítségével. Az üzenetek közvetlenül a böngészők között utaznak anélkül, hogy a szervereinkön tárolódnának. Ha mindkét böngésző támogatja, a végponttól végpontig terjedő titkosítás AES-GCM-mel és a munkamenet tokenekből származtatott kulcsokkal biztosítja, hogy csak a címzettek olvashassák a tartalmat.',
        },
        {
          title: '3. Tiltott használat',
          body: 'Ön vállalja, hogy nem használja a Szolgáltatást: illegális tevékenységre vagy alkalmazandó törvények vagy rendeletek megsértésére; más felhasználók zaklatására, fenyegetésére, rágalmazására vagy egyéb módon történő bántalmazására; rosszindulatú programok, vírusok vagy más káros kódok továbbítására; biztonsági, titkosítási vagy hitelesítési mechanizmusok megkerülésére vagy aláásására; más személy vagy entitás megszemélyesítésére vagy hamis információk megadására. Bármilyen jogsértés azonnali hozzáférés-megszüntetést eredményezhet értesítés nélkül.',
        },
        {
          title: '4. Munkamenet életciklusa',
          body: 'A tokenek csak az aktiválási időablakon belül válthatók be, és utána automatikusan lejárnak. Amint két résztvevő csatlakozik, visszaszámlálás kezdődik. Amikor eléri a nullát, a munkamenet bezárul és nem nyitható újra. Bármelyik résztvevő bármikor aktívan befejezheti a munkamenetet. Amikor úgy dönt, hogy befejezi a munkamenetet, az törlöltként jelölődik meg az adatbázisban, minden résztvevő értesítést kap, és a token többé nem használható újra.',
        },
        {
          title: '5. Nincs üzenettárolás vagy hátsó ajtók',
          body: 'A ChatOrbit nem tárolja az üzenetek tartalmát vagy a titkosítási kulcsokat. Az üzenetek csak az eszközök memóriájában léteznek egy aktív munkamenet során. A Szolgáltatás hátsó ajtók vagy olyan mechanizmusok nélkül készült, amelyek lehetővé tennék számunkra az üzenetek visszafejtését. A jelzőszerverek ideiglenesen feldolgozhatnak metaadatokat, mint például munkamenet tokeneket, résztvevő azonosítókat és kapcsolat állapotot a kommunikáció elősegítése érdekében, de ezeket az információkat nem tartjuk meg a szükségesnél tovább.',
        },
        {
          title: '6. Felhasználói felelősségek',
          body: 'Ön kizárólagosan felelős a Szolgáltatás használatáért és a megosztott tartalomért. Be kell tartania az adatvédelemre, magánéletre és elektronikus kommunikációra vonatkozó összes törvényt. Mivel a kommunikáció peer-to-peer, a munkamenet tokeneket csak megbízható felekkel ossza meg, és biztosítsa eszközeit a jogosulatlan hozzáférés ellen.',
        },
        {
          title: '7. Szellemi tulajdon',
          body: 'A Szolgáltatás, beleértve a kódot, a dizájnt és a dokumentációt, a ChatOrbit és licenszadóinak tulajdona. Nem másolhatja, módosíthatja, terjesztheti, visszafejtheti vagy származékos műveket hozhat létre, kivéve ha ezt az alkalmazandó nyílt forráskódú licencek engedélyezik, vagy előzetes írásbeli hozzájárulásunkkal.',
        },
        {
          title: '8. Garanciák kizárása',
          body: 'A Szolgáltatást „ahogy van" és „ahogy elérhető" alapon nyújtjuk, mindenféle garancia nélkül, legyen az kifejezett vagy hallgatólagos, beleértve az eladhatóságot, egy adott célra való alkalmasságot vagy a jogsértés hiányát. Nem garantáljuk, hogy a Szolgáltatás megszakítás nélküli, biztonságos vagy hibamentes lesz.',
        },
        {
          title: '9. Felelősség korlátozása',
          body: 'A törvény által megengedett legteljesebb mértékig a ChatOrbit nem vállal felelősséget semmilyen közvetlen, közvetett, esetleges, következményes vagy büntető jellegű kárért, amely a Szolgáltatás használatából ered vagy azzal kapcsolatos, beleértve az adatvesztést, adatvédelmi incidenseket vagy a felhasználók által elkövetett illegális tevékenységet. Összesített felelősségünk nem haladja meg az Ön által (ha egyáltalán) a követelést megelőző tizenkét hónapban fizetett összeget.',
        },
        {
          title: '10. Kártalanítás',
          body: 'Ön vállalja, hogy kártalanítja és mentesíti a ChatOrbit-ot, leányvállalatait és ügynökeit minden követelés, felelősség, kár vagy költség (beleértve a jogi költségeket) alól, amely a Szolgáltatás használatából vagy ezen Feltételek megsértéséből ered.',
        },
        {
          title: '11. Megszüntetés',
          body: 'Saját belátásunk szerint felfüggeszthetjük vagy megszüntethetjük a Szolgáltatáshoz való hozzáférését, értesítéssel vagy anélkül, bármilyen okból, beleértve a Feltételek feltételezett megsértését vagy jogellenes magatartást.',
        },
        {
          title: '12. Irányadó jog',
          body: 'Ezekre a Feltételekre Kalifornia állam, USA törvényei az irányadók, a kollíziós jogi elvek figyelembevétele nélkül. Ön beleegyezik a Kaliforniában található állami és szövetségi bíróságok kizárólagos joghatóságába a Szolgáltatással kapcsolatos viták rendezésére.',
        },
        {
          title: '13. Feltételek módosítása',
          body: 'Frissíthetjük ezeket a Feltételeket új funkciók, jogi követelmények vagy működési változások tükrözése érdekében. Ha a módosítások lényegesek, frissített értesítést teszünk közzé az alkalmazásban. A ChatOrbit további használata a változások hatálybalépése után a módosított Feltételek elfogadását jelenti.',
        },
        {
          title: '14. Kapcsolat',
          body: 'A feltételekkel kapcsolatos kérdéseket a legal@chatorbit.com címre küldheti.',
        },
      ],
    },

    privacy: {
      title: 'Adatvédelmi irányelvek',
      lastUpdated: 'Utolsó frissítés: {date}',
      lastUpdatedDate: '2025. október 14.',
      sections: [
        {
          title: '1. Elkötelezettségünk a magánélet védelme iránt',
          body: 'A ChatOrbit úgy lett tervezve, hogy előnyben részesítse a privát, ideiglenes beszélgetéseket. A Szolgáltatás peer-to-peer WebRTC technológiával köti össze a résztvevőket, így az üzenetek közvetlenül az eszközök között áramlanak. Ha mindkét böngésző támogatja, a végponttól végpontig terjedő titkosítás biztosítja, hogy az üzenetek tartalma csak a címzettek számára legyen elérhető.',
        },
        {
          title: '2. Milyen információkat gyűjtünk',
          body: 'Munkamenet metaadatok: Ideiglenesen feldolgozzuk a munkamenet tokeneket, résztvevő azonosítókat, visszaszámlálási konfigurációt és kapcsolat állapotot a csatlakozások koordinálásához és a csatlakozott személyek megjelenítéséhez. Jelzési részletek: Jelzőszerverünk ICE jelölteket és WebSocket üzeneteket cserél a kapcsolat létrehozásához. Ezek az üzenetek tartalmazhatnak IP-címeket és böngésző hálózati információkat. STUN/TURN hitelesítés: Harmadik fél relészolgáltatások rövid élettartamú nonce-okat (600 másodpercig érvényesek) és IP-címeket kapnak kizárólag a NAT átjárás elősegítésére. Opcionális diagnosztika: Ha bekapcsolja a kliens hibakeresést, korlátozott technikai naplók menthetők a helyi eszközére a kapcsolódási problémák elhárításához.',
        },
        {
          title: '3. Hogyan használjuk az információit',
          body: 'A fent leírt információkat kizárólag a peer-to-peer kapcsolatok elősegítésére, a STUN/TURN szerverekhez való legitim hozzáférés hitelesítésére, a munkamenet aktív állapotának figyelésére és a Szolgáltatás visszaéléssel szembeni védelmére használjuk. Nem profilozzuk a felhasználókat és nem használjuk az adatokat hirdetésre.',
        },
        {
          title: '4. Végponttól végpontig terjedő titkosítás',
          body: 'Ha támogatott, a ChatOrbit AES-GCM titkosítást egyeztet a munkamenet tokenekből származtatott kulcsokkal közvetlenül a felhasználók eszközein. Ezeket a kulcsokat nem kapjuk meg és nem tudjuk visszafejteni az üzenetek tartalmát. Ha a titkosítás nem érhető el az egyik vagy mindkét böngészőben, az üzenetek titkosítatlanul kerülnek továbbításra, és az alkalmazás figyelmezteti a résztvevőket.',
        },
        {
          title: '5. Nincs üzenettárolás',
          body: 'Az üzenetek tartalma soha nem tárolódik a szervereinken. Az üzenetek csak a résztvevő eszközök memóriájában léteznek egy aktív munkamenet alatt, és eltűnnek, amikor a munkamenet véget ér vagy az alkalmazás bezárul. Ez a kialakítás azt jelenti, hogy nem tudjuk lekérni vagy biztosítani az üzenetelőzményeket harmadik feleknek, beleértve a bűnüldöző szerveket.',
        },
        {
          title: '6. Cookie-k és helyi tárolás',
          body: 'A ChatOrbit minimális helyi tárhelyre támaszkodik a munkamenet tokenek megjegyzéséhez ugyanazon az eszközön. Nem használunk hirdetési cookie-kat, harmadik fél analitikai jelzőfényeket vagy webhelyek közötti nyomkövető technológiákat.',
        },
        {
          title: '7. Adatmegőrzés',
          body: 'A munkamenet metaadatokat csak addig tartjuk meg, amíg szükséges az aktív kapcsolatok koordinálásához és a visszaélés megelőzéséhez. A biztonsághoz vagy csaláshoz kapcsolódó naplók korlátozott ideig megőrizhetők a jogi kötelezettségeknek megfelelően.',
        },
        {
          title: '8. Az Ön választásai',
          body: 'Bármikor elutasíthatja munkamenetek generálását vagy azokhoz való csatlakozást. Törölheti a helyi munkamenet adatokat a böngészőjéből, vagy használhat privát böngészési módot a tokenek tárolásának elkerülésére. Ha kérdései vannak az információival kapcsolatban, lépjen kapcsolatba velünk a privacy@chatorbit.com címen.',
        },
      ],
    },
  },
};

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function getTranslations(language: LanguageCode): AppTranslation {
  return TRANSLATIONS[language] ?? TRANSLATIONS[DEFAULT_LANGUAGE];
}

export const SUPPORTED_LANGUAGES: LanguageCode[] = Object.keys(
  TRANSLATIONS
) as LanguageCode[];
