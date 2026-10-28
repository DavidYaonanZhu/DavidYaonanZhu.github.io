(async function () {
  'use strict';

  const container = document.querySelector('.publications');
  const list = document.createElement('div');
  list.className = 'local-publications';
  container.appendChild(list);

  function text(value) {
    return (value || '')
      .replace(/\$\^\\ast\$/g, '*')
      .replace(/\\&/g, '&')
      .replace(/[{}]/g, '')
      .replace(/--/g, '\u2013');
  }

  function element(tag, content, className) {
    const node = document.createElement(tag);
    node.textContent = content;
    if (className) node.className = className;
    return node;
  }

  function paperLink(fields) {
    const value = fields.url || (fields.doi && (/^https?:/i.test(fields.doi)
      ? fields.doi : 'https://doi.org/' + fields.doi));
    if (!value) return null;
    const url = new URL(value, location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  }

  try {
    const response = await fetch('/bib.bib', { cache: 'no-store' });
    if (!response.ok) throw new Error('Bibliography request failed');
    const entries = bibtexParse.toJSON(await response.text())
      .map(entry => ({
        ...entry,
        entryTags: Object.fromEntries(Object.entries(entry.entryTags || {})
          .map(([key, value]) => [key.toLowerCase(), value]))
      }))
      .filter(entry => entry.entryTags && entry.entryTags.title);
    if (!entries.length) throw new Error('Bibliography is empty');
    const groups = new Map();
    for (const entry of entries) {
      const group = entry.entryTags.custom_type || 'Other Publications';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(entry);
    }

    for (const group of Array.from(groups.keys()).sort()) {
      const section = document.createElement('section');
      section.appendChild(element('h2', group));
      const papers = groups.get(group).sort((a, b) =>
        Number(b.entryTags.year || 0) - Number(a.entryTags.year || 0));

      for (const entry of papers) {
        const fields = entry.entryTags;
        const article = document.createElement('article');
        article.id = entry.citationKey;
        const citation = document.createElement('p');
        citation.appendChild(element('strong', text(fields.title) + '. '));
        const authors = (fields.author || '').split(/\s+and\s+/);
        authors.forEach((author, index) => {
          const parts = text(author).split(',').map(part => part.trim());
          const name = parts.length === 2 ? parts[1] + ' ' + parts[0] : parts.join(' ');
          if (index) citation.append('; ');
          citation.appendChild(element('span', name,
            /Yaonan Zhu|朱曜南/.test(name) ? 'name' : ''));
        });
        citation.append('. ');
        const venue = fields.journal || fields.booktitle || fields.howpublished;
        if (venue) {
          if (fields.booktitle) citation.append('In ');
          citation.appendChild(element('em', text(venue)));
        }
        if (fields.volume) citation.append(', ' + text(fields.volume));
        if (fields.number) citation.append('(' + text(fields.number) + ')');
        if (fields.pages) citation.append(', pp. ' + text(fields.pages));
        if (fields.year) citation.append(', ' + fields.year);
        citation.append('. ');
        if (fields.note) citation.appendChild(element('span', text(fields.note) + ' ', 'note'));
        if (fields.bibbase_note) {
          citation.appendChild(element('span', text(fields.bibbase_note), 'bibbase_note'));
        }
        article.appendChild(citation);

        const links = element('div', '', 'publication-links');
        const url = paperLink(fields);
        if (url) {
          const link = element('a', 'link');
          link.href = url;
          links.appendChild(link);
        }
        const details = document.createElement('details');
        details.appendChild(element('summary', 'bibtex'));
        details.appendChild(element('pre', bibtexParse.toBibtex([entry], false)));
        links.appendChild(details);
        article.appendChild(links);
        section.appendChild(article);
      }
      list.appendChild(section);
    }
  } catch (error) {
    list.replaceChildren(element('p', 'Publications could not be loaded.'));
    const download = element('a', 'Download BibTeX');
    download.href = '/bib.bib';
    list.appendChild(download);
    console.error(error);
  }
})();
