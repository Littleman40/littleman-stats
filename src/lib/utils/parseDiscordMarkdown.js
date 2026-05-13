const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function fnEscapeHtml(rawText) {
  return rawText.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function fnSafeUrl(rawUrl) {
  const trimmedUrl = rawUrl.trim();
  if (/^(https?:|mailto:)/i.test(trimmedUrl)) return trimmedUrl;
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#')) return trimmedUrl;
  return null;
}

function fnProcessInline(escapedText, parseOptions) {
  let workingText = escapedText;

  workingText = workingText.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '$1');                             // remove discord's url wrapping

  workingText = workingText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkLabel, linkUrl) => {       // handles url's where labels and urls are together
    const safeLinkUrl = fnSafeUrl(linkUrl);
    if (!safeLinkUrl) return linkLabel;                                                                  // drop unsafe URL, keep visible text
    return `<a href="${fnEscapeHtml(safeLinkUrl)}" target="_blank" rel="noopener noreferrer">${linkLabel}</a>`;
  });

  workingText = workingText.replace(/&lt;#(\d+)&gt;/g, (_match, channelId) => {                          // turns <#id> into link or faq page
    const resolvedChannel = parseOptions?.resolveChannel?.(channelId);
    if (!resolvedChannel) return '<span class="dc-mention">#channel</span>';
    const externalAttrs = resolvedChannel.external
      ? ' target="_blank" rel="noopener noreferrer"'
      : '';
    return `<a class="dc-mention dc-mention-link" href="${fnEscapeHtml(resolvedChannel.href)}"${externalAttrs}>${fnEscapeHtml(resolvedChannel.label)}</a>`;
  });
  workingText = workingText.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="dc-mention">@role</span>');   // role mentions
  workingText = workingText.replace(/&lt;@!?(\d+)&gt;/g, '<span class="dc-mention">@user</span>');      // user mentions

  workingText = workingText.replace(/\|\|([^|]+)\|\|/g, '<span class="dc-spoiler">$1</span>');          // spoilers
  workingText = workingText.replace(/__([^_]+)__/g, '<u>$1</u>');                                       // underline
  workingText = workingText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');                         // bold
  workingText = workingText.replace(/~~([^~]+)~~/g, '<s>$1</s>');                                       // strikethrough
  workingText = workingText.replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s.,!?)]|$)/g, '$1<em>$2</em>');  // italic *
  workingText = workingText.replace(/(^|[\s(])_(?!\s)([^_\n]+?)_(?=[\s.,!?)]|$)/g, '$1<em>$2</em>');    // italic _

  return workingText;
}

function fnClassifyLine(rawLine) {
  const subtextMatch = /^-#\s+(.*)$/.exec(rawLine);                                                     // very small text
  if (subtextMatch) return { kind: 'subtext', text: subtextMatch[1] };

  const headingMatch = /^(#{1,3})\s+(.*)$/.exec(rawLine);                                               // ### small / ## normal / # big heading
  if (headingMatch) return { kind: 'heading', level: headingMatch[1].length, text: headingMatch[2] };

  const quoteMatch = /^>\s?(.*)$/.exec(rawLine);                                                        // blockquotes
  if (quoteMatch) return { kind: 'quote', text: quoteMatch[1] };

  const bulletMatch = /^[-*]\s+(.*)$/.exec(rawLine);                                                    // bullet points
  if (bulletMatch) return { kind: 'ul', text: bulletMatch[1] };

  const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(rawLine);                                               // numbered points
  if (numberedMatch) return { kind: 'ol', text: numberedMatch[2] };

  return { kind: 'text', text: rawLine };
}

function fnRenderBlocks(allLines, parseOptions) {
  const outputParts = [];
  let openBlockKind = null;
  let paragraphBuffer = [];

  const fnInline = (rawText) => fnProcessInline(fnEscapeHtml(rawText), parseOptions);

  const fnCloseOpenBlock = () => {
    if (openBlockKind === 'quote') outputParts.push('</blockquote>');
    else if (openBlockKind === 'ul') outputParts.push('</ul>');
    else if (openBlockKind === 'ol') outputParts.push('</ol>');
    else if (openBlockKind === 'p') {
      outputParts.push(`<p>${paragraphBuffer.join('<br>')}</p>`);
      paragraphBuffer = [];
    }
    openBlockKind = null;
  };

  for (const currentLine of allLines) {
    if (currentLine.trim() === '') {
      fnCloseOpenBlock();
      continue;
    }

    const classified = fnClassifyLine(currentLine);

    if (classified.kind === 'heading') {
      fnCloseOpenBlock();
      outputParts.push(`<h${classified.level}>${fnInline(classified.text)}</h${classified.level}>`);
      continue;
    }

    if (classified.kind === 'subtext') {
      fnCloseOpenBlock();
      outputParts.push(`<p class="dc-subtext">${fnInline(classified.text)}</p>`);
      continue;
    }

    if (classified.kind === 'quote') {
      if (openBlockKind !== 'quote') { fnCloseOpenBlock(); outputParts.push('<blockquote>'); openBlockKind = 'quote'; }
      outputParts.push(fnInline(classified.text) + '<br>');
      continue;
    }

    if (classified.kind === 'ul') {
      if (openBlockKind !== 'ul') { fnCloseOpenBlock(); outputParts.push('<ul>'); openBlockKind = 'ul'; }
      outputParts.push(`<li>${fnInline(classified.text)}</li>`);
      continue;
    }

    if (classified.kind === 'ol') {
      if (openBlockKind !== 'ol') { fnCloseOpenBlock(); outputParts.push('<ol>'); openBlockKind = 'ol'; }
      outputParts.push(`<li>${fnInline(classified.text)}</li>`);
      continue;
    }

    if (openBlockKind !== 'p') { fnCloseOpenBlock(); openBlockKind = 'p'; }
    paragraphBuffer.push(fnInline(classified.text));
  }

  fnCloseOpenBlock();
  return outputParts.join('');
}

function fnBridgeBlockquotes(allLines) {
  const bridgedLines = [];
  for (let lineIndex = 0; lineIndex < allLines.length; lineIndex++) {
    const currentLine = allLines[lineIndex];

    if (currentLine.trim() === '') {
      const previousLine = bridgedLines[bridgedLines.length - 1];
      const previousIsQuote = previousLine !== undefined && /^>/.test(previousLine);
      if (previousIsQuote) {
        let nextIsQuote = false;
        for (let lookAhead = lineIndex + 1; lookAhead < allLines.length; lookAhead++) {
          if (allLines[lookAhead].trim() === '') continue;
          nextIsQuote = /^>/.test(allLines[lookAhead]);
          break;
        }
        if (nextIsQuote) {
          bridgedLines.push('>');
          continue;
        }
      }
    }
    bridgedLines.push(currentLine);
  }
  return bridgedLines;
}

export function fnParseDiscordMarkdown(rawInput, parseOptions) {
  if (!rawInput || typeof rawInput !== 'string') return '';

  const codeBlockHtml = [];
  let workingText = rawInput.replace(/```(?:\w+\n)?([\s\S]*?)```/g, (_match, codeBody) => {
    codeBlockHtml.push(`<pre><code>${fnEscapeHtml(codeBody.replace(/^\n|\n$/g, ''))}</code></pre>`);
    return ` CB${codeBlockHtml.length - 1} `;
  });

  const inlineCodeHtml = [];
  workingText = workingText.replace(/`([^`\n]+)`/g, (_match, codeBody) => {
    inlineCodeHtml.push(`<code>${fnEscapeHtml(codeBody)}</code>`);
    return ` IC${inlineCodeHtml.length - 1} `;
  });

  const bridgedLines = fnBridgeBlockquotes(workingText.split('\n'));
  let renderedHtml = fnRenderBlocks(bridgedLines, parseOptions);

  renderedHtml = renderedHtml.replace(/ CB(\d+) /g, (_match, slotIndex) => codeBlockHtml[+slotIndex]);
  renderedHtml = renderedHtml.replace(/ IC(\d+) /g, (_match, slotIndex) => inlineCodeHtml[+slotIndex]);

  return renderedHtml;
}

export function fnStripDiscordMarkdown(rawInput, parseOptions) {
  if (!rawInput || typeof rawInput !== 'string') return '';
  return rawInput
    .replace(/```[\s\S]*?```/g, ' ')              // fenced code → blank
    .replace(/`([^`\n]+)`/g, '$1')                // inline code → text
    .replace(/^-#\s+/gm, '')                      // subtext marker
    .replace(/^>>>\s?/gm, '')                     // triple blockquote marker
    .replace(/^#{1,3}\s+/gm, '')                  // heading hashes
    .replace(/^>\s?/gm, '')                       // blockquote markers
    .replace(/^[-*]\s+/gm, '')                    // bullet markers
    .replace(/^\d+\.\s+/gm, '')                   // numbered list markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // links → label only
    .replace(/<https?:\/\/[^\s>]+>/g, '')         // suppressed-embed urls
    .replace(/<a?:([a-zA-Z0-9_]+):\d+>/g, ':$1:') // custom emoji → :name:
    .replace(/<#(\d+)>/g, (_match, channelId) => {
      const resolvedChannel = parseOptions?.resolveChannel?.(channelId);
      return resolvedChannel ? resolvedChannel.label : '';
    })
    .replace(/<@&?!?(\d+)>/g, '')                 // role/user mentions
    .replace(/\|\|([^|]+)\|\|/g, '$1')            // spoilers
    .replace(/__([^_]+)__/g, '$1')                // underline
    .replace(/\*\*([^*]+)\*\*/g, '$1')            // bold
    .replace(/~~([^~]+)~~/g, '$1')                // strikethrough
    .replace(/\*([^*\n]+)\*/g, '$1')              // italic *
    .replace(/_([^_\n]+)_/g, '$1')                // italic _
    .replace(/\s+/g, ' ')                         // collapse whitespace
    .trim();
}
