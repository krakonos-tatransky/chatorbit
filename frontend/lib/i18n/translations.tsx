import type { ReactNode } from "react";

export type LanguageCode = "en" | "sk";

export type LanguageDefinition = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flagEmoji: string;
};

export const LANGUAGE_DEFINITIONS: Record<LanguageCode, LanguageDefinition> = {
  en: { code: "en", label: "English", nativeLabel: "English", flagEmoji: "🇺🇸" },
  sk: { code: "sk", label: "Slovak", nativeLabel: "Slovenčina", flagEmoji: "🇸🇰" },
};

const baseTranslation = {
  languageSwitcher: {
    buttonLabel: "Change language",
    dialogTitle: "Choose your language",
    closeLabel: "Close language selection",
  },
  navigation: {
    help: "Help & FAQ",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    reportAbuse: "Report abuse",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  footer: {
    copyright: "© {year} ChatOrbit. Peer-to-peer chat without server-side archives.",
    help: "Help",
    terms: "Terms",
    privacy: "Privacy",
  },
  home: {
    heroBadge: "ChatOrbit Sessions",
    heroTitle: "Spin up a private two-person chat in seconds",
    heroSubtitle:
      "Generate a shareable access token, send it to your contact, and meet in an ephemeral chat room. Once the second device connects a secure countdown begins—when it reaches zero the session closes itself.",
    needToken: "Need token",
    haveToken: "Have token",
    howItWorks: "How it works",
    steps: [
      "Request a token and choose the activation window plus the countdown for the live session.",
      "Share the token however you like. The first partner to log in reserves the host seat.",
      "Once both devices connect, message bundles flow directly with end-to-end encryption and a live timer.",
    ],
  },
  joinCard: {
    title: "Join with an existing token",
    subtitle:
      "Paste the token you received. Once two devices join the same token the session starts immediately and no other logins are permitted.",
    tokenLabel: "Session token",
    tokenPlaceholder: "Paste token",
    submitIdle: "Enter session",
    submitLoading: "Connecting…",
    missingTokenError: "Enter the token you received from your partner.",
    unknownError: "Unknown error",
    hintTitle: "Heads up",
    hints: [
      "Sessions close automatically when the timer hits zero.",
      "You can reconnect on the same device before the countdown ends.",
      "Messages stay private to the two connected devices.",
    ],
  },
  tokenCard: {
    title: "Request a new session token",
    subtitle:
      "Define how long the token stays claimable and how long the active session should last. Each device can mint ten tokens per hour.",
    validityLabel: "Validity window",
    validityOptions: {
      oneDay: "1 day",
      oneWeek: "1 week",
      oneMonth: "1 month",
      oneYear: "1 year",
    },
    ttlLabel: "Session time-to-live (minutes)",
    ttlApproxHours: "≈ {hours} hours",
    ttlCustomOption: "Custom",
    messageLimitLabel: "Message character limit",
    messageLimitHelper: "Between 200 and 16,000 characters per message.",
    submitIdle: "Generate token",
    submitLoading: "Issuing token…",
    tokenHeader: "Token",
    copyLabel: "Copy session token",
    copyIdle: "Copy",
    copySuccess: "Copied",
    copySuccessStatus: "Token copied to clipboard",
    copyErrorStatus: "Unable to copy token",
    startSession: "Start session",
    startSessionLoading: "Starting…",
    validUntil: "Valid until",
    sessionTtl: "Session TTL",
    characterLimit: "Character limit",
    ttlMinutes: "{minutes} minutes",
    characterCount: "{count} characters",
    unknownError: "Unknown error",
    tokenIssueError: "Unable to issue a token.",
    tokenJoinError: "Unable to join this token.",
    qrCode: "QR Code",
    qrCodeHide: "Hide QR",
    qrCodeHint: "Scan with ChatOrbit app",
  },
  termsModal: {
    title: "Review and accept the Terms of Service",
    description:
      "The chat session will only start after you confirm that you have read and agree to the Terms of Service. Last updated {date}.",
    contentLabel: "Terms of Service content",
    helper: "Scroll through the entire document to enable the AGREE button.",
    agree: "AGREE",
    cancel: "Cancel",
  },
  legalOverlay: {
    closeButton: "Close",
    closeLabel: "Close legal document",
    helpTitle: "Help & FAQ",
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
  },
  legalPages: {
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
    lastUpdated: "Last updated {date}",
  },
  preventNavigation: {
    message: "Are you sure you want to leave this page?",
  },
  reportAbuse: {
    title: "Report abuse",
    helper: "End the session and notify ChatOrbit about unlawful behavior.",
  },
  session: {
    statusCard: {
      connectedParticipants: "Connected participants: {current}/{max}",
      messageLimit: "Limit: {limit} chars/message",
      messageLimitUnknown: "Limit: — chars/message",
      tokenLabel: "Token",
      timerLabel: "Session timer",
      copyButton: {
        idle: "Copy",
        success: "Copied",
        ariaLabel: "Copy session token",
      },
      copyStatus: {
        copied: "Token copied to clipboard",
        failed: "Unable to copy token",
      },
      roleLabel: "You are signed in as {role}.",
      roleNames: {
        host: "host",
        guest: "guest",
      },
      statusLabel: {
        waiting: "Waiting",
        connected: "Connected",
        ended: "Ended",
      },
      countdown: {
        waiting: "Waiting…",
        starting: "Starting…",
      },
      detailsToggle: {
        hide: "Hide details",
        show: "Show details",
        headerVisible: "Session details visible",
        headerHidden: "Show session details",
        regionLabel: "Session details",
      },
    },
    call: {
      statusLabel: {
        idle: "Video chat ready",
        requesting: "Awaiting peer response",
        incoming: "Incoming video chat",
        connecting: "Connecting video chat",
        active: "Video chat active",
      },
      labels: {
        partner: "Partner",
        you: "You",
      },
      incomingDialog: {
        title: "Incoming video chat",
        descriptionWithName: "{name} wants to start a video chat.",
        descriptionWithoutName: "Your peer wants to start a video chat.",
        accept: "Accept",
        decline: "Decline",
      },
    },
    chat: {
      emptyState: "No messages yet. Start the conversation!",
      composerPlaceholder: "Type your message…",
      sendButton: "Send",
    },
    controls: {
      endSession: {
        idle: "End session",
        loading: "Ending…",
        ended: "Session ended",
        confirmTitle: "End session",
        confirmDescription: "Ending the session will immediately disconnect all participants.",
        confirmLabel: "End session",
        cancelLabel: "Cancel",
      },
    },
  },
};

export type AppTranslation = typeof baseTranslation;

export const TRANSLATIONS: Record<LanguageCode, AppTranslation> = {
  en: baseTranslation,
  sk: {
    ...baseTranslation,
    languageSwitcher: {
      buttonLabel: "Zmeniť jazyk",
      dialogTitle: "Vyberte si jazyk",
      closeLabel: "Zavrieť výber jazyka",
    },
    navigation: {
      help: "Pomoc a FAQ",
      terms: "Podmienky používania",
      privacy: "Ochrana súkromia",
      reportAbuse: "Nahlásiť zneužitie",
      openMenu: "Otvoriť menu",
      closeMenu: "Zatvoriť menu",
    },
    footer: {
      copyright: "© {year} ChatOrbit. P2P chat bez serverových archívov.",
      help: "Pomoc",
      terms: "Podmienky",
      privacy: "Súkromie",
    },
    home: {
      heroBadge: "ChatOrbit relácie",
      heroTitle: "Spustite súkromný dvojčlenný chat za pár sekúnd",
      heroSubtitle:
        "Vygenerujte zdieľateľný prístupový token, pošlite ho kontaktu a stretnite sa v efemérnej miestnosti. Keď sa pripojí druhé zariadenie, spustí sa bezpečné odpočítavanie a po jeho skončení sa relácia automaticky ukončí.",
      needToken: "Potrebujem token",
      haveToken: "Mám token",
      howItWorks: "Ako to funguje",
      steps: [
        "Požiadajte o token a zvoľte aktivačné okno a dĺžku odpočítavania pre živú reláciu.",
        "Token zdieľajte akýmkoľvek spôsobom. Prvý prihlásený účastník získa miesto hostiteľa.",
        "Keď sa pripoja obe zariadenia, správy prechádzajú priamo s end-to-end šifrovaním a živým časovačom.",
      ],
    },
    joinCard: {
      title: "Pripojiť sa pomocou existujúceho tokenu",
      subtitle:
        "Vložte token, ktorý ste dostali. Len čo sa k rovnakému tokenu pripoja dve zariadenia, relácia sa okamžite spustí a ďalšie prihlásenia nie sú povolené.",
      tokenLabel: "Token relácie",
      tokenPlaceholder: "Vložte token",
      submitIdle: "Vstúpiť do relácie",
      submitLoading: "Pripájanie…",
      missingTokenError: "Zadajte token, ktorý ste dostali od partnera.",
      unknownError: "Neznáma chyba",
      hintTitle: "Dôležité",
      hints: [
        "Relácia sa automaticky ukončí, keď časovač klesne na nulu.",
        "Na rovnakom zariadení sa môžete znovu pripojiť, kým odpočítavanie neskončí.",
        "Správy zostávajú súkromné medzi dvoma pripojenými zariadeniami.",
      ],
    },
    tokenCard: {
      title: "Vyžiadať nový token relácie",
      subtitle:
        "Určte, ako dlho zostane token použiteľný a ako dlho má trvať aktívna relácia. Každé zariadenie môže za hodinu vytvoriť desať tokenov.",
      validityLabel: "Platnosť tokenu",
      validityOptions: {
        oneDay: "1 deň",
        oneWeek: "1 týždeň",
        oneMonth: "1 mesiac",
        oneYear: "1 rok",
      },
      ttlLabel: "Životnosť relácie (minúty)",
      ttlApproxHours: "≈ {hours} hod",
      ttlCustomOption: "Vlastné",
      messageLimitLabel: "Limit znakov správy",
      messageLimitHelper: "Medzi 200 a 16 000 znakmi na jednu správu.",
      submitIdle: "Vygenerovať token",
      submitLoading: "Vydáva sa token…",
      tokenHeader: "Token",
      copyLabel: "Kopírovať token relácie",
      copyIdle: "Kopírovať",
      copySuccess: "Skopírované",
      copySuccessStatus: "Token bol skopírovaný do schránky",
      copyErrorStatus: "Token sa nepodarilo skopírovať",
      startSession: "Spustiť reláciu",
      startSessionLoading: "Spúšťanie…",
      validUntil: "Platný do",
      sessionTtl: "Životnosť relácie",
      characterLimit: "Limit znakov",
      ttlMinutes: "{minutes} minút",
      characterCount: "{count} znakov",
      unknownError: "Neznáma chyba",
      tokenIssueError: "Token sa nepodarilo vydať.",
      tokenJoinError: "K tomuto tokenu sa nedá pripojiť.",
      qrCode: "QR kód",
      qrCodeHide: "Skryť QR",
      qrCodeHint: "Naskenujte aplikáciou ChatOrbit",
    },
    termsModal: {
      title: "Skontrolujte a potvrďte Podmienky používania",
      description:
        "Relácia sa spustí až po tom, čo potvrdíte, že ste si prečítali a súhlasíte s Podmienkami používania. Naposledy aktualizované {date}.",
      contentLabel: "Obsah podmienok používania",
      helper: "Prejdite celý dokument, aby sa tlačidlo SÚHLASÍM aktivovalo.",
      agree: "SÚHLASÍM",
      cancel: "Zrušiť",
    },
    legalOverlay: {
      closeButton: "Zavrieť",
      closeLabel: "Zavrieť právny dokument",
      helpTitle: "Pomoc a FAQ",
      termsTitle: "Podmienky používania",
      privacyTitle: "Ochrana súkromia",
    },
    legalPages: {
      termsTitle: "Podmienky používania",
      privacyTitle: "Ochrana súkromia",
      lastUpdated: "Naposledy aktualizované {date}",
    },
    preventNavigation: {
      message: "Naozaj chcete opustiť túto stránku?",
    },
    reportAbuse: {
      title: "Nahlásiť zneužitie",
      helper: "Ukončite reláciu a informujte ChatOrbit o protiprávnom správaní.",
    },
    session: {
      ...baseTranslation.session,
      statusCard: {
        ...baseTranslation.session.statusCard,
        connectedParticipants: "Pripojení účastníci: {current}/{max}",
        messageLimit: "Limit: {limit} znakov/správa",
        messageLimitUnknown: "Limit: — znakov/správa",
        tokenLabel: "Token",
        timerLabel: "Časovač relácie",
        copyButton: {
          ...baseTranslation.session.statusCard.copyButton,
          idle: "Kopírovať",
          success: "Skopírované",
          ariaLabel: "Skopírovať token relácie",
        },
        copyStatus: {
          ...baseTranslation.session.statusCard.copyStatus,
          copied: "Token skopírovaný do schránky",
          failed: "Token sa nepodarilo skopírovať",
        },
        roleLabel: "Ste prihlásený ako {role}.",
        roleNames: {
          ...baseTranslation.session.statusCard.roleNames,
          host: "hostiteľ",
          guest: "hosť",
        },
        statusLabel: {
          waiting: "Čaká sa",
          connected: "Pripojené",
          ended: "Ukončené",
        },
        countdown: {
          ...baseTranslation.session.statusCard.countdown,
          waiting: "Čaká sa…",
          starting: "Spúšťa sa…",
        },
        detailsToggle: {
          ...baseTranslation.session.statusCard.detailsToggle,
          hide: "Skryť detaily",
          show: "Zobraziť detaily",
          headerVisible: "Detaily relácie sú viditeľné",
          headerHidden: "Zobraziť detaily relácie",
          regionLabel: "Detaily relácie",
        },
      },
      call: {
        ...baseTranslation.session.call,
        statusLabel: {
          idle: "Videochat pripravený",
          requesting: "Čaká sa na reakciu partnera",
          incoming: "Prichádzajúci videochat",
          connecting: "Pripájanie videochatu",
          active: "Videochat aktívny",
        },
        labels: {
          partner: "Partner",
          you: "Vy",
        },
        incomingDialog: {
          ...baseTranslation.session.call.incomingDialog,
          title: "Prichádzajúci videochat",
          descriptionWithName: "{name} chce spustiť videochat.",
          descriptionWithoutName: "Váš partner chce spustiť videochat.",
          accept: "Prijať",
          decline: "Odmietnuť",
        },
      },
      chat: {
        ...baseTranslation.session.chat,
        emptyState: "Zatiaľ žiadne správy. Začnite konverzáciu!",
        composerPlaceholder: "Napíšte svoju správu…",
        sendButton: "Odoslať",
      },
      controls: {
        ...baseTranslation.session.controls,
        endSession: {
          ...baseTranslation.session.controls.endSession,
          idle: "Ukončiť reláciu",
          loading: "Ukončuje sa…",
          ended: "Relácia ukončená",
          confirmTitle: "Ukončiť reláciu",
          confirmDescription: "Ukončením relácie okamžite odpojíte všetkých účastníkov.",
          confirmLabel: "Ukončiť reláciu",
          cancelLabel: "Zrušiť",
        },
      },
    },
  },
};

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function getTranslations(language: LanguageCode): AppTranslation {
  return TRANSLATIONS[language] ?? TRANSLATIONS[DEFAULT_LANGUAGE];
}

export const SUPPORTED_LANGUAGES: LanguageCode[] = Object.keys(TRANSLATIONS) as LanguageCode[];

export type TermsContent = {
  lastUpdated: string;
  sections: { title: string; body: ReactNode }[];
};

const TERMS_TRANSLATIONS: Record<LanguageCode, TermsContent> = {
  en: {
    lastUpdated: "October 14, 2025",
    sections: [
      {
        title: "1. Acceptance of Terms",
        body: (
          <p>
            By accessing or using ChatOrbit (the "Service"), you agree to these Terms of Service. You must be at least 18 years
            old or have the legal capacity to enter into a binding agreement. If you do not agree, you may not use the Service.
          </p>
        ),
      },
      {
        title: "2. Description of Service",
        body: (
          <p>
            ChatOrbit is a peer-to-peer communication platform that connects participants directly using WebRTC technology.
            Messages travel straight between browsers without being stored on our servers. When supported by both browsers,
            end to end encryption using AES-GCM with keys derived from session tokens ensures that only the intended recipients can
            read the content.
          </p>
        ),
      },
      {
        title: "3. Prohibited Uses",
        body: (
          <>
            <p>You agree that you will not use the Service to:</p>
            <ul className="legal-list">
              <li>Engage in illegal activity or violate any applicable law or regulation.</li>
              <li>Harass, threaten, defame, or otherwise harm other users.</li>
              <li>Transmit malware, viruses, or other harmful code.</li>
              <li>Bypass or undermine security, encryption, or authentication mechanisms.</li>
              <li>Impersonate another person or entity or submit false information.</li>
            </ul>
            <p>Any violation may result in immediate termination of access without notice.</p>
          </>
        ),
      },
      {
        title: "4. Session Lifecycle",
        body: (
          <ul className="legal-list">
            <li>Tokens can only be claimed within their activation window and expire automatically afterwards.</li>
            <li>
              Once two participants connect, a countdown begins. When it reaches zero, the session closes itself and cannot be
              reopened.
            </li>
            <li>
              Either participant may actively end a session at any time. When you choose to end a session, it is flagged as deleted in
              the database, all participants are notified, and the token can no longer be reused.
            </li>
          </ul>
        ),
      },
      {
        title: "5. No Message Storage or Backdoors",
        body: (
          <p>
            ChatOrbit does not store message content or encryption keys. Messages exist only in device memory during an active
            session. The Service is designed without backdoors or mechanisms that would allow us to decrypt messages. Signaling
            servers may temporarily process metadata such as session tokens, participant identifiers, and connection status to
            facilitate communication, but this information is not retained longer than necessary.
          </p>
        ),
      },
      {
        title: "6. User Responsibilities",
        body: (
          <>
            <p>
              You are solely responsible for your use of the Service and for the content you share. You must comply with all laws
              regarding data protection, privacy, and electronic communications. Because communications are peer to peer, you should
              only share session tokens with trusted parties and must secure your devices against unauthorized access.
            </p>
            <p>
              The Communications Decency Act (47 U.S.C. § 230) protects online services from liability for user-generated content. By
              using ChatOrbit you acknowledge that you—not ChatOrbit—are responsible for the messages you send and receive.
            </p>
          </>
        ),
      },
      {
        title: "7. Intellectual Property",
        body: (
          <p>
            The Service, including code, design, and documentation, is the property of ChatOrbit and its licensors. You may not copy,
            modify, distribute, reverse engineer, or create derivative works except as permitted by applicable open-source licenses or
            with our prior written consent.
          </p>
        ),
      },
      {
        title: "8. Disclaimer of Warranties",
        body: (
          <p>
            The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied,
            including merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the Service will
            be uninterrupted, secure, or error free.
          </p>
        ),
      },
      {
        title: "9. Limitation of Liability",
        body: (
          <p>
            To the fullest extent permitted by law, ChatOrbit will not be liable for any direct, indirect, incidental, consequential, or
            punitive damages arising from or related to your use of the Service, including loss of data, privacy breaches, or illegal
            activity conducted by users. Our aggregate liability will not exceed the amount you paid (if any) in the twelve months
            preceding the claim.
          </p>
        ),
      },
      {
        title: "10. Indemnification",
        body: (
          <p>
            You agree to indemnify and hold harmless ChatOrbit, its affiliates, and agents from any claims, liabilities, damages, or
            expenses (including legal fees) arising from your use of the Service or violation of these Terms.
          </p>
        ),
      },
      {
        title: "11. Termination",
        body: (
          <p>
            We may suspend or terminate your access to the Service at our discretion, with or without notice, for any reason including
            suspected violations of these Terms or unlawful conduct.
          </p>
        ),
      },
      {
        title: "12. Governing Law",
        body: (
          <p>
            These Terms are governed by the laws of California, USA, without regard to conflict of law principles. You agree to submit to
            the exclusive jurisdiction of the state and federal courts located in California for resolution of any dispute related to the
            Service.
          </p>
        ),
      },
      {
        title: "13. Changes to Terms",
        body: (
          <p>
            We may update these Terms to reflect new features, legal requirements, or operational changes. When revisions are material we
            will post an updated notice in the application. Continued use of ChatOrbit after changes take effect constitutes acceptance of
            the revised Terms.
          </p>
        ),
      },
      {
        title: "14. Contact",
        body: (
          <p>
            Questions about these terms can be sent to <a href="mailto:legal@chatorbit.com">legal@chatorbit.com</a>.
          </p>
        ),
      },
    ],
  },
  sk: {
    lastUpdated: "14. októbra 2025",
    sections: [
      {
        title: "1. Prijatie podmienok",
        body: (
          <p>
            Používaním služby ChatOrbit (ďalej len „Služba") súhlasíte s týmito Podmienkami používania. Musíte mať aspoň 18 rokov alebo
            právnu spôsobilosť uzavrieť záväznú zmluvu. Ak nesúhlasíte, službu nemôžete používať.
          </p>
        ),
      },
      {
        title: "2. Popis služby",
        body: (
          <p>
            ChatOrbit je komunikačná platforma typu peer-to-peer, ktorá spája účastníkov priamo pomocou technológie WebRTC. Správy putujú
            priamo medzi prehliadačmi bez ukladania na našich serveroch. Ak to prehliadače podporujú, end-to-end šifrovanie AES-GCM s
            kľúčmi odvodenými z tokenov relácie zabezpečí, že obsah si prečítajú len určení príjemcovia.
          </p>
        ),
      },
      {
        title: "3. Zakázané použitia",
        body: (
          <>
            <p>Zaväzujete sa, že službu nebudete používať na:</p>
            <ul className="legal-list">
              <li>páchanie nezákonnej činnosti alebo porušovanie zákonov a predpisov,</li>
              <li>obťažovanie, vyhrážanie sa, ohováranie či iné ubližovanie používateľom,</li>
              <li>šírenie malvéru, vírusov alebo iného škodlivého kódu,</li>
              <li>obchádzanie či narúšanie bezpečnostných, šifrovacích alebo autentifikačných mechanizmov,</li>
              <li>vydávanie sa za inú osobu alebo poskytovanie nepravdivých informácií.</li>
            </ul>
            <p>Akékoľvek porušenie môže viesť k okamžitému zrušeniu prístupu bez predchádzajúceho upozornenia.</p>
          </>
        ),
      },
      {
        title: "4. Životný cyklus relácie",
        body: (
          <ul className="legal-list">
            <li>Tokeny je možné uplatniť iba v rámci aktivačného okna; po jeho skončení sa automaticky zneplatnia.</li>
            <li>
              Keď sa pripoja dvaja účastníci, spustí sa odpočítavanie. Po jeho skončení sa relácia uzavrie a nie je možné ju znovu
              otvoriť.
            </li>
            <li>
              Každý účastník môže reláciu kedykoľvek ukončiť. Po ukončení sa relácia označí ako zmazaná, všetci účastníci sú informovaní a
              token už nie je možné znova použiť.
            </li>
          </ul>
        ),
      },
      {
        title: "5. Bez ukladania správ a zadných vrátok",
        body: (
          <p>
            ChatOrbit neukladá obsah správ ani šifrovacie kľúče. Správy existujú len v pamäti zariadení počas aktívnej relácie. Služba je
            navrhnutá bez zadných vrátok alebo mechanizmov, ktoré by nám umožnili správy dešifrovať. Signalizačné servery môžu dočasne
            spracúvať metadáta, ako sú tokeny relácií, identifikátory účastníkov a stav pripojenia, iba na uľahčenie komunikácie a tieto
            informácie sa neuchovávajú dlhšie, než je nevyhnutné.
          </p>
        ),
      },
      {
        title: "6. Zodpovednosť používateľa",
        body: (
          <>
            <p>
              Za svoje používanie služby a obsah, ktorý zdieľate, nesiete plnú zodpovednosť. Musíte dodržiavať všetky zákony týkajúce sa
              ochrany údajov, súkromia a elektronickej komunikácie. Keďže komunikácia prebieha priamo medzi účastníkmi, tokeny relácií
              zdieľajte len s dôveryhodnými osobami a svoje zariadenia chráňte pred neoprávneným prístupom.
            </p>
            <p>
              Zákon o decencii v komunikácii (47 U.S.C. § 230) chráni online služby pred zodpovednosťou za obsah vytvorený používateľmi.
              Používaním ChatOrbit uznávate, že za odoslané a prijaté správy zodpovedáte vy, nie ChatOrbit.
            </p>
          </>
        ),
      },
      {
        title: "7. Duševné vlastníctvo",
        body: (
          <p>
            Služba vrátane kódu, dizajnu a dokumentácie je majetkom ChatOrbit a jeho poskytovateľov licencií. Bez nášho predchádzajúceho
            písomného súhlasu nesmiete kopírovať, upravovať, distribuovať, spätne analyzovať ani vytvárať odvodené diela, okrem prípadov,
            ktoré povoľujú príslušné open-source licencie.
          </p>
        ),
      },
      {
        title: "8. Zrieknutie sa záruk",
        body: (
          <p>
            Služba sa poskytuje „tak, ako je" a „ako je dostupná" bez akýchkoľvek záruk, či už výslovných alebo implicitných, vrátane
            záruky predajnosti, vhodnosti na konkrétny účel alebo neporušovania práv. Nezaručujeme nepretržitú, bezpečnú ani bezchybnú
            prevádzku služby.
          </p>
        ),
      },
      {
        title: "9. Obmedzenie zodpovednosti",
        body: (
          <p>
            V maximálnom rozsahu povolenom zákonom nebude ChatOrbit zodpovedať za žiadne priame, nepriame, náhodné, následné ani
            represívne škody vzniknuté používaním služby vrátane straty údajov, porušenia súkromia alebo nezákonnej činnosti používateľov.
            Naša celková zodpovednosť neprekročí sumu, ktorú ste zaplatili (ak vôbec) za dvanásť mesiacov pred uplatnením nároku.
          </p>
        ),
      },
      {
        title: "10. Odškodnenie",
        body: (
          <p>
            Súhlasíte, že odškodníte a budete chrániť ChatOrbit, jeho pobočky a zástupcov pred nárokmi, zodpovednosťou, škodami alebo
            výdavkami (vrátane právnych poplatkov) vyplývajúcimi z používania služby alebo porušenia týchto podmienok.
          </p>
        ),
      },
      {
        title: "11. Ukončenie",
        body: (
          <p>
            Môžeme pozastaviť alebo ukončiť váš prístup k službe podľa vlastného uváženia, s upozornením alebo bez neho, z akéhokoľvek
            dôvodu vrátane podozrenia na porušenie týchto podmienok alebo nezákonného konania.
          </p>
        ),
      },
      {
        title: "12. Rozhodné právo",
        body: (
          <p>
            Tieto podmienky sa riadia právom štátu Kalifornia, USA, bez ohľadu na kolízne normy. Súhlasíte s výlučnou právomocou súdov v
            Kalifornii pri riešení sporov súvisiacich so službou.
          </p>
        ),
      },
      {
        title: "13. Zmeny podmienok",
        body: (
          <p>
            Podmienky môžeme aktualizovať z dôvodu nových funkcií, legislatívnych požiadaviek alebo prevádzkových zmien. Ak pôjde o zásadné
            úpravy, zverejníme o tom oznámenie v aplikácii. Pokračovaním v používaní ChatOrbit po účinnosti zmien vyjadrujete súhlas s
            aktualizovanými podmienkami.
          </p>
        ),
      },
      {
        title: "14. Kontakt",
        body: (
          <p>
            Otázky k týmto podmienkam môžete poslať na adresu <a href="mailto:legal@chatorbit.com">legal@chatorbit.com</a>.
          </p>
        ),
      },
    ],
  },
};

export const PRIVACY_TRANSLATIONS: Record<LanguageCode, { lastUpdated: string; sections: { title: string; body: ReactNode }[] }> = {
  en: {
    lastUpdated: "October 14, 2025",
    sections: [
      {
        title: "1. Our Commitment to Privacy",
        body: (
          <p>
            ChatOrbit is designed to prioritize private, ephemeral conversations. The Service connects participants using peer-to-peer
            WebRTC technology so that messages flow directly between devices. When supported by both browsers, end to end encryption keeps
            message content accessible only to intended recipients.
          </p>
        ),
      },
      {
        title: "2. Information We Collect",
        body: (
          <ul className="legal-list">
            <li>
              <strong>Session metadata:</strong> We temporarily process session tokens, participant identifiers, countdown configuration,
              and connection status to coordinate joins and show who is connected.
            </li>
            <li>
              <strong>Signaling details:</strong> Our signaling server exchanges ICE candidates and WebSocket messages needed to establish a
              connection. These messages may include IP addresses and browser networking information.
            </li>
            <li>
              <strong>STUN/TURN authentication:</strong> Third-party relay services receive short-lived nonces (valid for 600 seconds) and IP
              addresses strictly to facilitate NAT traversal.
            </li>
            <li>
              <strong>Optional diagnostics:</strong> If you opt into client debugging, limited technical logs may be saved to your local device
              to troubleshoot connectivity issues.
            </li>
          </ul>
        ),
      },
      {
        title: "3. How We Use Your Information",
        body: (
          <p>
            The information described above is used solely to facilitate peer-to-peer connections, authenticate legitimate access to
            STUN/TURN servers, monitor whether a session remains active, and protect the Service from abuse. We do not profile users or use
            data for advertising.
          </p>
        ),
      },
      {
        title: "4. End-to-End Encryption",
        body: (
          <p>
            When supported, ChatOrbit negotiates AES-GCM encryption with keys derived from session tokens directly on users' devices. We do
            not receive these keys and cannot decrypt message content. If encryption is not available in one or both browsers, messages are
            transmitted unencrypted and the application alerts participants.
          </p>
        ),
      },
      {
        title: "5. No Message Storage",
        body: (
          <p>
            Message content is never stored on our servers. Messages exist only in the memory of participating devices during an active
            session and disappear when the session ends or the application closes. This design means we cannot retrieve or provide message
            history to third parties, including law enforcement.
          </p>
        ),
      },
      {
        title: "6. Cookies and Local Storage",
        body: (
          <p>
            ChatOrbit relies on minimal local storage to remember session tokens on the same device. We do not use advertising cookies, third
            party analytics beacons, or cross-site tracking technologies.
          </p>
        ),
      },
      {
        title: "7. Data Retention",
        body: (
          <p>
            Session metadata is retained only as long as necessary to coordinate active connections and enforce abuse prevention. Logs related
            to security or fraud may be preserved for a limited period consistent with legal obligations.
          </p>
        ),
      },
      {
        title: "8. Your Choices",
        body: (
          <p>
            You can decline to generate or join sessions at any time. You may also delete local session data from your browser or use private
            browsing modes to avoid storing tokens. If you have questions about your information, contact us at privacy@chatorbit.com.
          </p>
        ),
      },
    ],
  },
  sk: {
    lastUpdated: "14. októbra 2025",
    sections: [
      {
        title: "1. Náš záväzok k súkromiu",
        body: (
          <p>
            ChatOrbit je navrhnutý tak, aby uprednostňoval súkromné a dočasné rozhovory. Služba spája účastníkov pomocou technológie WebRTC
            typu peer-to-peer, takže správy putujú priamo medzi zariadeniami. Ak to podporujú oba prehliadače, end-to-end šifrovanie zaručí,
            že obsah správ je dostupný len určeným príjemcom.
          </p>
        ),
      },
      {
        title: "2. Aké informácie zhromažďujeme",
        body: (
          <ul className="legal-list">
            <li>
              <strong>Metadáta relácie:</strong> Dočasne spracúvame tokeny relácií, identifikátory účastníkov, nastavenia odpočítavania a
              stav pripojenia na koordináciu prístupov a zobrazenie pripojených osôb.
            </li>
            <li>
              <strong>Signalizačné údaje:</strong> Náš signalizačný server si vymieňa ICE kandidátov a správy WebSocket potrebné na nadviazanie
              spojenia. Tieto správy môžu obsahovať IP adresy a sieťové informácie prehliadača.
            </li>
            <li>
              <strong>Overenie STUN/TURN:</strong> Služby tretích strán získavajú krátkodobé nonce (platné 600 sekúnd) a IP adresy výlučne na
              uľahčenie prechodu cez NAT.
            </li>
            <li>
              <strong>Voliteľná diagnostika:</strong> Ak sa rozhodnete pre klientské ladenie, na vašom zariadení sa môžu ukladať obmedzené
              technické logy na riešenie problémov s pripojením.
            </li>
          </ul>
        ),
      },
      {
        title: "3. Ako používame vaše informácie",
        body: (
          <p>
            Vyššie uvedené informácie slúžia výlučne na uľahčenie spojenia peer-to-peer, overenie legitímneho prístupu k serverom STUN/TURN,
            sledovanie aktivity relácií a ochranu služby pred zneužitím. Neposkytujeme profilovanie používateľov ani nepoužívame údaje na
            reklamné účely.
          </p>
        ),
      },
      {
        title: "4. End-to-end šifrovanie",
        body: (
          <p>
            Ak je k dispozícii, ChatOrbit vyjednáva šifrovanie AES-GCM s kľúčmi odvodenými z tokenov relácie priamo v zariadeniach
            používateľov. Tieto kľúče nedostávame a obsah správ nedokážeme dešifrovať. Ak šifrovanie nie je dostupné v jednom alebo oboch
            prehliadačoch, správy sa prenášajú nešifrovane a aplikácia na to účastníkov upozorní.
          </p>
        ),
      },
      {
        title: "5. Žiadne ukladanie správ",
        body: (
          <p>
            Obsah správ sa na našich serveroch nikdy neukladá. Správy existujú len v pamäti zúčastnených zariadení počas aktívnej relácie a
            po jej skončení alebo zatvorení aplikácie zmiznú. Z tohto dôvodu nedokážeme obnoviť históriu správ pre tretie strany vrátane
            orgánov činných v trestnom konaní.
          </p>
        ),
      },
      {
        title: "6. Cookies a miestne úložisko",
        body: (
          <p>
            ChatOrbit používa len minimálne lokálne úložisko na zapamätanie tokenov na rovnakom zariadení. Nepoužívame reklamné cookies, sledovacie
            skripty tretích strán ani technológie krížového sledovania.
          </p>
        ),
      },
      {
        title: "7. Uchovávanie údajov",
        body: (
          <p>
            Metadáta relácií uchovávame len tak dlho, ako je potrebné na koordináciu pripojení a prevenciu zneužitia. Záznamy týkajúce sa
            bezpečnosti alebo podvodov môžu byť dočasne uchované v súlade s právnymi povinnosťami.
          </p>
        ),
      },
      {
        title: "8. Vaše možnosti",
        body: (
          <p>
            Reláciu môžete kedykoľvek odmietnuť vytvoriť alebo sa k nej pripojiť. Lokálne údaje o relácii môžete z prehliadača vymazať alebo
            používať režim súkromného prehliadania, aby sa tokeny neukladali. Ak máte otázky o svojich údajoch, kontaktujte nás na
            privacy@chatorbit.com.
          </p>
        ),
      },
    ],
  },
};

export const HELP_TRANSLATIONS: Record<LanguageCode, {
  heading: string;
  intro: string;
  troubleshootingTitle: string;
  troubleshootingDescription: string;
  sections: { id: string; title: string; steps: ReactNode[] }[];
}> = {
  en: {
    heading: "Help & FAQ",
    intro:
      "Having trouble starting a video chat? Follow the steps below for your device to restore camera and microphone access and get back into your session.",
    troubleshootingTitle: "Video call fails or camera never starts",
    troubleshootingDescription:
      "ChatOrbit needs permission to use both your camera and microphone before a call can begin. If either permission is blocked, the call request will stop with an error. Use the tips below for your platform to re-enable access.",
    sections: [
      {
        id: "iphone",
        title: "iPhone and iPad (Safari or Firefox)",
        steps: [
          (
            <>
              Open <strong>Settings → Privacy &amp; Security → Camera/Microphone</strong> and make sure Firefox or Safari is allowed to
              use both.
            </>
          ),
          (
            <>
              In the browser, open the address bar menu for your session and set both Camera and Microphone permissions to <strong>Allow</strong>.
            </>
          ),
          (
            <>
              If prompts still do not appear, clear the website data for chat-orbit.com (or your deployment) and reload the session to trigger a fresh
              permission request.
            </>
          ),
        ],
      },
      {
        id: "android",
        title: "Android (Chrome, Firefox, or Edge)",
        steps: [
          (
            <>
              Check <strong>Settings → Apps → [Browser] → Permissions</strong> and confirm Camera and Microphone are enabled.
            </>
          ),
          <>Within the browser, tap the lock icon in the address bar and turn on both permissions for the site.</>,
          (
            <>
              Reload the page. If the call still fails, try starting the video request from the affected device so the permission prompt happens in direct
              response to your tap.
            </>
          ),
        ],
      },
      {
        id: "desktop",
        title: "Desktop (Windows, macOS, or Linux)",
        steps: [
          <>Close any other application that might already be using the camera or microphone.</>,
          <>Use the browser's site information panel (typically the lock icon) to allow Camera and Microphone access.</>,
          (
            <>
              On macOS, open <strong>System Settings → Privacy &amp; Security → Camera/Microphone</strong> and enable access for your browser. On Windows,
              go to <strong>Settings → Privacy &amp; security → Camera/Microphone</strong> and make sure both system-wide and browser-specific toggles are on.
            </>
          ),
        ],
      },
    ],
  },
  sk: {
    heading: "Pomoc a FAQ",
    intro:
      "Máte problém spustiť videochat? Nasledujte kroky podľa svojho zariadenia a obnovte prístup ku kamere a mikrofónu, aby ste sa mohli vrátiť do relácie.",
    troubleshootingTitle: "Videohovor zlyhá alebo sa kamera nespustí",
    troubleshootingDescription:
      "ChatOrbit potrebuje povolenie na používanie kamery aj mikrofónu ešte pred začiatkom hovoru. Ak je niektoré povolenie zablokované, požiadavka sa zastaví s chybou. Pomocou tipov nižšie podľa svojej platformy povolenia znovu povoľte.",
    sections: [
      {
        id: "iphone",
        title: "iPhone a iPad (Safari alebo Firefox)",
        steps: [
          (
            <>
              Otvorte <strong>Nastavenia → Ochrana súkromia a bezpečnosť → Kamera/Mikrofón</strong> a uistite sa, že Firefox alebo Safari má povolený prístup k obom.
            </>
          ),
          (
            <>
              V prehliadači otvorte menu v paneli s adresou pre vašu reláciu a nastavte povolenia Kamera aj Mikrofón na <strong>Povoliť</strong>.
            </>
          ),
          (
            <>
              Ak sa výzvy stále nezobrazujú, vymažte údaje webu pre chat-orbit.com (alebo vašu inštaláciu) a reláciu načítajte znova, aby sa spustila nová žiadosť o povolenie.
            </>
          ),
        ],
      },
      {
        id: "android",
        title: "Android (Chrome, Firefox alebo Edge)",
        steps: [
          (
            <>
              Skontrolujte <strong>Nastavenia → Aplikácie → [Prehliadač] → Povolenia</strong> a overte, že kamera aj mikrofón sú povolené.
            </>
          ),
          <>V prehliadači ťuknite na ikonu zámku v adresnom riadku a povoľte obe povolenia pre stránku.</>,
          (
            <>
              Načítajte stránku znova. Ak hovor stále zlyháva, skúste spustiť požiadavku na video z postihnutého zariadenia, aby výzva na povolenie prišla priamo ako reakcia na váš dotyk.
            </>
          ),
        ],
      },
      {
        id: "desktop",
        title: "Desktop (Windows, macOS alebo Linux)",
        steps: [
          <>Zatvorte iné aplikácie, ktoré už môžu používať kameru alebo mikrofón.</>,
          <>Použite panel informácií o stránke v prehliadači (zvyčajne ikona zámku) a povoľte prístup ku kamere a mikrofónu.</>,
          (
            <>
              V macOS otvorte <strong>System Settings → Privacy &amp; Security → Camera/Microphone</strong> a povoľte prístup pre svoj prehliadač. Vo Windows
              prejdite do <strong>Nastavenia → Ochrana osobných údajov a zabezpečenie → Kamera/Mikrofón</strong> a uistite sa, že sú zapnuté systémové aj
              prehliadačové prepínače.
            </>
          ),
        ],
      },
    ],
  },
};

export function getTermsTranslation(language: LanguageCode): TermsContent {
  return TERMS_TRANSLATIONS[language] ?? TERMS_TRANSLATIONS[DEFAULT_LANGUAGE];
}

export function getPrivacyTranslation(language: LanguageCode) {
  return PRIVACY_TRANSLATIONS[language] ?? PRIVACY_TRANSLATIONS[DEFAULT_LANGUAGE];
}

export function getHelpTranslation(language: LanguageCode) {
  return HELP_TRANSLATIONS[language] ?? HELP_TRANSLATIONS[DEFAULT_LANGUAGE];
}
