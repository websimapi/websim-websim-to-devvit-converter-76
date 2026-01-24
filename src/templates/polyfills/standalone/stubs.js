export const standaloneStubs = `
    // [WebSim] Standalone API Stubs
    
    // 1. Monkeypatch Fetch for Comments/Tips (Local Storage Backend)
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
        let url = input;
        if (typeof input === 'string') {
            // Mock Comments API
            if (url.includes('/api/comments') || url.includes('/api/tips')) {
                // Determine collection based on URL params or path
                // Simple mock: treat both as 'comments' collection in local DB
                const isTip = url.includes('only_tips=true') || url.includes('/api/tips');
                
                if (init && init.method === 'POST') {
                    // Create
                    const body = JSON.parse(init.body);
                    await window.GenericDB.getAdapter('ws_comments').create({
                        content: body.content,
                        parentId: body.parentId,
                        credits: body.credits, // simulated tip
                        is_tip: !!body.credits
                    });
                    return new Response(JSON.stringify({ success: true }));
                } else {
                    // Read
                    const list = window.GenericDB.getAdapter('ws_comments').getList();
                    // Transform to WebSim format
                    const data = list.filter(i => isTip ? i.is_tip : true).map(i => ({
                         comment: {
                             id: i.id,
                             raw_content: i.content,
                             author: { username: i.username, avatar_url: i.avatar_url },
                             created_at: i.created_at,
                             card_data: i.is_tip ? { type: 'tip_comment', credits_spent: i.credits } : null
                         }
                    }));
                    return new Response(JSON.stringify({ comments: { data } }));
                }
            }
            
            // Mock Project Info
            if (url.includes('/api/project')) {
                return new Response(JSON.stringify({
                    id: 'local-standalone',
                    title: document.title,
                    owner: { username: 'StandaloneUser' }
                }));
            }
            
            // Mock User Info
            if (url.includes('/api/user') || url.includes('/api/identity')) {
                 return new Response(JSON.stringify(window._currentUser));
            }
        }
        return originalFetch(input, init);
    };

    // 2. WebSim Global Object
    window.websim = {
        getCurrentUser: async () => window._currentUser,
        getProject: async () => ({ id: 'local', title: 'Standalone App' }),
        upload: async (file) => URL.createObjectURL(file), // Session only
        collection: (name) => window.GenericDB.getAdapter(name)
    };
    
    // 3. Mock Purchase API (Tips)
    window.purchase = async (sku) => {
        console.log('[WebSim] Simulating purchase:', sku);
        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));
        
        // Always succeed
        const amount = parseInt(sku.replace(/\D/g, '') || '0');
        
        // Update local user total
        const u = window._currentUser;
        u.total_tipped = (parseInt(u.total_tipped || '0') + amount);
        localStorage.setItem('ws_user', JSON.stringify(u));
        
        return { status: 'SUCCESS' }; // Mock Devvit status
    };
    
    // Mock Devvit Status Enum
    window.OrderResultStatus = { STATUS_SUCCESS: 'SUCCESS', STATUS_FAILED: 'FAILED' };
`;