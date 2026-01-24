export const standaloneDatabase = `
    // [WebSim] Standalone DB Adapter (LocalStorage)
    
    window._db_subscribers = {};
    
    // Simple mock user management
    const getUser = () => {
        let u = localStorage.getItem('ws_user');
        if (!u) {
            u = JSON.stringify({
                id: 'user_' + Math.random().toString(36).substr(2, 6),
                username: 'Player_' + Math.floor(Math.random()*1000),
                avatar_url: 'https://www.redditstatic.com/avatars/avatar_default_02_FF4500.png',
                created_at: new Date().toISOString()
            });
            localStorage.setItem('ws_user', u);
        }
        return JSON.parse(u);
    };
    
    window._currentUser = getUser();

    window.GenericDB = {
        _getStore(col) {
            try {
                return JSON.parse(localStorage.getItem('ws_db_' + col) || '{}');
            } catch(e) { return {}; }
        },
        _saveStore(col, data) {
            localStorage.setItem('ws_db_' + col, JSON.stringify(data));
            if (window._db_subscribers[col]) {
                const list = Object.values(data).sort((a,b) => (b.created_at||0) < (a.created_at||0) ? -1 : 1);
                window._db_subscribers[col].forEach(cb => cb(list));
            }
        },
        
        getAdapter(name) {
            return {
                getList: () => {
                    const data = window.GenericDB._getStore(name);
                    return Object.values(data).sort((a,b) => (b.created_at||0) < (a.created_at||0) ? -1 : 1);
                },
                create: async (data) => {
                    const store = window.GenericDB._getStore(name);
                    const id = Math.random().toString(36).substr(2, 9);
                    const u = window._currentUser;
                    
                    const item = { 
                        id, 
                        created_at: new Date().toISOString(), 
                        owner_id: u.id,
                        username: u.username,
                        avatar_url: u.avatar_url,
                        ...data 
                    };
                    store[id] = item;
                    window.GenericDB._saveStore(name, store);
                    return item;
                },
                update: async (id, data) => {
                    const store = window.GenericDB._getStore(name);
                    if (!store[id]) throw new Error('Not found');
                    store[id] = { ...store[id], ...data };
                    window.GenericDB._saveStore(name, store);
                    return store[id];
                },
                delete: async (id) => {
                    const store = window.GenericDB._getStore(name);
                    delete store[id];
                    window.GenericDB._saveStore(name, store);
                },
                subscribe: (cb) => {
                    if (!window._db_subscribers[name]) window._db_subscribers[name] = [];
                    window._db_subscribers[name].push(cb);
                    // Initial call
                    cb(Object.values(window.GenericDB._getStore(name)));
                    return () => window._db_subscribers[name] = window._db_subscribers[name].filter(c => c !== cb);
                },
                filter: (criteria) => {
                    // Simple exact match filter
                    const matches = (item) => {
                        for (const k in criteria) if (item[k] !== criteria[k]) return false;
                        return true;
                    };
                    return {
                        getList: () => Object.values(window.GenericDB._getStore(name)).filter(matches),
                        subscribe: (cb) => {
                            return window.GenericDB.getAdapter(name).subscribe(list => {
                                cb(list.filter(matches));
                            });
                        }
                    };
                }
            };
        }
    };
    
    // Announce ready
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('GAMEDATA_READY', { detail: {} }));
    }, 100);
`;