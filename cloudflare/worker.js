/**
 * CET Sprint · GitHub OAuth Worker
 * 只做一件事：把 GitHub 授权码换成 token，再把 token 通过 URL fragment 交回静态站点。
 *
 * 环境变量（用 wrangler secret put 设置）：
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   STATE_SECRET
 * 普通变量（wrangler.toml [vars]）：
 *   SITE_URL
 */

const DEFAULT_SITE = 'https://interested3041.github.io/cet-sprint/';
const GH_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GH_TOKEN = 'https://github.com/login/oauth/access_token';
const GH_USER = 'https://api.github.com/user';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'cet-sprint-auth', ts: Date.now() });
    }

    if (url.pathname === '/') {
      return html(`<!doctype html><meta charset="utf-8"><title>CET Sprint Auth</title>
        <body style="font-family:system-ui;max-width:560px;margin:60px auto;padding:0 18px;color:#1b2033">
        <h2>CET Sprint · GitHub 登录服务</h2>
        <p>这是四六级冲刺站点的登录中转，不保存任何学习数据。</p>
        <p><a href="/health">健康检查</a> · <a href="${escapeHtml(siteUrl(env))}">返回学习站</a></p>
        </body>`);
    }

    if (url.pathname === '/auth') {
      try {
        requireConfig(env);
        const level = url.searchParams.get('level') === 'cet4' ? 'cet4' : 'cet6';
        const state = await signState({ level, ts: Date.now(), nonce: crypto.randomUUID() }, stateSecret(env));
        const redirectUri = url.origin + '/callback';
        const target = new URL(GH_AUTHORIZE);
        target.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
        target.searchParams.set('redirect_uri', redirectUri);
        target.searchParams.set('scope', 'read:user gist');
        target.searchParams.set('state', state);
        target.searchParams.set('allow_signup', 'false');
        return redirect(target.toString());
      } catch (err) {
        return errorPage(err.message);
      }
    }

    if (url.pathname === '/callback') {
      try {
        requireConfig(env);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        if (!code || !state) throw new Error('GitHub 没有返回授权码，请重新登录。');

        const st = await verifyState(state, stateSecret(env));
        if (!st || Date.now() - Number(st.ts) > 10 * 60 * 1000) {
          throw new Error('登录状态已过期，请重新发起登录。');
        }

        const tokenRes = await fetch(GH_TOKEN, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'cet-sprint-auth'
          },
          body: new URLSearchParams({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: url.origin + '/callback'
          })
        });
        const tokenJson = await tokenRes.json().catch(() => ({}));
        if (!tokenJson.access_token) {
          throw new Error(tokenJson.error_description || tokenJson.error || 'GitHub 未返回 access token。');
        }

        const userRes = await fetch(GH_USER, {
          headers: {
            Authorization: 'Bearer ' + tokenJson.access_token,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'cet-sprint-auth'
          }
        });
        const user = await userRes.json().catch(() => ({}));
        if (!user.login) throw new Error('登录成功，但读取 GitHub 用户名失败。');

        const site = new URL(siteUrl(env));
        const hash = new URLSearchParams({
          gh_token: tokenJson.access_token,
          gh_user: user.login,
          gh_avatar: user.avatar_url || '',
          gh_scope: tokenJson.scope || '',
          level: st.level === 'cet4' ? 'cet4' : 'cet6'
        });
        site.hash = hash.toString();

        return new Response(null, {
          status: 302,
          headers: {
            Location: site.toString(),
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer'
          }
        });
      } catch (err) {
        return errorPage(err.message);
      }
    }

    return new Response('Not found', { status: 404 });
  }
};

function siteUrl(env) {
  return String(env.SITE_URL || DEFAULT_SITE).replace(/\/+$/, '') + '/';
}

function stateSecret(env) {
  return env.STATE_SECRET || env.GITHUB_CLIENT_SECRET || '';
}

function requireConfig(env) {
  if (!env.GITHUB_CLIENT_ID) throw new Error('Worker 还没配置 GITHUB_CLIENT_ID。');
  if (!env.GITHUB_CLIENT_SECRET) throw new Error('Worker 还没配置 GITHUB_CLIENT_SECRET。');
  if (!stateSecret(env)) throw new Error('Worker 还没配置 STATE_SECRET。');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: { Location: location }
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function errorPage(message) {
  const msg = escapeHtml(message || '登录失败，请返回学习站重试。');
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>登录失败 · CET Sprint</title>
     <body style="font-family:system-ui;background:#f5f7ff;color:#1b2033;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px">
      <div style="max-width:520px;background:#fff;border:1px solid #e5e9f4;border-radius:18px;padding:26px 22px;box-shadow:0 8px 28px rgba(31,45,90,.08)">
       <div style="font-size:22px;font-weight:800;color:#2f55d4">登录没有完成</div>
       <p style="color:#6b7280;line-height:1.75;margin:12px 0 18px">${msg}</p>
       <p style="color:#6b7280;font-size:13px;line-height:1.7">你可以关掉这个页面，回到学习站重新点「GitHub 一键登录」，或者直接用游客模式进入。</p>
      </div>
     </body>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  );
}

async function signState(obj, secret) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(obj)));
  const sig = await hmac(payload, secret);
  return payload + '.' + b64url(sig);
}

async function verifyState(state, secret) {
  const parts = String(state || '').split('.');
  if (parts.length !== 2) throw new Error('登录状态格式不正确。');
  const payload = parts[0];
  const expected = b64url(await hmac(payload, secret));
  if (!timingSafeEqual(expected, parts[1])) throw new Error('登录状态校验失败。');
  return JSON.parse(new TextDecoder().decode(unb64url(payload)));
}

async function hmac(text, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function b64url(bytes) {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(text) {
  let s = String(text).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
