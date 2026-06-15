<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  import Avatar from '$lib/Avatar.svelte';
  import { assistantOpen } from '$lib/stores';
  import type { BoardSummary, User } from '$lib/server/types';

  let {
    currentUser,
    boards
  }: { currentUser: User; boards: BoardSummary[] } = $props();

  // Stub conversation — live AI is wired in phase 2 (DioscHub MCP). The panel
  // demonstrates the embedded "secure layer": operating-as identity + audit framing.
  type Msg = { who: 'user' | 'bot'; text: string };
  let msgs = $state<Msg[]>([]);
  let val = $state('');
  let typing = $state(false);
  let scroller: HTMLDivElement | undefined;

  const firstName = $derived(currentUser.name.split(' ')[0]);
  const scopeCount = $derived(boards.length);
  const suggestions = $derived([
    `What's assigned to me?`,
    `Summarize ${boards[0]?.name ?? 'my board'}`,
    `What's overdue?`
  ]);

  // Reset the conversation whenever the identity changes — new scope.
  let lastUser = currentUser.id;
  $effect(() => {
    if (currentUser.id !== lastUser) {
      lastUser = currentUser.id;
      msgs = [];
      typing = false;
      val = '';
    }
  });

  $effect(() => {
    void msgs.length;
    void typing;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });

  function send(text: string) {
    const t = text.trim();
    if (!t) return;
    msgs = [...msgs, { who: 'user', text: t }];
    val = '';
    typing = true;
    setTimeout(() => {
      typing = false;
      msgs = [
        ...msgs,
        {
          who: 'bot',
          text: `In the live demo I'd act on this directly — moving cards, assigning work, or answering — but only across the ${scopeCount} board${scopeCount !== 1 ? 's' : ''} you can access, and every action is logged as ${currentUser.email}.`
        }
      ];
    }, 900);
  }
</script>

<aside class="on-dark panel" class:open={$assistantOpen}>
  <div class="inner">
    <div class="header">
      <div class="title-row">
        <span class="spark-box"><Icon name="spark" size={19} color="var(--beam)" /></span>
        <div class="title-text">
          <div class="title">Dioschub Assistant</div>
          <div class="subtitle">Embedded in Cadence</div>
        </div>
        <button class="close" onclick={() => assistantOpen.set(false)}><Icon name="x" size={19} /></button>
      </div>

      <div class="operating">
        <Avatar user={currentUser} size={26} ring="dark" />
        <div class="op-text">
          <div class="op-label">Operating as</div>
          <div class="op-email mono">{currentUser.email}</div>
        </div>
        <span class="live"><span class="live-dot"></span> live</span>
      </div>

      <div class="badges">
        <span class="badge"><Icon name="shieldDot" size={12} color="var(--beam)" /> Credential-blind</span>
        <span class="badge"><Icon name="check" size={12} color="var(--beam)" /> Audit-logged</span>
        <span class="badge"><Icon name="lock" size={12} color="var(--beam)" /> {scopeCount} boards in scope</span>
      </div>
    </div>

    <div class="convo" bind:this={scroller}>
      <div class="welcome">
        <span class="bot-ico"><Icon name="spark" size={15} color="var(--beam)" /></span>
        <div class="welcome-text">
          Hi {firstName} — I'm your Dioschub assistant, working inside Cadence with <b>your exact permissions</b>.
          I can see your <b>{scopeCount}</b> board{scopeCount !== 1 ? 's' : ''} — nothing you can't.
        </div>
      </div>

      {#each msgs as m, i (i)}
        {#if m.who === 'user'}
          <div class="user-row"><div class="user-bubble">{m.text}</div></div>
        {:else}
          <div class="bot-row">
            <span class="bot-ico"><Icon name="spark" size={15} color="var(--beam)" /></span>
            <div class="bot-text">{m.text}</div>
          </div>
        {/if}
      {/each}

      {#if typing}
        <div class="bot-row">
          <span class="bot-ico"><Icon name="spark" size={15} color="var(--beam)" /></span>
          <div class="dots"><span></span><span></span><span></span></div>
        </div>
      {/if}
    </div>

    {#if msgs.length === 0}
      <div class="suggestions">
        {#each suggestions as s (s)}
          <button class="chip-btn" onclick={() => send(s)}>{s}</button>
        {/each}
      </div>
    {/if}

    <div class="composer">
      <div class="input-wrap">
        <textarea
          bind:value={val}
          rows="1"
          placeholder={`Ask anything, as ${firstName}…`}
          onkeydown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(val);
            }
          }}></textarea>
        <button class="send" class:active={val.trim()} onclick={() => send(val)} disabled={!val.trim()}>
          <Icon name="send" size={17} />
        </button>
      </div>
      <div class="disclaimer">
        <Icon name="shield" size={12} color="var(--ink-on-dark-3)" /> Dioschub never sees your credentials. Every action is logged as you.
      </div>
    </div>
  </div>
</aside>

<style>
  .panel { width: 0; flex: none; overflow: hidden; transition: width 0.34s cubic-bezier(0.3, 0.9, 0.3, 1);
    background: var(--ink-900); height: 100%; }
  .panel.open { width: var(--assistant-w); border-left: 1px solid var(--line-dark); }
  .inner { width: var(--assistant-w); height: 100%; display: flex; flex-direction: column; }

  .header { flex: none; padding: 14px 16px; border-bottom: 1px solid var(--line-dark);
    background: linear-gradient(180deg, var(--ink-850), var(--ink-900)); }
  .title-row { display: flex; align-items: center; gap: 11px; }
  .spark-box { width: 34px; height: 34px; border-radius: 10px; background: var(--ink-800);
    border: 1px solid var(--line-dark); display: grid; place-items: center; flex: none; }
  .title-text { flex: 1; line-height: 1.2; }
  .title { font-family: var(--font-display); font-weight: 600; font-size: 15.5px; color: var(--ink-on-dark); }
  .subtitle { font-size: 11px; color: var(--ink-on-dark-3); }
  .close { width: 32px; height: 32px; display: grid; place-items: center; color: var(--ink-on-dark-2); border-radius: 8px; }
  .close:hover { background: rgba(244, 241, 234, 0.07); }

  .operating { margin-top: 12px; display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 10px;
    background: var(--ink-850); border: 1px solid var(--line-dark); }
  .op-text { flex: 1; min-width: 0; line-height: 1.25; }
  .op-label { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-on-dark-3); }
  .op-email { font-size: 11.5px; color: var(--ink-on-dark); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mono { font-family: var(--font-mono); }
  .live { display: flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #6fe0a8; flex: none; }
  .live-dot { width: 6px; height: 6px; border-radius: 99px; background: #6fe0a8; box-shadow: 0 0 0 3px rgba(111, 224, 168, 0.18); }

  .badges { display: flex; gap: 6px; margin-top: 9px; flex-wrap: wrap; }
  .badge { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: var(--ink-on-dark-2);
    background: var(--ink-800); border: 1px solid var(--line-dark); padding: 3px 7px; border-radius: 7px; }

  .convo { flex: 1; overflow-y: auto; padding: 18px 16px 8px; }
  .welcome { display: flex; gap: 10px; margin-bottom: 18px; }
  .bot-ico { width: 28px; height: 28px; border-radius: 8px; background: var(--ink-800); display: grid; place-items: center;
    flex: none; border: 1px solid var(--line-dark); }
  .welcome-text, .bot-text { flex: 1; font-size: 13.5px; color: var(--ink-on-dark); line-height: 1.55; }
  .user-row { display: flex; justify-content: flex-end; margin-bottom: 14px; }
  .user-bubble { max-width: 82%; background: var(--beam-soft); color: #fff; font-size: 13.5px; line-height: 1.5;
    padding: 9px 13px; border-radius: 14px 14px 4px 14px; }
  .bot-row { display: flex; gap: 10px; margin-bottom: 16px; }
  .dots { display: flex; gap: 4px; align-items: center; height: 24px; }
  .dots span { width: 6px; height: 6px; border-radius: 99px; background: var(--ink-on-dark-3); animation: beamPulse 1s ease-in-out infinite; }
  .dots span:nth-child(2) { animation-delay: 0.16s; }
  .dots span:nth-child(3) { animation-delay: 0.32s; }

  .suggestions { flex: none; padding: 0 16px 10px; display: flex; flex-wrap: wrap; gap: 7px; }
  .chip-btn { font-size: 12px; font-weight: 600; color: var(--ink-on-dark-2); background: var(--ink-800);
    border: 1px solid var(--line-dark); padding: 6px 11px; border-radius: 99px; transition: 0.12s; }
  .chip-btn:hover { border-color: var(--beam-soft); color: var(--ink-on-dark); }

  .composer { flex: none; padding: 12px 16px 14px; border-top: 1px solid var(--line-dark); }
  .input-wrap { display: flex; align-items: flex-end; gap: 8px; background: var(--ink-850); border: 1px solid var(--line-dark);
    border-radius: 13px; padding: 7px 7px 7px 13px; }
  textarea { flex: 1; resize: none; border: none; background: transparent; color: var(--ink-on-dark); font-size: 13.5px;
    outline: none; max-height: 90px; line-height: 1.45; padding: 5px 0; font-family: inherit; }
  .send { width: 34px; height: 34px; border-radius: 9px; background: var(--ink-800); display: grid; place-items: center;
    flex: none; transition: 0.14s; color: var(--ink-on-dark-3); }
  .send.active { background: var(--beam-soft); color: #fff; }
  .disclaimer { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 10.5px; color: var(--ink-on-dark-3); }
</style>
