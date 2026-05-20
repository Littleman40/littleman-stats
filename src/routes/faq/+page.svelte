<script>
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import PaginationControls from '$lib/components/PaginationControls.svelte';

  let { data } = $props();

  const FAQS_PER_PAGE = 20;

  const allFaqs = $derived(data.faqs);

  let searchQuery = $state($page.url.searchParams.get('q') ?? '');
  let currentPageNumber = $state(parseInt($page.url.searchParams.get('page') ?? '1', 10) || 1);

  const filteredFaqs = $derived.by(() => {
    const normalisedQuery = searchQuery.trim().toLowerCase();
    if (!normalisedQuery) return allFaqs;
    return allFaqs.filter((faq) => faq.title.toLowerCase().includes(normalisedQuery));
  });

  const totalPageCount = $derived(Math.max(1, Math.ceil(filteredFaqs.length / FAQS_PER_PAGE)));

  const visibleFaqs = $derived.by(() => {
    const clampedPage = Math.min(currentPageNumber, totalPageCount);
    const sliceStart = (clampedPage - 1) * FAQS_PER_PAGE;
    return filteredFaqs.slice(sliceStart, sliceStart + FAQS_PER_PAGE);
  });

  function fnSyncUrl(replaceHistory = true) { // called from fnHandleSearch + fnHandlePrev + fnHandleNext + fnHandleJump below
    const urlParams = new URLSearchParams();
    if (searchQuery.trim()) urlParams.set('q', searchQuery.trim());
    if (currentPageNumber > 1) urlParams.set('page', String(currentPageNumber));
    const queryString = urlParams.toString();
    goto(queryString ? `/faq?${queryString}` : '/faq', { replaceState: replaceHistory, keepFocus: true, noScroll: true });
  }

  function fnHandleSearch(typedValue) { // called from SearchBar oninput in the template below
    searchQuery = typedValue;
    currentPageNumber = 1;
    fnSyncUrl();
  }

  function fnHandlePrev() { // called from PaginationControls onprev in the template below
    if (currentPageNumber <= 1) return;
    currentPageNumber--;
    fnSyncUrl(false);
  }

  function fnHandleNext() { // called from PaginationControls onnext in the template below
    if (currentPageNumber >= totalPageCount) return;
    currentPageNumber++;
    fnSyncUrl(false);
  }

  function fnHandleJump(targetPageNumber) { // called from PaginationControls onjump in the template below
    currentPageNumber = Math.min(Math.max(1, targetPageNumber), totalPageCount);
    fnSyncUrl(false);
  }
</script>

<svelte:head>
  <title>FAQ - LittleMan Stats</title>
</svelte:head>

<div class="page page-wrapper">
  <div class="page-header">
    <h1>No Hesi Help FAQ</h1>
    <p>Find a solution to 99% of the issues you may face</p>
  </div>

  <div class="page-strip">
    <div class="search-wrap">
      <div class="search-bar-wrap">
        <SearchBar
          placeholder="Search an entry"
          oninput={fnHandleSearch}
        />
      </div>
    </div>

    {#if allFaqs.length === 0}
      <div class="empty-state">
        <p>No FAQs available.</p>
      </div>
    {:else if filteredFaqs.length === 0}
      <div class="empty-state">
        <p>No results found for "{searchQuery}".</p>
      </div>
    {:else}
      <ul class="faq-list">
        {#each visibleFaqs as faq (faq.id)}
          <li>
            <a class="faq-card" href={`/faq/${faq.id}`}>
              <div class="text">
                <h2 class="title">{faq.title}</h2>
                {#if faq.previewText}
                  <p class="preview">{faq.previewText}</p>
                {/if}
              </div>
              {#if faq.previewImage}
                <div class="image">
                  <img src={faq.previewImage} alt="" loading="lazy" />
                </div>
              {/if}
            </a>
          </li>
        {/each}
      </ul>

      <div class="pagination-row">
        <PaginationControls
          page={currentPageNumber}
          totalPages={totalPageCount}
          hasPrev={currentPageNumber > 1}
          hasNext={currentPageNumber < totalPageCount}
          onprev={fnHandlePrev}
          onnext={fnHandleNext}
          onjump={fnHandleJump}
        />
        <span class="result-count">
          Showing {visibleFaqs.length} of {filteredFaqs.length}
        </span>
      </div>
    {/if}
  </div>
</div>

<style>
  .page {
    padding-top: 2.5rem;
    padding-bottom: 4rem;
  }

  .page-strip {
    background: var(--color-card-elevated);
    border: 1px solid rgb(44, 44, 44);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.4rem;
  }

  .page-header p {
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  .search-wrap {
    margin-bottom: 1.75rem;
  }

  .search-bar-wrap {
    width: 100%;
  }

  .search-bar-wrap :global(input) {
    border-radius: 1rem;
    border: 1px solid rgb(44, 44, 44);
  }

  .pagination-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .result-count {
    color: var(--color-muted);
    font-size: 0.9rem;
    white-space: nowrap;
    margin-left: auto;
  }

  .empty-state {
    padding: 3rem 0;
    text-align: center;
    color: var(--color-muted);
  }

  .faq-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .faq-card {
    display: flex;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-card-raised);
    border: 1px solid rgb(44, 44, 44);
    border-radius: 1rem;
    color: var(--color-text);
    text-decoration: none;
    transition: border-color 0.15s, transform 0.15s;
    min-height: 120px;
  }

  .faq-card:hover {
    border-color: #555555;
  }

  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.4rem 0;
    color: var(--color-text);
    overflow-wrap: anywhere;
  }

  .preview {
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--color-muted);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    
  }

  .image {
    flex: 0 0 180px;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 5px;
    background: var(--color-card);
    border: 1px solid rgb(44, 44, 44);

  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  @media (max-width: 640px) {
    .faq-card {
      flex-direction: column;
    }
    .image {
      flex: 0 0 auto;
      width: 100%;
      aspect-ratio: 16 / 9;
    }
  }
</style>
