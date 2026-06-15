<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import Avatar from '$lib/Avatar.svelte';
  import RoleBadge from '$lib/RoleBadge.svelte';
  import Wordmark from '$lib/Wordmark.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const TRUST: Array<[string, string]> = [
    ['Credential-blind', 'The assistant never sees or stores your password.'],
    ['Permission-scoped', 'You only ever see the boards your role permits.'],
    ['Fully audited', 'Every action is attributed to the signed-in user.']
  ];
</script>

<svelte:head><title>Sign in to Cadence</title></svelte:head>

<div class="login">
  <!-- left — brand / BYOA story -->
  <div class="brand on-dark grain">
    <div class="glow"></div>
    <div class="top"><Wordmark /></div>

    <div class="story">
      <div class="secured">
        <Icon name="shieldDot" size={14} color="var(--beam)" />
        <span>Secured by Dioschub</span>
      </div>
      <h1>You bring the identity.<br />We inherit the permissions.</h1>
      <p class="sub">
        Cadence — and its embedded assistant — act with <b>your exact access</b>. Sign in once;
        everything you and the assistant do is scoped to your role and logged under your name.
      </p>
      <div class="bullets">
        {#each TRUST as [t, d] (t)}
          <div class="bullet">
            <span class="tick"><Icon name="check" size={13} color="var(--beam)" /></span>
            <span><b>{t}</b><span class="muted"> — {d}</span></span>
          </div>
        {/each}
      </div>
    </div>
    <div class="foot">© {data.workspace.name} · Powered by Intrigsoft</div>
  </div>

  <!-- right — sign in -->
  <div class="signin">
    <div class="panel">
      <div class="ws">
        <span class="ws-mark">N</span>
        <div>
          <div class="ws-name">{data.workspace.name} workspace</div>
          <div class="ws-title">Sign in to Cadence</div>
        </div>
      </div>

      <form method="POST">
        <button class="btn sso" type="submit" name="method" value="sso">
          <Icon name="shield" size={18} color="var(--beam)" /> Continue with Northwind SSO
        </button>
      </form>

      <div class="divider"><span></span><em>or with email</em><span></span></div>

      <label>Work email</label>
      <input placeholder="you@northwind.io" disabled />
      <label>Password</label>
      <input type="password" placeholder="••••••••" disabled />
      <button class="btn btn-primary signin-btn" disabled>Sign in</button>

      <!-- sandbox identity picker -->
      <div class="sandbox">
        <div class="sandbox-head">
          <span class="tag">Sandbox</span>
          <span class="tag-title">Sign in as a sample user</span>
        </div>
        <p>
          In production this is your real SSO login. Here, pick an identity to explore — watch how
          access and the assistant's scope change with each role.
        </p>
        <div class="personas">
          {#each data.personas as u (u.id)}
            <form method="POST">
              <input type="hidden" name="userId" value={u.id} />
              <button class="persona" type="submit">
                <Avatar user={u} size={34} />
                <div class="meta">
                  <div class="line1">
                    <span class="pname">{u.name}</span>
                    <RoleBadge role={u.role} />
                  </div>
                  <div class="email mono">{u.email} · {u.boardCount} boards</div>
                </div>
                <Icon name="arrowRight" size={17} color="var(--ink-3)" />
              </button>
            </form>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .login { display: flex; height: 100vh; overflow: hidden; background: var(--canvas); }

  .brand {
    width: 42%; min-width: 380px; flex: none; position: relative;
    background: var(--ink-900); color: var(--ink-on-dark);
    display: flex; flex-direction: column; padding: 44px 48px; overflow: hidden;
  }
  .glow { position: absolute; top: -80px; right: -80px; width: 320px; height: 320px; border-radius: 50%;
    background: radial-gradient(circle, rgba(140, 125, 255, 0.22), transparent 70%); pointer-events: none; }
  .top, .story, .foot { position: relative; z-index: 1; }
  .story { margin-top: auto; }
  .secured { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border-radius: 99px;
    background: var(--ink-800); border: 1px solid var(--line-dark); margin-bottom: 22px; }
  .secured span { font-size: 11.5px; font-weight: 700; color: var(--ink-on-dark-2); }
  h1 { font-family: var(--font-display); font-size: 33px; font-weight: 600; line-height: 1.12;
    letter-spacing: -0.02em; margin: 0; color: var(--ink-on-dark); }
  .sub { font-size: 14.5px; line-height: 1.6; color: var(--ink-on-dark-2); margin-top: 16px; max-width: 380px; }
  .sub b { color: var(--ink-on-dark); }
  .bullets { display: flex; flex-direction: column; gap: 12px; margin-top: 26px; }
  .bullet { display: flex; gap: 11px; align-items: flex-start; }
  .tick { width: 22px; height: 22px; border-radius: 7px; background: var(--ink-800); flex: none;
    display: grid; place-items: center; margin-top: 1px; border: 1px solid var(--line-dark); }
  .bullet b { font-size: 13.5px; color: var(--ink-on-dark); }
  .muted { font-size: 13px; color: var(--ink-on-dark-3); }
  .foot { font-size: 11.5px; color: var(--ink-on-dark-3); margin-top: 40px; }

  .signin { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 32px; overflow-y: auto; }
  .panel { width: min(420px, 100%); animation: fadeUp 0.5s ease both; }
  .ws { display: flex; align-items: center; gap: 11px; margin-bottom: 8px; }
  .ws-mark { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #4b3fe4, #0e8c7f);
    display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 16px; }
  .ws-name { font-size: 13px; color: var(--ink-3); font-weight: 600; }
  .ws-title { font-family: var(--font-display); font-size: 19px; font-weight: 600; color: var(--ink); }

  .sso { width: 100%; height: 46px; justify-content: center; margin-top: 22px;
    background: var(--ink-900); color: var(--ink-on-dark); font-size: 14px; }
  .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
  .divider span { flex: 1; height: 1px; background: var(--line-2); }
  .divider em { font-size: 11.5px; color: var(--ink-3); font-weight: 600; font-style: normal; }

  label { display: block; font-size: 12px; font-weight: 700; color: var(--ink-2); margin: 0 0 6px; }
  label:nth-of-type(2) { margin-top: 14px; }
  input { width: 100%; height: 44px; padding: 0 14px; border-radius: 11px; border: 1px solid var(--line-2);
    font-size: 14px; color: var(--ink); outline: none; background: var(--surface); }
  input:focus { border-color: var(--brand); }
  .signin-btn { width: 100%; height: 46px; justify-content: center; margin-top: 16px; opacity: 0.55; pointer-events: none; }

  .sandbox { margin-top: 30px; padding: 16px; border-radius: 14px; background: var(--surface);
    border: 1px solid var(--line); box-shadow: var(--shadow-card); }
  .sandbox-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .tag { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
    color: #9a6512; background: #fbebd6; padding: 2px 7px; border-radius: 6px; }
  .tag-title { font-size: 13px; font-weight: 700; color: var(--ink); }
  .sandbox p { font-size: 12px; color: var(--ink-2); margin: 0 0 12px; line-height: 1.5; }
  .personas { display: flex; flex-direction: column; gap: 6px; }
  .personas form { display: contents; }
  .persona { width: 100%; display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 11px;
    text-align: left; border: 1px solid var(--line); background: var(--canvas); transition: 0.12s; }
  .persona:hover { border-color: var(--brand); background: var(--brand-tint); }
  .meta { flex: 1; line-height: 1.3; min-width: 0; }
  .line1 { display: flex; align-items: center; gap: 7px; }
  .pname { font-size: 13.5px; font-weight: 700; color: var(--ink); white-space: nowrap; }
  .email { font-size: 11px; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mono { font-family: var(--font-mono); }
</style>
