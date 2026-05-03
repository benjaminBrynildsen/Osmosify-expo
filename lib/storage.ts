import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import type {
  Child,
  Word,
  ReadingSession,
  Book,
  PresetWordList,
  ChildBookProgress
} from '../types';
import { PRESET_BOOKS } from '../data/presetBooks';

const STORAGE_KEYS = {
  CHILDREN: '@noah:children',
  WORDS: '@noah:words',
  SESSIONS: '@noah:sessions',
  BOOKS: '@noah:books',
  PRESETS: '@noah:presets',
  BOOK_PROGRESS: '@noah:bookProgress',
};

// Helper functions
const getItem = async <T>(key: string): Promise<T[]> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return [];
  }
};

const setItem = async <T>(key: string, value: T[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
  }
};

// Children
export const getChildren = async (): Promise<Child[]> => {
  return getItem<Child>(STORAGE_KEYS.CHILDREN);
};

export const saveChild = async (child: Child): Promise<void> => {
  const children = await getChildren();
  const index = children.findIndex(c => c.id === child.id);
  if (index >= 0) {
    children[index] = child;
  } else {
    children.push(child);
  }
  await setItem(STORAGE_KEYS.CHILDREN, children);
};

export const deleteChild = async (childId: string): Promise<void> => {
  const children = await getChildren();
  await setItem(STORAGE_KEYS.CHILDREN, children.filter(c => c.id !== childId));
  
  // Also delete related data
  const words = await getWords();
  await setItem(STORAGE_KEYS.WORDS, words.filter(w => w.childId !== childId));
  
  const sessions = await getSessions();
  await setItem(STORAGE_KEYS.SESSIONS, sessions.filter(s => s.childId !== childId));
  
  const progress = await getBookProgress();
  await setItem(STORAGE_KEYS.BOOK_PROGRESS, progress.filter(p => p.childId !== childId));
};

// Words
export const getWords = async (): Promise<Word[]> => {
  return getItem<Word>(STORAGE_KEYS.WORDS);
};

export const getWordsByChild = async (childId: string): Promise<Word[]> => {
  const words = await getWords();
  return words.filter(w => w.childId === childId);
};

export const saveWord = async (word: Word): Promise<void> => {
  const words = await getWords();
  const index = words.findIndex(w => w.id === word.id);
  if (index >= 0) {
    words[index] = word;
  } else {
    words.push(word);
  }
  await setItem(STORAGE_KEYS.WORDS, words);
};

export const saveWords = async (newWords: Word[]): Promise<void> => {
  const words = await getWords();
  for (const word of newWords) {
    const index = words.findIndex(w => w.id === word.id);
    if (index >= 0) {
      words[index] = word;
    } else {
      words.push(word);
    }
  }
  await setItem(STORAGE_KEYS.WORDS, words);
};

export const updateWordStatus = async (
  wordId: string, 
  status: Word['status'], 
  isCorrect: boolean
): Promise<void> => {
  const words = await getWords();
  const index = words.findIndex(w => w.id === wordId);
  if (index >= 0) {
    const word = words[index];
    word.status = status;
    word.lastTested = new Date().toISOString();
    if (isCorrect) {
      word.masteryCorrectCount++;
    } else {
      word.incorrectCount++;
    }
    words[index] = word;
    await setItem(STORAGE_KEYS.WORDS, words);
  }
};

// Sessions
export const getSessions = async (): Promise<ReadingSession[]> => {
  return getItem<ReadingSession>(STORAGE_KEYS.SESSIONS);
};

export const getSessionsByChild = async (childId: string): Promise<ReadingSession[]> => {
  const sessions = await getSessions();
  return sessions
    .filter(s => s.childId === childId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveSession = async (session: ReadingSession): Promise<void> => {
  const sessions = await getSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  await setItem(STORAGE_KEYS.SESSIONS, sessions);
};

// Books
const PRESET_BOOKS_KEY = '@noah:presetBooksInitialized_v1';

const initializePresetBooks = async (): Promise<void> => {
  const initialized = await AsyncStorage.getItem(PRESET_BOOKS_KEY);
  if (initialized) return;

  const existing = await getItem<Book>(STORAGE_KEYS.BOOKS);
  const now = new Date().toISOString();
  const presetBooks: Book[] = PRESET_BOOKS.map(b => ({
    ...b,
    id: uuidv4(),
    createdAt: now,
  }));

  await setItem(STORAGE_KEYS.BOOKS, [...existing, ...presetBooks]);
  await AsyncStorage.setItem(PRESET_BOOKS_KEY, 'true');
};

export const getBooks = async (): Promise<Book[]> => {
  await initializePresetBooks();
  return getItem<Book>(STORAGE_KEYS.BOOKS);
};

export const saveBook = async (book: Book): Promise<void> => {
  const books = await getBooks();
  const index = books.findIndex(b => b.id === book.id);
  if (index >= 0) {
    books[index] = book;
  } else {
    books.push(book);
  }
  await setItem(STORAGE_KEYS.BOOKS, books);
};

export const deleteBook = async (bookId: string): Promise<void> => {
  const books = await getBooks();
  await setItem(STORAGE_KEYS.BOOKS, books.filter(b => b.id !== bookId));
};

// Book Progress
export const getBookProgress = async (): Promise<ChildBookProgress[]> => {
  return getItem<ChildBookProgress>(STORAGE_KEYS.BOOK_PROGRESS);
};

export const getBookProgressByChild = async (childId: string): Promise<ChildBookProgress[]> => {
  const progress = await getBookProgress();
  return progress.filter(p => p.childId === childId);
};

export const saveBookProgress = async (progress: ChildBookProgress): Promise<void> => {
  const allProgress = await getBookProgress();
  const index = allProgress.findIndex(p => p.id === progress.id);
  if (index >= 0) {
    allProgress[index] = progress;
  } else {
    allProgress.push(progress);
  }
  await setItem(STORAGE_KEYS.BOOK_PROGRESS, allProgress);
};

// Initialize preset data
export const initializePresets = async (): Promise<void> => {
  const existing = await getItem<PresetWordList>(STORAGE_KEYS.PRESETS);
  if (existing.length > 0) return;

  const presets: PresetWordList[] = [
    {
      id: uuidv4(),
      name: 'Alphabet',
      category: 'alphabet',
      description: 'All letters A-Z',
      words: 'abcdefghijklmnopqrstuvwxyz'.split(''),
      sortOrder: 1,
    },
    {
      id: uuidv4(),
      name: 'CVC Words - Short A',
      category: 'cvc',
      description: 'Consonant-vowel-consonant words with short a',
      words: ['cat', 'hat', 'mat', 'sat', 'rat', 'bat', 'fat', 'pat', 'dad', 'mad', 'sad', 'bad', 'had', 'pad', 'jam', 'ham', 'yam', 'ram', 'can', 'man', 'pan', 'fan', 'ran', 'van', 'cap', 'map', 'tap', 'nap', 'sap', 'lap', 'bag', 'tag', 'wag', 'rag', 'nag'],
      sortOrder: 2,
    },
    {
      id: uuidv4(),
      name: 'CVC Words - Short E',
      category: 'cvc',
      description: 'Consonant-vowel-consonant words with short e',
      words: ['bed', 'red', 'led', 'fed', 'wed', 'hen', 'pen', 'ten', 'men', 'den', 'get', 'jet', 'let', 'met', 'net', 'pet', 'set', 'vet', 'wet', 'beg', 'leg', 'peg', 'web'],
      sortOrder: 3,
    },
    {
      id: uuidv4(),
      name: 'CVC Words - Short I',
      category: 'cvc',
      description: 'Consonant-vowel-consonant words with short i',
      words: ['bib', 'rib', 'fib', 'big', 'dig', 'fig', 'gig', 'jig', 'pig', 'rig', 'wig', 'bin', 'fin', 'pin', 'tin', 'win', 'sin', 'dip', 'hip', 'lip', 'rip', 'sip', 'tip', 'zip', 'bit', 'fit', 'hit', 'kit', 'lit', 'pit', 'sit', 'wit'],
      sortOrder: 4,
    },
    {
      id: uuidv4(),
      name: 'CVC Words - Short O',
      category: 'cvc',
      description: 'Consonant-vowel-consonant words with short o',
      words: ['bob', 'mob', 'rob', 'sob', 'cob', 'job', 'cog', 'dog', 'fog', 'hog', 'jog', 'log', 'dot', 'got', 'hot', 'jot', 'lot', 'not', 'pot', 'rot', 'cot', 'cod', 'rod', 'pod', 'hop', 'mop', 'pop', 'top'],
      sortOrder: 5,
    },
    {
      id: uuidv4(),
      name: 'CVC Words - Short U',
      category: 'cvc',
      description: 'Consonant-vowel-consonant words with short u',
      words: ['bud', 'cud', 'dud', 'mud', 'bug', 'dug', 'hug', 'jug', 'mug', 'pug', 'rug', 'tug', 'bun', 'fun', 'gun', 'nun', 'pun', 'run', 'sun', 'but', 'cut', 'gut', 'hut', 'jut', 'nut', 'rut', 'cup', 'pup', 'bus', 'sub', 'tub'],
      sortOrder: 6,
    },
    {
      id: uuidv4(),
      name: 'Dolch Pre-Primer',
      category: 'sight_words',
      description: 'Essential sight words for early readers',
      words: ['a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for', 'funny', 'go', 'help', 'here', 'I', 'in', 'is', 'it', 'jump', 'little', 'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said', 'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you'],
      sortOrder: 7,
    },
    {
      id: uuidv4(),
      name: 'Dolch Primer',
      category: 'sight_words',
      description: 'Second level sight words',
      words: ['all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came', 'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like', 'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran', 'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this', 'too', 'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who', 'will', 'with', 'yes'],
      sortOrder: 8,
    },
    {
      id: uuidv4(),
      name: 'First Grade Sight Words',
      category: 'sight_words',
      description: 'Common first grade words',
      words: ['after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly', 'from', 'give', 'giving', 'had', 'has', 'her', 'him', 'his', 'how', 'just', 'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put', 'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk', 'were', 'when'],
      sortOrder: 9,
    },
    {
      id: uuidv4(),
      name: 'Family Words',
      category: 'sight_words',
      description: 'Words about family',
      words: ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'baby', 'grandma', 'grandpa', 'aunt', 'uncle', 'cousin', 'family', 'home', 'house', 'love'],
      sortOrder: 10,
    },
    {
      id: uuidv4(),
      name: 'Colors',
      category: 'sight_words',
      description: 'Color words',
      words: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'gold', 'silver'],
      sortOrder: 11,
    },
    {
      id: uuidv4(),
      name: 'Numbers',
      category: 'sight_words',
      description: 'Number words 1-20',
      words: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
      sortOrder: 12,
    },
    {
      id: uuidv4(),
      name: 'Animals',
      category: 'sight_words',
      description: 'Common animal words',
      words: ['cat', 'dog', 'bird', 'fish', 'cow', 'pig', 'horse', 'sheep', 'duck', 'chicken', 'mouse', 'rabbit', 'frog', 'bear', 'lion', 'tiger', 'elephant', 'monkey', 'snake', 'turtle'],
      sortOrder: 13,
    },
    {
      id: uuidv4(),
      name: 'Dolch Second Grade',
      category: 'sight_words',
      description: 'Sight words taught in 2nd grade',
      words: ['always', 'around', 'because', 'been', 'before', 'best', 'both', 'buy', 'call', 'cold', 'does', 'don\'t', 'fast', 'first', 'five', 'found', 'gave', 'goes', 'green', 'its', 'made', 'many', 'off', 'or', 'pull', 'read', 'right', 'sing', 'sit', 'sleep', 'tell', 'their', 'these', 'those', 'upon', 'us', 'use', 'very', 'wash', 'which', 'why', 'wish', 'work', 'would', 'write', 'your'],
      sortOrder: 14,
    },
    {
      id: uuidv4(),
      name: 'Dolch Third Grade',
      category: 'sight_words',
      description: 'Sight words taught in 3rd grade',
      words: ['about', 'better', 'bring', 'carry', 'clean', 'cut', 'done', 'draw', 'drink', 'eight', 'fall', 'far', 'full', 'got', 'grow', 'hold', 'hot', 'hurt', 'if', 'keep', 'kind', 'laugh', 'light', 'long', 'much', 'myself', 'never', 'only', 'own', 'pick', 'seven', 'shall', 'show', 'six', 'small', 'start', 'ten', 'today', 'together', 'try', 'warm'],
      sortOrder: 15,
    },
    {
      id: uuidv4(),
      name: 'Dolch Nouns',
      category: 'sight_words',
      description: 'The 95 most common nouns kids meet first',
      words: ['apple', 'baby', 'back', 'ball', 'bear', 'bed', 'bell', 'bird', 'birthday', 'boat', 'box', 'boy', 'bread', 'brother', 'cake', 'car', 'cat', 'chair', 'chicken', 'children', 'Christmas', 'coat', 'corn', 'cow', 'day', 'dog', 'doll', 'door', 'duck', 'egg', 'eye', 'farm', 'farmer', 'father', 'feet', 'fire', 'fish', 'floor', 'flower', 'game', 'garden', 'girl', 'good-bye', 'grass', 'ground', 'hand', 'head', 'hill', 'home', 'horse', 'house', 'kitty', 'leg', 'letter', 'man', 'men', 'milk', 'money', 'morning', 'mother', 'name', 'nest', 'night', 'paper', 'party', 'picture', 'pig', 'rabbit', 'rain', 'ring', 'robin', 'Santa Claus', 'school', 'seed', 'sheep', 'shoe', 'sister', 'snow', 'song', 'squirrel', 'stick', 'street', 'sun', 'table', 'thing', 'time', 'top', 'toy', 'tree', 'watch', 'water', 'way', 'wind', 'window', 'wood'],
      sortOrder: 16,
    },
    {
      id: uuidv4(),
      name: 'Fry First 100',
      category: 'sight_words',
      description: 'The 100 most common English words — covers about 50% of all reading',
      words: ['the', 'of', 'and', 'a', 'to', 'in', 'is', 'you', 'that', 'it', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'I', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write', 'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first', 'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'],
      sortOrder: 17,
    },
    {
      id: uuidv4(),
      name: 'Word Family: -at',
      category: 'word_family',
      description: 'Rhyming words ending in -at',
      words: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat', 'pat', 'flat', 'chat', 'that', 'splat'],
      sortOrder: 20,
    },
    {
      id: uuidv4(),
      name: 'Word Family: -an',
      category: 'word_family',
      description: 'Rhyming words ending in -an',
      words: ['can', 'man', 'pan', 'fan', 'ran', 'tan', 'van', 'plan', 'than', 'span'],
      sortOrder: 21,
    },
    {
      id: uuidv4(),
      name: 'Word Family: -ig',
      category: 'word_family',
      description: 'Rhyming words ending in -ig',
      words: ['big', 'dig', 'fig', 'jig', 'pig', 'rig', 'wig', 'twig', 'sprig'],
      sortOrder: 22,
    },
    {
      id: uuidv4(),
      name: 'Word Family: -og',
      category: 'word_family',
      description: 'Rhyming words ending in -og',
      words: ['dog', 'fog', 'log', 'jog', 'hog', 'bog', 'cog', 'frog', 'clog', 'smog'],
      sortOrder: 23,
    },
    {
      id: uuidv4(),
      name: 'Word Family: -ug',
      category: 'word_family',
      description: 'Rhyming words ending in -ug',
      words: ['bug', 'hug', 'jug', 'mug', 'pug', 'rug', 'tug', 'plug', 'snug', 'shrug'],
      sortOrder: 24,
    },
    {
      id: uuidv4(),
      name: 'Word Family: -ake',
      category: 'word_family',
      description: 'Long-A words ending in -ake',
      words: ['cake', 'bake', 'lake', 'make', 'rake', 'take', 'wake', 'snake', 'shake', 'flake', 'brake'],
      sortOrder: 25,
    },
    {
      id: uuidv4(),
      name: 'Word Family: -ike',
      category: 'word_family',
      description: 'Long-I words ending in -ike',
      words: ['bike', 'hike', 'like', 'pike', 'spike', 'strike', 'dislike'],
      sortOrder: 26,
    },
    {
      id: uuidv4(),
      name: 'Word Family: -ight',
      category: 'word_family',
      description: 'Long-I words spelled -ight',
      words: ['light', 'might', 'night', 'right', 'sight', 'tight', 'fight', 'bright', 'flight', 'fright', 'knight'],
      sortOrder: 27,
    },
    {
      id: uuidv4(),
      name: 'Digraphs: sh-',
      category: 'phonics',
      description: 'Words starting with the sh- sound',
      words: ['she', 'ship', 'shop', 'shut', 'shoe', 'shell', 'shark', 'sheep', 'short', 'shower'],
      sortOrder: 30,
    },
    {
      id: uuidv4(),
      name: 'Digraphs: ch-',
      category: 'phonics',
      description: 'Words starting with the ch- sound',
      words: ['chip', 'chop', 'chin', 'chest', 'cheek', 'cheese', 'chick', 'child', 'chair', 'cherry'],
      sortOrder: 31,
    },
    {
      id: uuidv4(),
      name: 'Digraphs: th-',
      category: 'phonics',
      description: 'Words starting with the th- sound',
      words: ['the', 'this', 'that', 'they', 'them', 'then', 'there', 'thing', 'think', 'three', 'thumb'],
      sortOrder: 32,
    },
    {
      id: uuidv4(),
      name: 'Days of the Week',
      category: 'everyday',
      description: 'Sunday through Saturday',
      words: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      sortOrder: 40,
    },
    {
      id: uuidv4(),
      name: 'Months of the Year',
      category: 'everyday',
      description: 'All twelve months',
      words: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      sortOrder: 41,
    },
    {
      id: uuidv4(),
      name: 'Body Parts',
      category: 'everyday',
      description: 'Words for parts of the body',
      words: ['head', 'face', 'eye', 'ear', 'nose', 'mouth', 'lip', 'tooth', 'tongue', 'chin', 'neck', 'arm', 'hand', 'finger', 'thumb', 'leg', 'knee', 'foot', 'toe', 'hair', 'back', 'belly'],
      sortOrder: 42,
    },
    {
      id: uuidv4(),
      name: 'Action Words',
      category: 'everyday',
      description: 'Common verbs kids do every day',
      words: ['run', 'jump', 'walk', 'hop', 'skip', 'play', 'sing', 'dance', 'eat', 'drink', 'sleep', 'read', 'write', 'draw', 'sit', 'stand', 'climb', 'swim', 'throw', 'catch', 'kick', 'hug', 'kiss', 'laugh', 'smile', 'cry'],
      sortOrder: 43,
    },
    {
      id: uuidv4(),
      name: 'Food Words',
      category: 'everyday',
      description: 'Common food words kids see in stories',
      words: ['apple', 'banana', 'bread', 'cheese', 'milk', 'water', 'juice', 'egg', 'cake', 'cookie', 'candy', 'ice', 'cream', 'pizza', 'soup', 'rice', 'pasta', 'corn', 'meat', 'fish'],
      sortOrder: 44,
    },
    {
      id: uuidv4(),
      name: 'Weather Words',
      category: 'everyday',
      description: 'Words about weather and the sky',
      words: ['sun', 'sunny', 'cloud', 'cloudy', 'rain', 'rainy', 'snow', 'snowy', 'wind', 'windy', 'hot', 'cold', 'warm', 'cool', 'storm', 'thunder', 'lightning', 'rainbow', 'sky'],
      sortOrder: 45,
    },
    {
      id: uuidv4(),
      name: 'Opposites',
      category: 'everyday',
      description: 'Pairs of opposite words',
      words: ['big', 'small', 'hot', 'cold', 'fast', 'slow', 'up', 'down', 'in', 'out', 'on', 'off', 'open', 'closed', 'happy', 'sad', 'good', 'bad', 'old', 'new', 'wet', 'dry', 'soft', 'hard', 'tall', 'short', 'thick', 'thin', 'light', 'dark'],
      sortOrder: 46,
    },
  ];

  await setItem(STORAGE_KEYS.PRESETS, presets);
};

export const getPresets = async (): Promise<PresetWordList[]> => {
  await initializePresets();
  return getItem<PresetWordList>(STORAGE_KEYS.PRESETS);
};

export const getPresetById = async (id: string): Promise<PresetWordList | undefined> => {
  const presets = await getPresets();
  return presets.find(p => p.id === id);
};