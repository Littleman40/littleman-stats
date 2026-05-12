<script>
  let { data } = $props();
  const currentFaq = $derived(data.faq);
</script>

<svelte:head>
  <title>{currentFaq.title} - LittleMan Stats FAQ</title>
</svelte:head>


<div class="page-strip">
  <div class="page page-wrapper">
    <a class="back-link" href="/faq">← Back to FAQs</a>

    <h1 class="title">{currentFaq.title}</h1>

    <article class="faq-body">
    {#each currentFaq.messages as faqMessage, messageIndex (messageIndex)}
      <section class="message" class:not-first={messageIndex > 0}>
        {#if faqMessage.html}
          <div class="content">{@html faqMessage.html}</div>
        {/if}

        {#if faqMessage.attachments.length > 0}
          <div class="attachments">
            {#each faqMessage.attachments as attachment}
              {#if attachment.kind === 'image'}
                <img class="att-image" src={attachment.url} alt="" loading="lazy" />
              {:else if attachment.kind === 'video'}
                <!-- svelte-ignore a11y_media_has_caption -->
                <video class="att-video" src={attachment.url} controls preload="metadata"></video>
              {:else}
                <a class="att-link" href={attachment.url} target="_blank" rel="noopener noreferrer">
                  Download attachment
                </a>
              {/if}
            {/each}
          </div>
        {/if}
      </section>
    {/each}
    </article>
  </div>
</div>

<style>
  .page-strip {
    flex: 1;
    background: var(--color-card-elevated);
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    width: 100%;
    max-width: var(--max-width);
    margin: 0 auto;
  }

  .page {
    padding-top: 2rem;
    padding-bottom: 4rem;
  }

  .back-link {
    display: inline-block;
    color: var(--color-muted);
    text-decoration: none;
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: var(--color-text);
  }

  .title {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 2rem 0;
  }

  .faq-body {
    padding: 0;
  }

  .message + .message,
  .message.not-first {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .content :global(:first-child) { margin-top: 0; }
  .content :global(:last-child) { margin-bottom: 0; }

  .content :global(h1),
  .content :global(h2),
  .content :global(h3) {
    color: var(--color-text);
    line-height: 1.3;
    margin: 1.25rem 0 0.6rem;
  }

  .content :global(h1) { font-size: 1.25rem; }
  .content :global(h2) { font-size: 1.1rem; }
  .content :global(h3) { font-size: 1rem; }

  .content :global(p) {
    color: var(--color-text);
    line-height: 1.55;
    margin: 0.5rem 0;
  }

  .content :global(blockquote) {
    border-left: 4px solid #8800f0;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.5rem 0.9rem;
    margin: 0.75rem 0;
    color: var(--color-text);
    border-radius: 0 4px 4px 0;
  }

  .content :global(ul),
  .content :global(ol) {
    padding-left: 1.5rem;
    margin: 0.5rem 0;
    color: var(--color-text);
  }

  .content :global(li) {
    margin: 0.2rem 0;
  }

  .content :global(a) {
    color: #7eb6ff;
    text-decoration: underline;
  }

  .content :global(code) {
    background: rgba(255, 255, 255, 0.08);
    padding: 0.1em 0.35em;
    border-radius: 3px;
    font-size: 0.88em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .content :global(pre) {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.75rem 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0.75rem 0;
  }

  .content :global(pre code) {
    background: transparent;
    padding: 0;
    font-size: 0.85em;
  }

  .content :global(.dc-subtext) {
    font-size: 0.8rem;
    color: var(--color-muted);
  }

  .content :global(.dc-mention) {
    background: rgba(126, 182, 255, 0.15);
    color: #7eb6ff;
    padding: 0.05em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }

  .content :global(.dc-mention-link) {
    text-decoration: none;
    transition: background 0.15s;
  }

  .content :global(.dc-mention-link:hover) {
    background: rgba(126, 182, 255, 0.28);
    text-decoration: underline;
  }

  .content :global(.dc-spoiler) {
    background: rgba(255, 255, 255, 0.12);
    padding: 0.05em 0.3em;
    border-radius: 3px;
  }

  .attachments {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .att-image,
  .att-video {
    max-width: 100%;
    border-radius: 6px;
    display: block;
  }

  .att-video {
    width: 100%;
    background: #000;
  }

  .att-link {
    color: #7eb6ff;
    font-size: 0.9rem;
  }
</style>
