import { browser } from "$app/environment";

const GOOGLE_INPUT_TOOLS_API =
  "https://inputtools.google.com/request?itc=ta-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8";
const TAMIL_TRANSLITERATION_API = "https://xlit-api.ai4bharat.org/tl/";
const wordCache = new Map();
const pendingRequests = new Map();
const transliterationOverrides = new Map([
  ["jascar", "ஜாஸ்கர்"],
  ["benish", "பெனிஷ்"]
]);

let suggestionsLoader;

const delimiterPattern = /[\s.,!?;:'"()[\]{}<>/\-\\|@#$%^&*_+=~`]/;
const latinPattern = /[A-Za-z]/;

function isDelimiter(char) {
  return !char || delimiterPattern.test(char);
}

function extractWordAtCaret(value, caretIndex, forceTrailingWord = false) {
  if (!value || caretIndex <= 0) {
    return null;
  }

  let wordEnd = caretIndex;

  if (!forceTrailingWord) {
    const boundaryChar = value[caretIndex - 1];

    if (!isDelimiter(boundaryChar)) {
      return null;
    }

    wordEnd = caretIndex - 1;
  }

  if (wordEnd <= 0) {
    return null;
  }

  let wordStart = wordEnd;

  while (wordStart > 0 && !isDelimiter(value[wordStart - 1])) {
    wordStart -= 1;
  }

  const word = value.slice(wordStart, wordEnd);

  if (!word || !latinPattern.test(word)) {
    return null;
  }

  return { word, start: wordStart, end: wordEnd };
}

async function loadSuggestionsApi() {
  if (!browser) {
    return null;
  }

  if (!suggestionsLoader) {
    suggestionsLoader = import("@ai4bharat/indic-transliterate").then(
      ({ getTransliterateSuggestions }) => getTransliterateSuggestions
    );
  }

  return suggestionsLoader;
}

async function transliterateWithGoogle(word) {
  const response = await fetch(GOOGLE_INPUT_TOOLS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: new URLSearchParams({ text: word }).toString()
  });

  const data = await response.json();

  if (data?.[0] !== "SUCCESS") {
    return null;
  }

  return data?.[1]?.[0]?.[1]?.[0] || null;
}

async function transliterateWithAi4Bharat(word) {
  const getTransliterateSuggestions = await loadSuggestionsApi();

  if (!getTransliterateSuggestions) {
    return null;
  }

  const suggestions = await getTransliterateSuggestions(
    word,
    TAMIL_TRANSLITERATION_API,
    "",
    {
      lang: "ta",
      showCurrentWordAsLastSuggestion: true
    }
  );

  return suggestions?.[0] || null;
}

function applyTamilHeuristics(sourceWord, tamilWord) {
  if (!tamilWord) {
    return tamilWord;
  }

  let nextWord = tamilWord;

  if (/sh$/i.test(sourceWord) && /ஸ்$/.test(nextWord)) {
    nextWord = nextWord.replace(/ஸ்$/, "ஷ்");
  }

  return nextWord;
}

async function transliterateWord(word) {
  const normalizedWord = word.trim();

  if (!normalizedWord) {
    return word;
  }

  const cacheKey = normalizedWord.toLowerCase();

  if (wordCache.has(cacheKey)) {
    return wordCache.get(cacheKey);
  }

  if (transliterationOverrides.has(cacheKey)) {
    const overriddenWord = transliterationOverrides.get(cacheKey);
    wordCache.set(cacheKey, overriddenWord);
    return overriddenWord;
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const request = (async () => {
    try {
      const googleResult = await transliterateWithGoogle(normalizedWord);
      const fallbackResult = googleResult
        ? null
        : await transliterateWithAi4Bharat(normalizedWord);
      const transliteratedWord = applyTamilHeuristics(
        normalizedWord,
        googleResult || fallbackResult || word
      );

      wordCache.set(cacheKey, transliteratedWord);
      return transliteratedWord;
    } catch (error) {
      console.error("Tamil transliteration failed", error);
      return word;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, request);
  return request;
}

export function tamilTransliterate(node, params = {}) {
  let enabled = params.enabled ?? true;
  let onChange = params.onChange;
  let isComposing = false;
  let latestRequestId = 0;

  function applyValue(nextValue, nextCaret) {
    node.value = nextValue;
    onChange?.(nextValue);

    requestAnimationFrame(() => {
      if (document.activeElement === node && typeof node.setSelectionRange === "function") {
        node.setSelectionRange(nextCaret, nextCaret);
      }
    });
  }

  async function maybeTransliterate(forceTrailingWord = false) {
    if (!enabled || isComposing) {
      return;
    }

    const snapshotValue = node.value ?? "";
    const caretIndex = node.selectionStart ?? snapshotValue.length;
    const wordRange = extractWordAtCaret(snapshotValue, caretIndex, forceTrailingWord);

    if (!wordRange) {
      return;
    }

    const requestId = ++latestRequestId;
    const transliteratedWord = await transliterateWord(wordRange.word);

    if (!transliteratedWord || transliteratedWord === wordRange.word || requestId !== latestRequestId) {
      return;
    }

    const latestValue = node.value ?? "";
    const currentWord = latestValue.slice(wordRange.start, wordRange.end);

    if (currentWord !== wordRange.word) {
      return;
    }

    const nextValue =
      latestValue.slice(0, wordRange.start) +
      transliteratedWord +
      latestValue.slice(wordRange.end);

    const nextCaret = caretIndex - (wordRange.end - wordRange.start) + transliteratedWord.length;
    applyValue(nextValue, nextCaret);
  }

  function handleInput(event) {
    if (!enabled || isComposing) {
      return;
    }

    if (!event.inputType?.startsWith("insert")) {
      return;
    }

    const caretIndex = node.selectionStart ?? 0;
    const lastInsertedChar = node.value?.[caretIndex - 1];

    if (!isDelimiter(lastInsertedChar)) {
      return;
    }

    void maybeTransliterate(false);
  }

  function handleBlur() {
    if (!enabled || isComposing) {
      return;
    }

    void maybeTransliterate(true);
  }

  function handleCompositionStart() {
    isComposing = true;
  }

  function handleCompositionEnd() {
    isComposing = false;
  }

  node.addEventListener("input", handleInput);
  node.addEventListener("blur", handleBlur);
  node.addEventListener("compositionstart", handleCompositionStart);
  node.addEventListener("compositionend", handleCompositionEnd);

  return {
    update(nextParams = {}) {
      enabled = nextParams.enabled ?? true;
      onChange = nextParams.onChange;
    },
    destroy() {
      node.removeEventListener("input", handleInput);
      node.removeEventListener("blur", handleBlur);
      node.removeEventListener("compositionstart", handleCompositionStart);
      node.removeEventListener("compositionend", handleCompositionEnd);
    }
  };
}
