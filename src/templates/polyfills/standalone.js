import { simpleLoggerJs } from '../logger.js';
import { webAudioPolyfill } from '../audio.js';
import { avatarInjector } from '../misc.js';
import { modalStub } from '../stubs/modal.js';
import { standaloneRealtime } from './standalone/realtime.js';
import { standaloneDatabase } from './standalone/database.js';
import { standaloneStubs } from './standalone/stubs.js';

export const standalonePolyfills = `
/* WebSim Standalone Polyfills */
/* Target: HTML5 / PeerJS / LocalStorage */

// 1. Logger & Audio (Standard)
${simpleLoggerJs}
${webAudioPolyfill}

// 2. Avatar Injector (Works via /_websim_avatar_ replacement still useful for placeholder logic)
${avatarInjector}

// 3. Database (LocalStorage)
${standaloneDatabase}

// 4. Realtime (Trystero/PeerJS)
${standaloneRealtime}

// 5. API Stubs & Fetch Interception
${standaloneStubs}

// 6. UI Helpers
${modalStub}

// 7. Remotion Bridge (Stub)
window.remotion_bridge = {
    Player: () => null // Placeholder if not strictly needed or handle via React
};
`;