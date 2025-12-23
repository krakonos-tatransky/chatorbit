// Polyfill Buffer for React Native (required by quick-crypto)
import { Buffer } from '@craftzdog/react-native-buffer';
(global as any).Buffer = Buffer;

// Polyfill Web Crypto API for React Native
import 'react-native-quick-crypto';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
