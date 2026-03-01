<script>
  import { createEventDispatcher } from 'svelte';
  import citiesData from '$lib/api/Indiadatas/india_post_offices.json';

  export let value = '';
  export let placeholder = 'Start typing city name...';
  export let required = false;

  const dispatch = createEventDispatcher();
  
  let suggestions = [];
  let showSuggestions = false;
  let debounceTimer;
  let loading = false;

  const searchCities = (query) => {
    if (!query || query.length < 1) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    loading = true;
    const lowerQuery = query.toLowerCase();
    
    // Remove office type extensions (B.O, S.O, H.O, etc.)
    const cleanOfficeName = (name) => {
      return name?.replace(/\s+(B\.O|S\.O|H\.O|BO|SO|HO)$/i, '').trim();
    };
    
    // Get unique districts and states
    const districts = [...new Set(citiesData.map(item => item.district).filter(Boolean))];
    const states = [...new Set(citiesData.map(item => item.statename).filter(Boolean))];
    
    // Search in office names
    const officeMatches = citiesData
      .filter(item => {
        const cleanName = cleanOfficeName(item.officename);
        return cleanName?.toLowerCase().startsWith(lowerQuery);
      })
      .map(item => {
        const cleanName = cleanOfficeName(item.officename);
        return `${cleanName}, ${item.district}`;
      });
    
    // Search in districts
    const districtMatches = districts
      .filter(district => district.toLowerCase().startsWith(lowerQuery))
      .map(district => district);
    
    // Search in states
    const stateMatches = states
      .filter(state => state.toLowerCase().startsWith(lowerQuery))
      .map(state => state);
    
    // Combine: districts first, then states, then office names
    const allMatches = [...districtMatches, ...stateMatches, ...officeMatches];
    suggestions = [...new Set(allMatches)].slice(0, 50);
    showSuggestions = suggestions.length > 0;
    loading = false;
  };

  const handleInput = (e) => {
    value = e.target.value;
    dispatch('input', value);
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchCities(value);
    }, 300);
  };

  const selectCity = (city) => {
    value = city;
    dispatch('select', city);
    showSuggestions = false;
    suggestions = [];
  };

  const handleBlur = () => {
    setTimeout(() => {
      showSuggestions = false;
    }, 200);
  };
</script>

<div class="relative">
  <input
    type="text"
    {value}
    {placeholder}
    {required}
    on:input={handleInput}
    on:blur={handleBlur}
    on:focus={() => value && searchCities(value)}
    class="w-full border-2 border-gray-700 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 bg-gray-900/50 text-gray-200"
  />
  
  {#if loading}
    <div class="absolute right-3 top-1/2 -translate-y-1/2">
      <i class="fas fa-spinner fa-spin text-gray-400"></i>
    </div>
  {/if}

  {#if showSuggestions && suggestions.length > 0}
    <div class="absolute z-50 w-full mt-1 bg-gray-800 border-2 border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
      {#each suggestions as city}
        <button
          type="button"
          on:click={() => selectCity(city)}
          class="w-full text-left px-4 py-3 hover:bg-indigo-600/20 text-gray-200 transition-colors duration-150 border-b border-gray-700/50 last:border-b-0"
        >
          {city}
        </button>
      {/each}
    </div>
  {/if}
</div>
