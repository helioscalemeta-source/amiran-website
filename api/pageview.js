module.exports = async (req, res) => {
  if(req.method !== 'POST'){ res.status(405).json({ok:false, error:'method'}); return; }

  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
  body = body || {};

  const event_id = body.event_id;
  const event_source_url = body.event_source_url;
  const fbp = body.fbp;
  const fbc = body.fbc;

  const FB_PIXEL_ID   = process.env.FB_PIXEL_ID;
  const FB_CAPI_TOKEN = process.env.FB_CAPI_TOKEN;
  const debug = (req.query && req.query.debug) || body.debug;

  let fbResult = null;
  if(FB_PIXEL_ID && FB_CAPI_TOKEN){
    try{
      const ud = { client_user_agent: req.headers['user-agent'] };
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      if(ip) ud.client_ip_address = ip;
      if(fbp) ud.fbp = fbp;
      if(fbc) ud.fbc = fbc;
      const r = await fetch('https://graph.facebook.com/v19.0/' + FB_PIXEL_ID + '/events?access_token=' + FB_CAPI_TOKEN, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ data:[{
          event_name:'PageView',
          event_time: Math.floor(Date.now()/1000),
          event_id: event_id,
          action_source:'website',
          event_source_url: event_source_url,
          user_data: ud
        }]})
      });
      if(debug) fbResult = await r.json();
    }catch(e){ if(debug) fbResult = { error: String(e) }; }
  }

  if(debug){ res.status(200).json({ ok:true, hasPixel:!!FB_PIXEL_ID, hasToken:!!FB_CAPI_TOKEN, fb:fbResult }); return; }
  res.status(200).json({ ok:true });
};
