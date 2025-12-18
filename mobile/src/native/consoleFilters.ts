import { LogBox } from 'react-native';

const IGNORED_NATIVE_WARNINGS = [
  'hapticpatternlibrary.plist',
  'Error creating CHHapticPattern',
  'RemoteTextInput',
  'perform input operation requires a valid sessionID',
  'UIKBFeedbackGenerator'
];

type ConsoleMethod = (...args: any[]) => void;

const filterConsole = (original: ConsoleMethod): ConsoleMethod =>
  (...args: any[]) => {
    const shouldIgnore = args.some((arg) => {
      if (typeof arg !== 'string') {
        return false;
      }
      return IGNORED_NATIVE_WARNINGS.some((pattern) => arg.includes(pattern));
    });
    if (shouldIgnore) {
      return;
    }
    original(...args);
  };

export const applyNativeConsoleFilters = () => {
  // eslint-disable-next-line no-console
  console.warn = filterConsole(console.warn.bind(console));
  // eslint-disable-next-line no-console
  console.error = filterConsole(console.error.bind(console));

  LogBox.ignoreLogs(IGNORED_NATIVE_WARNINGS);
};

export const getIgnoredNativeWarnings = () => IGNORED_NATIVE_WARNINGS;
