export const standaloneRealtime = `
    // [WebSim] Trystero (P2P) Realtime Adapter
    // Uses WebRTC/Torrent via free public trackers for serverless multiplayer
    
    class WebsimSocket {
        constructor() {
            this.presence = {};
            this.peers = {};
            this.roomState = {};
            this.clientId = 'user-' + Math.random().toString(36).substr(2, 9);
            this.listeners = { presence: new Set(), roomState: new Set(), message: null };
            this.isConnected = false;
            
            this.room = null;
            this.actions = null;
            
            // Auto-init
            setTimeout(() => this._init(), 100);
        }
        
        async _init() {
            try {
                // Dynamic Import to avoid top-level await/hoisting issues in polyfill bundle
                // Using a specific version to ensure stability
                const { joinRoom } = await import('https://esm.sh/trystero@0.19.2/torrent');

                // Unique room ID based on project ID or generic global
                // We use a prefix to avoid collisions with other Trystero apps
                const projectId = window.websim_project_id || 'global-standalone';
                const roomId = 'ws-p2p-' + projectId;
                
                console.log('[WebSim:P2P] Joining Mesh Room:', roomId);
                
                const config = { appId: 'websim-standalone' };
                this.room = joinRoom(config, roomId);
                
                // Define Actions
                const [sendPresence, getPresence] = this.room.makeAction('presence');
                const [sendState, getState] = this.room.makeAction('state');
                const [sendMsg, getMsg] = this.room.makeAction('msg');
                
                this.actions = { sendPresence, sendState, sendMsg };
            
            // 1. Handle Presence
            getPresence((data, peerId) => {
                // peerId is the Trystero ID, data.clientId is the WebSim ID
                this._handlePresence(data);
            });
            
            // 2. Handle Messages
            getMsg((data, peerId) => {
                if (this.listeners.message) {
                    this.listeners.message({ 
                        data: { ...data, clientId: data.clientId || peerId } 
                    });
                }
            });

            // 3. Room Events
            this.room.onPeerJoin(peerId => {
                console.log('[WebSim:P2P] Peer Connected:', peerId);
                this._broadcastPresence();
            });
            
            this.room.onPeerLeave(peerId => {
                // We need to map Trystero peerId to WebSim clientId if possible
                // For now, we rely on timeout pruning or explicit leave messages if implemented
                console.log('[WebSim:P2P] Peer Left:', peerId);
            });
            
            this.isConnected = true;
            this._joinSelf();
            
            // Heartbeat
            setInterval(() => this._broadcastPresence(), 5000);
            
            } catch(e) {
                console.error('[WebSim:P2P] Failed to initialize Trystero:', e);
            }
        }
        
        async _joinSelf() {
            // Wait for user identity to be hydrated
            let tries = 0;
            while(!window._currentUser && tries < 10) { await new Promise(r => setTimeout(r, 200)); tries++; }
            
            const u = window._currentUser || { username: 'Guest', avatar_url: '' };
            
            // Initial State
            this.presence[this.clientId] = { joined: true };
            this.peers[this.clientId] = { id: this.clientId, ...u };
            
            this._notifyPresence();
            this._broadcastPresence();
        }
        
        _handlePresence(data) {
            const { clientId, user, payload } = data;
            if (!clientId) return;
            
            this.presence[clientId] = { ...this.presence[clientId], ...payload };
            if (user) {
                this.peers[clientId] = { id: clientId, ...user };
            }
            this._notifyPresence();
        }
        
        _broadcastPresence() {
            if (!this.actions) return;
            this.actions.sendPresence({
                clientId: this.clientId,
                user: window._currentUser,
                payload: this.presence[this.clientId]
            });
        }
        
        _notifyPresence() {
            this.listeners.presence.forEach(cb => cb(this.presence));
        }

        // --- Public API (WebSimSocket Compatibility) ---
        subscribePresence(cb) {
            this.listeners.presence.add(cb);
            cb(this.presence);
            return () => this.listeners.presence.delete(cb);
        }
        
        subscribeRoomState(cb) {
            this.listeners.roomState.add(cb);
            cb(this.roomState);
            return () => this.listeners.roomState.delete(cb);
        }
        
        updatePresence(data) {
            this.presence[this.clientId] = { ...this.presence[this.clientId], ...data };
            this._notifyPresence();
            this._broadcastPresence();
        }
        
        send(data) {
            if (this.actions) this.actions.sendMsg({ ...data, clientId: this.clientId });
        }
        
        updateRoomState(data) {
            this.roomState = { ...this.roomState, ...data };
            // In a mesh, state consistency is hard. We just broadcast "my version" 
            // and clients merge. Real apps need a host or consensus.
            // For simple games, this is often "good enough".
        }
        
        collection(name) {
             return window.GenericDB.getAdapter(name);
        }
        
        static updateIdentity(user) {
            window._currentUser = user;
            if (window.party) {
                window.party.peers[window.party.clientId] = { ...window.party.peers[window.party.clientId], ...user };
                window.party._broadcastPresence();
            }
        }
    }
    
    // Auto-init
    window.WebsimSocket = WebsimSocket;
    window.party = new WebsimSocket();
`;