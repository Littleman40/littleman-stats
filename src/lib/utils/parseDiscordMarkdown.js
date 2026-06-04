// variables
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};



// cleans input text
function fnEscapeHtml(rawText) {

  // replaces everything with the escaped version above, helps prevent malicious inputs
  return rawText.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}



// ensures url's are safe
function fnSafeUrl(rawUrl) {

  // removes blank space at start and end
  const trimmedUrl = rawUrl.trim();

  // only allow urls that start with https and mailto
  if (
    trimmedUrl.startsWith("http:") ||
    trimmedUrl.startsWith("https:") ||
    trimmedUrl.startsWith("mailto:")
  ) return trimmedUrl;

  // allows relative paths or page anchors
  if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('#')) return trimmedUrl;

  return null;
}



// converts discord formatting to our html formatting
function fnProcessInline(escapedText, parseOptions) {
  let workingText = escapedText;

  // remove discord's url wrapping
  workingText = workingText.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, '$1');

  // handles url's where labels and urls are together
  workingText = workingText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkLabel, linkUrl) => {
    
    // checks url is safe
    const safeLinkUrl = fnSafeUrl(linkUrl);

    // drop unsafe URL, keep visible text
    if (!safeLinkUrl) return linkLabel;

    // create html link
    return `<a href="${fnEscapeHtml(safeLinkUrl)}" target="_blank" rel="noopener noreferrer">${linkLabel}</a>`;
  });


  // turns <#id> into link or faq page
  workingText = workingText.replace(/&lt;#(\d+)&gt;/g, (_match, channelId) => {
    const resolvedChannel = parseOptions?.resolveChannel?.(channelId);
    if (!resolvedChannel) return '<span class="dc-mention">#channel</span>';
    const externalAttrs = resolvedChannel.external
      ? ' target="_blank" rel="noopener noreferrer"'
      : '';
    return `<a class="dc-mention dc-mention-link" href="${fnEscapeHtml(resolvedChannel.href)}"${externalAttrs}>${fnEscapeHtml(resolvedChannel.label)}</a>`;
  });

  // role mentions
  workingText = workingText.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="dc-mention">@role</span>');

  // user mentions
  workingText = workingText.replace(/&lt;@!?(\d+)&gt;/g, '<span class="dc-mention">@user</span>');

  // spoilers
  workingText = workingText.replace(/\|\|([^|]+)\|\|/g, '<span class="dc-spoiler">$1</span>');

  // underline
  workingText = workingText.replace(/__([^_]+)__/g, '<u>$1</u>');

  // bold
  workingText = workingText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // strikethrough
  workingText = workingText.replace(/~~([^~]+)~~/g, '<s>$1</s>');

  // italic *
  workingText = workingText.replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s.,!?)]|$)/g, '$1<em>$2</em>');

  // italic _
  workingText = workingText.replace(/(^|[\s(])_(?!\s)([^_\n]+?)_(?=[\s.,!?)]|$)/g, '$1<em>$2</em>');

  return workingText;
}



// more discord formatting like headings etc
function fnClassifyLine(rawLine) {

  // very small text
  const subtextMatch = /^-#\s+(.*)$/.exec(rawLine);
  if (subtextMatch) return { kind: 'subtext', text: subtextMatch[1] };

  // ### small / ## normal / # big heading
  const headingMatch = /^(#{1,3})\s+(.*)$/.exec(rawLine);
  if (headingMatch) return { kind: 'heading', level: headingMatch[1].length, text: headingMatch[2] };

  // blockquotes
  const quoteMatch = /^>\s?(.*)$/.exec(rawLine);
  if (quoteMatch) return { kind: 'quote', text: quoteMatch[1] };

  // bullet points
  const bulletMatch = /^[-*]\s+(.*)$/.exec(rawLine);
  if (bulletMatch) return { kind: 'ul', text: bulletMatch[1] };

  // numbered points
  const numberedMatch = /^(\d+)\.\s+(.*)$/.exec(rawLine);
  if (numberedMatch) return { kind: 'ol', text: numberedMatch[2] };

  return { kind: 'text', text: rawLine };
}


// converts the line of text into the correct html depending on formatting
function fnRenderBlocks(allLines, parseOptions) {

  // stores final html 
  const outputParts = [];
  let openBlockKind = null;
  let paragraphBuffer = [];

  const fnInline = (rawText) => fnProcessInline(fnEscapeHtml(rawText), parseOptions);

  // close any html tags we have open
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


  // the main loop for each line
  for (const currentLine of allLines) {

    // if the line if blank - move on
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



// main function that takes raw text and returns html with everything
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


// removes all formatting to just plain text
export function fnStripDiscordMarkdown(rawInput, parseOptions) {
  if (!rawInput || typeof rawInput !== 'string') return '';
  return rawInput
    // fenced code -> blank
    .replace(/```[\s\S]*?```/g, ' ')

    // inline code -> text
    .replace(/`([^`\n]+)`/g, '$1')

    // subtext marker
    .replace(/^-#\s+/gm, '')

    // triple blockquote marker
    .replace(/^>>>\s?/gm, '')

    // heading hashes
    .replace(/^#{1,3}\s+/gm, '')

    // blockquote markers
    .replace(/^>\s?/gm, '')

    // bullet markers
    .replace(/^[-*]\s+/gm, '')

    // numbered list markers
    .replace(/^\d+\.\s+/gm, '')

    // links -> label only
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    // suppressed-embed urls
    .replace(/<https?:\/\/[^\s>]+>/g, '')

    // custom emoji -> :name:
    .replace(/<a?:([a-zA-Z0-9_]+):\d+>/g, ':$1:')
    .replace(/<#(\d+)>/g, (_match, channelId) => {
      const resolvedChannel = parseOptions?.resolveChannel?.(channelId);
      return resolvedChannel ? resolvedChannel.label : '';
    })

    // role/user mentions
    .replace(/<@&?!?(\d+)>/g, '')

    // spoilers
    .replace(/\|\|([^|]+)\|\|/g, '$1')

    // underline
    .replace(/__([^_]+)__/g, '$1')

    // bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')

    // strikethrough
    .replace(/~~([^~]+)~~/g, '$1')

    // italic *
    .replace(/\*([^*\n]+)\*/g, '$1')

    // italic _
    .replace(/_([^_\n]+)_/g, '$1')

    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
