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
  CHILDREN: '@osmosify:children',
  WORDS: '@osmosify:words',
  SESSIONS: '@osmosify:sessions',
  BOOKS: '@osmosify:books',
  PRESETS: '@osmosify:presets',
  BOOK_PROGRESS: '@osmosify:bookProgress',
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
const PRESET_BOOKS_KEY = '@osmosify:presetBooksInitialized_v1';

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