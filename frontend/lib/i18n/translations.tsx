import type { ReactNode } from "react";

export type LanguageCode = "en" | "sk" | "hu";

export type LanguageDefinition = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flagEmoji: string;
};

export const LANGUAGE_DEFINITIONS: Record<LanguageCode, LanguageDefinition> = {
  en: { code: "en", label: "English", nativeLabel: "English", flagEmoji: "🇺🇸" },
  sk: { code: "sk", label: "Slovak", nativeLabel: "Slovenčina", flagEmoji: "🇸🇰" },
  hu: { code: "hu", label: "Hungarian", nativeLabel: "Magyar", flagEmoji: "🇭🇺" },
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
  hu: {
    ...baseTranslation,
    languageSwitcher: {
      buttonLabel: "Nyelv módosítása",
      dialogTitle: "Válasszon nyelvet",
      closeLabel: "Nyelvválasztás bezárása",
    },
    navigation: {
      help: "Súgó és GYIK",
      terms: "Felhasználási feltételek",
      privacy: "Adatvédelmi irányelvek",
      reportAbuse: "Visszaélés bejelentése",
      openMenu: "Menü megnyitása",
      closeMenu: "Menü bezárása",
    },
    footer: {
      copyright: "© {year} ChatOrbit. P2P csevegés szerver oldali archívumok nélkül.",
      help: "Súgó",
      terms: "Feltételek",
      privacy: "Adatvédelem",
    },
    home: {
      heroBadge: "ChatOrbit munkamenetek",
      heroTitle: "Indítson privát kétszemélyes csevegést másodpercek alatt",
      heroSubtitle:
        "Generáljon megosztható hozzáférési tokent, küldje el a partnerének, és találkozzon egy ideiglenes csevegőszobában. Amikor a második eszköz csatlakozik, elindul a biztonságos visszaszámlálás — amikor eléri a nullát, a munkamenet automatikusan lezárul.",
      needToken: "Tokenre van szükségem",
      haveToken: "Van tokenem",
      howItWorks: "Hogyan működik",
      steps: [
        "Kérjen tokent, és válassza ki az aktiválási ablakot és a visszaszámlálás időtartamát az élő munkamenethez.",
        "Ossza meg a tokent tetszőleges módon. Az első bejelentkező foglalja el a házigazda helyét.",
        "Amikor mindkét eszköz csatlakozik, az üzenetek közvetlen, végpontok közötti titkosítással és élő időzítővel érkeznek.",
      ],
    },
    joinCard: {
      title: "Csatlakozás meglévő tokennel",
      subtitle:
        "Illessze be a kapott tokent. Amint két eszköz csatlakozik ugyanahhoz a tokenhez, a munkamenet azonnal elindul, és további bejelentkezés nem lehetséges.",
      tokenLabel: "Munkamenet token",
      tokenPlaceholder: "Token beillesztése",
      submitIdle: "Belépés a munkamenetbe",
      submitLoading: "Csatlakozás…",
      missingTokenError: "Adja meg a partnerétől kapott tokent.",
      unknownError: "Ismeretlen hiba",
      hintTitle: "Fontos",
      hints: [
        "A munkamenetek automatikusan lezárulnak, amikor az időzítő eléri a nullát.",
        "Ugyanazon az eszközön újra csatlakozhat, amíg a visszaszámlálás tart.",
        "Az üzenetek a két csatlakozott eszköz között maradnak.",
      ],
    },
    tokenCard: {
      title: "Új munkamenet token kérése",
      subtitle:
        "Határozza meg, mennyi ideig legyen érvényes a token, és mennyi ideig tartson az aktív munkamenet. Minden eszköz óránként legfeljebb tíz tokent generálhat.",
      validityLabel: "Érvényességi ablak",
      validityOptions: {
        oneDay: "1 nap",
        oneWeek: "1 hét",
        oneMonth: "1 hónap",
        oneYear: "1 év",
      },
      ttlLabel: "Munkamenet élettartama (perc)",
      ttlApproxHours: "≈ {hours} óra",
      ttlCustomOption: "Egyéni",
      messageLimitLabel: "Üzenet karakterkorlát",
      messageLimitHelper: "200 és 16 000 karakter között üzenetenként.",
      submitIdle: "Token generálása",
      submitLoading: "Token kiállítása…",
      tokenHeader: "Token",
      copyLabel: "Munkamenet token másolása",
      copyIdle: "Másolás",
      copySuccess: "Másolva",
      copySuccessStatus: "Token a vágólapra másolva",
      copyErrorStatus: "Nem sikerült a tokent másolni",
      startSession: "Munkamenet indítása",
      startSessionLoading: "Indítás…",
      validUntil: "Érvényes eddig",
      sessionTtl: "Munkamenet élettartama",
      characterLimit: "Karakterkorlát",
      ttlMinutes: "{minutes} perc",
      characterCount: "{count} karakter",
      unknownError: "Ismeretlen hiba",
      tokenIssueError: "Nem sikerült tokent kiállítani.",
      tokenJoinError: "Nem lehet csatlakozni ehhez a tokenhez.",
      qrCode: "QR kód",
      qrCodeHide: "QR elrejtése",
      qrCodeHint: "Szkennelje be a ChatOrbit alkalmazással",
    },
    termsModal: {
      title: "Tekintse át és fogadja el a Felhasználási feltételeket",
      description:
        "A csevegési munkamenet csak azután indul el, hogy megerősíti, hogy elolvasta és elfogadja a Felhasználási feltételeket. Utoljára frissítve: {date}.",
      contentLabel: "Felhasználási feltételek tartalma",
      helper: "Görgessen végig a teljes dokumentumon az ELFOGADOM gomb aktiválásához.",
      agree: "ELFOGADOM",
      cancel: "Mégse",
    },
    legalOverlay: {
      closeButton: "Bezárás",
      closeLabel: "Jogi dokumentum bezárása",
      helpTitle: "Súgó és GYIK",
      termsTitle: "Felhasználási feltételek",
      privacyTitle: "Adatvédelmi irányelvek",
    },
    legalPages: {
      termsTitle: "Felhasználási feltételek",
      privacyTitle: "Adatvédelmi irányelvek",
      lastUpdated: "Utoljára frissítve: {date}",
    },
    preventNavigation: {
      message: "Biztosan el akarja hagyni ezt az oldalt?",
    },
    reportAbuse: {
      title: "Visszaélés bejelentése",
      helper: "Fejezze be a munkamenetet, és értesítse a ChatOrbitet a jogellenes viselkedésről.",
    },
    session: {
      ...baseTranslation.session,
      statusCard: {
        ...baseTranslation.session.statusCard,
        connectedParticipants: "Csatlakozott résztvevők: {current}/{max}",
        messageLimit: "Korlát: {limit} karakter/üzenet",
        messageLimitUnknown: "Korlát: — karakter/üzenet",
        tokenLabel: "Token",
        timerLabel: "Munkamenet időzítő",
        copyButton: {
          ...baseTranslation.session.statusCard.copyButton,
          idle: "Másolás",
          success: "Másolva",
          ariaLabel: "Munkamenet token másolása",
        },
        copyStatus: {
          ...baseTranslation.session.statusCard.copyStatus,
          copied: "Token a vágólapra másolva",
          failed: "Nem sikerült a tokent másolni",
        },
        roleLabel: "Bejelentkezve mint: {role}.",
        roleNames: {
          ...baseTranslation.session.statusCard.roleNames,
          host: "házigazda",
          guest: "vendég",
        },
        statusLabel: {
          waiting: "Várakozás",
          connected: "Csatlakozva",
          ended: "Befejezve",
        },
        countdown: {
          ...baseTranslation.session.statusCard.countdown,
          waiting: "Várakozás…",
          starting: "Indítás…",
        },
        detailsToggle: {
          ...baseTranslation.session.statusCard.detailsToggle,
          hide: "Részletek elrejtése",
          show: "Részletek megjelenítése",
          headerVisible: "Munkamenet részletei láthatók",
          headerHidden: "Munkamenet részleteinek megjelenítése",
          regionLabel: "Munkamenet részletei",
        },
      },
      call: {
        ...baseTranslation.session.call,
        statusLabel: {
          idle: "Videócsevegés kész",
          requesting: "Várakozás a partner válaszára",
          incoming: "Bejövő videócsevegés",
          connecting: "Videócsevegés csatlakoztatása",
          active: "Videócsevegés aktív",
        },
        labels: {
          partner: "Partner",
          you: "Ön",
        },
        incomingDialog: {
          ...baseTranslation.session.call.incomingDialog,
          title: "Bejövő videócsevegés",
          descriptionWithName: "{name} videócsevegést szeretne indítani.",
          descriptionWithoutName: "Partnere videócsevegést szeretne indítani.",
          accept: "Elfogadás",
          decline: "Elutasítás",
        },
      },
      chat: {
        ...baseTranslation.session.chat,
        emptyState: "Még nincsenek üzenetek. Kezdje el a beszélgetést!",
        composerPlaceholder: "Írja be üzenetét…",
        sendButton: "Küldés",
      },
      controls: {
        ...baseTranslation.session.controls,
        endSession: {
          ...baseTranslation.session.controls.endSession,
          idle: "Munkamenet befejezése",
          loading: "Befejezés…",
          ended: "Munkamenet befejezve",
          confirmTitle: "Munkamenet befejezése",
          confirmDescription: "A munkamenet befejezése azonnal leválasztja az összes résztvevőt.",
          confirmLabel: "Munkamenet befejezése",
          cancelLabel: "Mégse",
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
  hu: {
    lastUpdated: "2025. október 14.",
    sections: [
      {
        title: "1. A feltételek elfogadása",
        body: (
          <p>
            A ChatOrbit (a továbbiakban „Szolgáltatás") használatával Ön elfogadja ezeket a Felhasználási feltételeket. Legalább 18 évesnek kell
            lennie, vagy rendelkeznie kell a kötelező érvényű megállapodás megkötéséhez szükséges jogképességgel. Ha nem ért egyet, nem használhatja
            a Szolgáltatást.
          </p>
        ),
      },
      {
        title: "2. A Szolgáltatás leírása",
        body: (
          <p>
            A ChatOrbit egy peer-to-peer kommunikációs platform, amely a WebRTC technológia segítségével közvetlenül összeköti a résztvevőket. Az
            üzenetek közvetlenül a böngészők között utaznak, anélkül hogy a szervereinken tárolódnának. Ha mindkét böngésző támogatja, az AES-GCM
            végpontok közötti titkosítás a munkamenet tokenekből származtatott kulcsokkal biztosítja, hogy csak a címzettek olvashassák a tartalmat.
          </p>
        ),
      },
      {
        title: "3. Tiltott felhasználás",
        body: (
          <>
            <p>Ön vállalja, hogy a Szolgáltatást nem használja az alábbiakra:</p>
            <ul className="legal-list">
              <li>Illegális tevékenység vagy alkalmazandó törvények és rendelkezések megsértése.</li>
              <li>Más felhasználók zaklatása, fenyegetése, rágalmazása vagy egyéb módon történő károsítása.</li>
              <li>Kártékony szoftverek, vírusok vagy egyéb ártalmas kódok terjesztése.</li>
              <li>Biztonsági, titkosítási vagy hitelesítési mechanizmusok megkerülése vagy aláásása.</li>
              <li>Más személy vagy szervezet megszemélyesítése, vagy hamis információk megadása.</li>
            </ul>
            <p>Bármely szabálysértés a hozzáférés azonnali megszüntetését vonhatja maga után értesítés nélkül.</p>
          </>
        ),
      },
      {
        title: "4. Munkamenet életciklusa",
        body: (
          <ul className="legal-list">
            <li>A tokenek csak az aktiválási ablakon belül érvényesíthetők; azt követően automatikusan lejárnak.</li>
            <li>
              Amikor két résztvevő csatlakozik, elindul a visszaszámlálás. Amikor eléri a nullát, a munkamenet lezárul, és nem nyitható meg újra.
            </li>
            <li>
              Bármelyik résztvevő bármikor befejezheti a munkamenetet. A befejezés után a munkamenet töröltként jelölődik az adatbázisban, minden
              résztvevő értesítést kap, és a token többé nem használható újra.
            </li>
          </ul>
        ),
      },
      {
        title: "5. Nincs üzenettárolás és hátsó ajtó",
        body: (
          <p>
            A ChatOrbit nem tárol üzenet-tartalmat vagy titkosítási kulcsokat. Az üzenetek csak az eszközök memóriájában léteznek az aktív munkamenet
            során. A Szolgáltatás hátsó ajtók vagy az üzenetek visszafejtését lehetővé tevő mechanizmusok nélkül készült. A jelzőszerverek ideiglenesen
            feldolgozhatnak metaadatokat, mint a munkamenet tokenek, résztvevő-azonosítók és csatlakozási állapot, de ezeket az információkat nem
            tárolják a szükségesnél tovább.
          </p>
        ),
      },
      {
        title: "6. Felhasználói felelősség",
        body: (
          <>
            <p>
              Ön kizárólagos felelősséggel tartozik a Szolgáltatás használatáért és az általa megosztott tartalomért. Be kell tartania az
              adatvédelemre, a magánélet védelmére és az elektronikus kommunikációra vonatkozó valamennyi törvényt. Mivel a kommunikáció
              peer-to-peer, a munkamenet tokeneket csak megbízható felekkel ossza meg, és eszközeit védje az illetéktelen hozzáféréstől.
            </p>
            <p>
              A Communications Decency Act (47 U.S.C. § 230) védi az online szolgáltatásokat a felhasználók által létrehozott tartalmakért való
              felelősség alól. A ChatOrbit használatával Ön tudomásul veszi, hogy az elküldött és fogadott üzenetekért Ön felel, nem a ChatOrbit.
            </p>
          </>
        ),
      },
      {
        title: "7. Szellemi tulajdon",
        body: (
          <p>
            A Szolgáltatás, beleértve a kódot, a dizájnt és a dokumentációt, a ChatOrbit és licencadóinak tulajdona. Előzetes írásbeli
            hozzájárulásunk nélkül nem másolhatja, módosíthatja, terjesztheti, visszafejtheti, vagy nem hozhat létre származékos műveket, kivéve
            az alkalmazandó nyílt forráskódú licencek által megengedett esetekben.
          </p>
        ),
      },
      {
        title: "8. Garanciák kizárása",
        body: (
          <p>
            A Szolgáltatás „ahogy van" és „ahogy elérhető" alapon kerül nyújtásra, mindenféle garancia nélkül, legyen az kifejezett vagy
            hallgatólagos, beleértve az eladhatóságot, az adott célra való alkalmasságot vagy a jogok nem megsértését. Nem garantáljuk, hogy a
            Szolgáltatás megszakítás nélküli, biztonságos vagy hibamentes lesz.
          </p>
        ),
      },
      {
        title: "9. Felelősség korlátozása",
        body: (
          <p>
            A törvény által megengedett legteljesebb mértékben a ChatOrbit nem vállal felelősséget semmilyen közvetlen, közvetett, járulékos,
            következményes vagy büntető kártérítésért, amely a Szolgáltatás használatából ered, beleértve az adatvesztést, adatvédelmi
            jogsértéseket vagy a felhasználók által végzett jogellenes tevékenységet.
          </p>
        ),
      },
      {
        title: "10. Kártalanítás",
        body: (
          <p>
            Ön vállalja, hogy kártalanítja és mentesíti a ChatOrbitet, leányvállalatait és képviselőit minden olyan igénytől, felelősségtől,
            kártól vagy költségtől (beleértve a jogi díjakat), amely a Szolgáltatás használatából vagy ezen Feltételek megsértéséből ered.
          </p>
        ),
      },
      {
        title: "11. Megszüntetés",
        body: (
          <p>
            Saját belátásunk szerint, értesítéssel vagy anélkül felfüggeszthetjük vagy megszüntethetjük az Ön hozzáférését a Szolgáltatáshoz,
            bármilyen okból, beleértve a jelen Feltételek feltételezett megsértését vagy jogellenes magatartást.
          </p>
        ),
      },
      {
        title: "12. Irányadó jog",
        body: (
          <p>
            Ezekre a Feltételekre Kalifornia állam (USA) jogszabályai az irányadók, a kollíziós normáktól függetlenül. Ön elfogadja a
            kaliforniai állami és szövetségi bíróságok kizárólagos joghatóságát a Szolgáltatással kapcsolatos viták rendezésére.
          </p>
        ),
      },
      {
        title: "13. A Feltételek módosítása",
        body: (
          <p>
            A Feltételeket új funkciók, jogi követelmények vagy működési változások miatt frissíthetjük. Lényeges módosítások esetén értesítést
            teszünk közzé az alkalmazásban. A ChatOrbit további használata a módosítások hatálybalépése után a frissített Feltételek elfogadását
            jelenti.
          </p>
        ),
      },
      {
        title: "14. Kapcsolat",
        body: (
          <p>
            A feltételekkel kapcsolatos kérdéseit a <a href="mailto:legal@chatorbit.com">legal@chatorbit.com</a> címre küldheti.
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
  hu: {
    lastUpdated: "2025. október 14.",
    sections: [
      {
        title: "1. Elkötelezettségünk az adatvédelem iránt",
        body: (
          <p>
            A ChatOrbit célja a privát, ideiglenes beszélgetések előtérbe helyezése. A Szolgáltatás peer-to-peer WebRTC technológiával köti össze
            a résztvevőket, így az üzenetek közvetlenül az eszközök között áramlanak. Ha mindkét böngésző támogatja, a végpontok közötti titkosítás
            biztosítja, hogy az üzenetek tartalma csak a címzettek számára legyen hozzáférhető.
          </p>
        ),
      },
      {
        title: "2. Milyen információkat gyűjtünk",
        body: (
          <ul className="legal-list">
            <li>
              <strong>Munkamenet metaadatok:</strong> Ideiglenesen feldolgozzuk a munkamenet tokeneket, résztvevő-azonosítókat, visszaszámlálási
              beállításokat és csatlakozási állapotot a kapcsolódások koordinálásához és a csatlakozott személyek megjelenítéséhez.
            </li>
            <li>
              <strong>Jelzési adatok:</strong> Jelzőszerverünk ICE jelölteket és WebSocket üzeneteket cserél a kapcsolat felépítéséhez. Ezek az
              üzenetek IP-címeket és böngésző hálózati információkat tartalmazhatnak.
            </li>
            <li>
              <strong>STUN/TURN hitelesítés:</strong> Harmadik féltől származó relay szolgáltatások rövid élettartamú nonce értékeket (600
              másodpercig érvényesek) és IP-címeket kapnak kizárólag a NAT-átjárás megkönnyítéséhez.
            </li>
            <li>
              <strong>Opcionális diagnosztika:</strong> Ha az ügyféloldali hibakeresés mellett dönt, korlátozott technikai naplók menthetők az
              eszközére a csatlakozási problémák elhárításához.
            </li>
          </ul>
        ),
      },
      {
        title: "3. Hogyan használjuk az Ön adatait",
        body: (
          <p>
            A fent leírt információkat kizárólag a peer-to-peer kapcsolatok létrehozásához, a STUN/TURN szerverekhez való jogszerű hozzáférés
            hitelesítéséhez, a munkamenetek aktivitásának figyeléséhez és a Szolgáltatás visszaélésekkel szembeni védelméhez használjuk. Nem
            profilozzuk a felhasználókat, és nem használjuk az adatokat reklámozásra.
          </p>
        ),
      },
      {
        title: "4. Végpontok közötti titkosítás",
        body: (
          <p>
            Ha elérhető, a ChatOrbit AES-GCM titkosítást alkalmaz a munkamenet tokenekből közvetlenül a felhasználók eszközein származtatott
            kulcsokkal. Ezeket a kulcsokat nem kapjuk meg, és nem tudjuk visszafejteni az üzenetek tartalmát. Ha a titkosítás nem elérhető az
            egyik vagy mindkét böngészőben, az üzenetek titkosítatlanul kerülnek továbbításra, és az alkalmazás erről értesíti a résztvevőket.
          </p>
        ),
      },
      {
        title: "5. Nincs üzenettárolás",
        body: (
          <p>
            Az üzenetek tartalma soha nem tárolódik a szervereinken. Az üzenetek csak a résztvevő eszközök memóriájában léteznek az aktív
            munkamenet során, és a munkamenet végeztével vagy az alkalmazás bezárásakor eltűnnek. Emiatt nem tudjuk visszakeresni az
            üzenetelőzményeket harmadik felek, köztük a bűnüldöző szervek számára sem.
          </p>
        ),
      },
      {
        title: "6. Sütik és helyi tárolás",
        body: (
          <p>
            A ChatOrbit minimális helyi tárhelyet használ a tokenek megjegyzéséhez ugyanazon az eszközön. Nem használunk reklám sütiket, harmadik
            féltől származó követő szkripteket vagy webhelyek közötti nyomkövetési technológiákat.
          </p>
        ),
      },
      {
        title: "7. Adatmegőrzés",
        body: (
          <p>
            A munkamenet metaadatokat csak addig őrizzük meg, ameddig az aktív kapcsolatok koordinálásához és a visszaélések megelőzéséhez
            szükséges. A biztonsággal vagy csalással kapcsolatos naplókat a jogi kötelezettségekkel összhangban korlátozott ideig megőrizhetjük.
          </p>
        ),
      },
      {
        title: "8. Az Ön lehetőségei",
        body: (
          <p>
            Bármikor dönthet úgy, hogy nem hoz létre vagy nem csatlakozik munkamenethez. A helyi munkamenet-adatokat törölheti a böngészőjéből,
            vagy használhat privát böngészési módot a tokenek tárolásának elkerüléséhez. Ha kérdése van az adataival kapcsolatban, forduljon
            hozzánk a privacy@chatorbit.com címen.
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
  contactForm: {
    title: string;
    description: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    subjectLabel: string;
    subjectOptions: { value: string; label: string }[];
    messagePlaceholder: string;
    send: string;
    sending: string;
    success: string;
    error: string;
    required: string;
    invalidEmail: string;
  };
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
    contactForm: {
      title: "Contact Support",
      description: "Have a question or need help? Send us a message and we will get back to you.",
      namePlaceholder: "Your name",
      emailPlaceholder: "you@example.com",
      subjectLabel: "Subject",
      subjectOptions: [
        { value: "General Question", label: "General Question" },
        { value: "Technical Issue", label: "Technical Issue" },
        { value: "Feature Request", label: "Feature Request" },
        { value: "Other", label: "Other" },
      ],
      messagePlaceholder: "Describe your question or issue…",
      send: "Send Message",
      sending: "Sending…",
      success: "Your message has been sent. We will get back to you soon.",
      error: "Failed to send message. Please try again later.",
      required: "This field is required.",
      invalidEmail: "Please enter a valid email address.",
    },
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
    contactForm: {
      title: "Kontaktovať podporu",
      description: "Máte otázku alebo potrebujete pomoc? Pošlite nám správu a ozveme sa vám.",
      namePlaceholder: "Vaše meno",
      emailPlaceholder: "vas@email.com",
      subjectLabel: "Predmet",
      subjectOptions: [
        { value: "General Question", label: "Všeobecná otázka" },
        { value: "Technical Issue", label: "Technický problém" },
        { value: "Feature Request", label: "Požiadavka na funkciu" },
        { value: "Other", label: "Iné" },
      ],
      messagePlaceholder: "Opíšte svoju otázku alebo problém…",
      send: "Odoslať správu",
      sending: "Odosiela sa…",
      success: "Vaša správa bola odoslaná. Čoskoro sa vám ozveme.",
      error: "Správu sa nepodarilo odoslať. Skúste to neskôr.",
      required: "Toto pole je povinné.",
      invalidEmail: "Zadajte platnú e-mailovú adresu.",
    },
  },
  hu: {
    heading: "Súgó és GYIK",
    intro:
      "Problémája van a videócsevegés indításával? Kövesse az alábbi lépéseket az eszközének megfelelően a kamera és mikrofon hozzáférés visszaállításához.",
    troubleshootingTitle: "A videóhívás nem indul el, vagy a kamera nem működik",
    troubleshootingDescription:
      "A ChatOrbitnak engedélyre van szüksége a kamera és a mikrofon használatához a hívás megkezdése előtt. Ha bármelyik engedély le van tiltva, a hívás hibával leáll. Az alábbi tippeket használja a platformjának megfelelően.",
    sections: [
      {
        id: "iphone",
        title: "iPhone és iPad (Safari vagy Firefox)",
        steps: [
          (
            <>
              Nyissa meg a <strong>Beállítások → Adatvédelem és biztonság → Kamera/Mikrofon</strong> menüpontot, és győződjön meg róla, hogy a
              Firefox vagy Safari hozzáférhet mindkettőhöz.
            </>
          ),
          (
            <>
              A böngészőben nyissa meg a címsor menüjét a munkamenethez, és állítsa a Kamera és Mikrofon engedélyeket <strong>Engedélyezés</strong>-re.
            </>
          ),
          (
            <>
              Ha a kérések továbbra sem jelennek meg, törölje a webhely adatait a chat-orbit.com (vagy a telepítés) esetében, és töltse újra a
              munkamenetet az új engedélykérés elindításához.
            </>
          ),
        ],
      },
      {
        id: "android",
        title: "Android (Chrome, Firefox vagy Edge)",
        steps: [
          (
            <>
              Ellenőrizze a <strong>Beállítások → Alkalmazások → [Böngésző] → Engedélyek</strong> menüpontban, hogy a Kamera és Mikrofon engedélyezve van-e.
            </>
          ),
          <>A böngészőben koppintson a lakat ikonra a címsorban, és kapcsolja be mindkét engedélyt a webhelyhez.</>,
          (
            <>
              Töltse újra az oldalt. Ha a hívás továbbra sem működik, próbálja meg a videókérést az érintett eszközről indítani, hogy az
              engedélykérés közvetlenül a koppintásra reagáljon.
            </>
          ),
        ],
      },
      {
        id: "desktop",
        title: "Asztali gép (Windows, macOS vagy Linux)",
        steps: [
          <>Zárjon be minden más alkalmazást, amely esetleg már használja a kamerát vagy a mikrofont.</>,
          <>Használja a böngésző webhely-információs paneljét (általában a lakat ikon) a Kamera és Mikrofon hozzáférés engedélyezéséhez.</>,
          (
            <>
              macOS-en nyissa meg a <strong>Rendszerbeállítások → Adatvédelem és biztonság → Kamera/Mikrofon</strong> menüpontot, és engedélyezze a
              hozzáférést a böngészője számára. Windows-on lépjen a <strong>Beállítások → Adatvédelem és biztonság → Kamera/Mikrofon</strong>
              menüpontra, és győződjön meg róla, hogy a rendszerszintű és böngésző-specifikus kapcsolók is be vannak kapcsolva.
            </>
          ),
        ],
      },
    ],
    contactForm: {
      title: "Kapcsolatfelvétel az ügyfélszolgálattal",
      description: "Van kérdése vagy segítségre van szüksége? Küldjön nekünk üzenetet, és válaszolunk.",
      namePlaceholder: "Az Ön neve",
      emailPlaceholder: "on@pelda.hu",
      subjectLabel: "Tárgy",
      subjectOptions: [
        { value: "General Question", label: "Általános kérdés" },
        { value: "Technical Issue", label: "Technikai probléma" },
        { value: "Feature Request", label: "Funkció kérés" },
        { value: "Other", label: "Egyéb" },
      ],
      messagePlaceholder: "Írja le kérdését vagy problémáját…",
      send: "Üzenet küldése",
      sending: "Küldés…",
      success: "Üzenete elküldve. Hamarosan válaszolunk.",
      error: "Az üzenetet nem sikerült elküldeni. Próbálja újra később.",
      required: "Ez a mező kötelező.",
      invalidEmail: "Kérjük, adjon meg egy érvényes e-mail címet.",
    },
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
