const crypto = require('crypto');

function sha256(v){
  if(!v) return null;
  return crypto.createHash('sha256').update(String(v).toLowerCase().trim()).digest('hex');
}

module.exports = async (req, res) => {
  if(req.method !== 'POST'){ res.status(405).json({ok:false, error:'method'}); return; }

  let body = req.body;
  if(typeof body === 'string'){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
  body = body || {};

  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  const tg = (body.tg || '').trim();
  const source = body.source || '';
  const event_id = body.event_id;
  const event_source_url = body.event_source_url;
  const fbp = body.fbp;
  const fbc = body.fbc;

  const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
  const TG_GROUP_ID  = process.env.TG_GROUP_ID;
  const FB_PIXEL_ID  = process.env.FB_PIXEL_ID;
  const FB_CAPI_TOKEN = process.env.FB_CAPI_TOKEN;

  // 1) Уведомление в Telegram
  if(TG_BOT_TOKEN && TG_GROUP_ID){
    try{
      let text = '📝 <b>Новая заявка</b>' + (source ? ' (' + source + ')' : '') + '\n\n';
      text += '👤 Имя: <b>' + name.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</b>\n';
      if(phone) text += '📞 Телефон: <b>' + phone + '</b>\n';
      if(tg)    text += '💬 Telegram: <b>' + tg + '</b>\n';
      text += '\n📅 ' + new Date().toLocaleString('ru-RU');
      await fetch('https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ chat_id: TG_GROUP_ID, text: text, parse_mode:'HTML' })
      });
    }catch(e){}
  }

  // 2) Facebook Conversions API — событие Lead
  if(FB_PIXEL_ID && FB_CAPI_TOKEN){
    try{
      const ud = { client_user_agent: req.headers['user-agent'] };
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      if(ip) ud.client_ip_address = ip;
      if(fbp) ud.fbp = fbp;
      if(fbc) ud.fbc = fbc;
      if(phone) ud.ph = [ sha256(phone.replace(/\D/g,'')) ];
      if(name){
        const p = name.split(/\s+/);
        ud.fn = [ sha256(p[0]) ];
        if(p[1]) ud.ln = [ sha256(p[1]) ];
      }
      await fetch('https://graph.facebook.com/v19.0/' + FB_PIXEL_ID + '/events?access_token=' + FB_CAPI_TOKEN, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ data:[{
          event_name:'Lead',
          event_time: Math.floor(Date.now()/1000),
          event_id: event_id,
          action_source:'website',
          event_source_url: event_source_url,
          user_data: ud
        }]})
      });
    }catch(e){}
  }

  res.status(200).json({ ok:true });
};
