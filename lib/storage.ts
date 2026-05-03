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

// Bump this when the preset content changes — older installs will
// re-init their preset list on next launch.
const PRESETS_VERSION_KEY = '@noah:presetsVersion';
const PRESETS_VERSION = '2026-05-03-grade-organized';

// Initialize preset data — grade-organized for early readers.
// Naming convention: "<Grade Level> · <List Name>" so parents can
// scan by age. Categories: phonics, sight_words, word_family,
// everyday, alphabet.
export const initializePresets = async (): Promise<void> => {
  const currentVersion = await AsyncStorage.getItem(PRESETS_VERSION_KEY);
  if (currentVersion === PRESETS_VERSION) return;

  const presets: PresetWordList[] = [
    // ───────── Pre-K (ages 3-4) ─────────
    {
      id: uuidv4(),
      name: 'Pre-K · Alphabet',
      category: 'alphabet',
      description: 'All 26 letters of the alphabet',
      gradeLevel: 'Pre-K',
      words: 'abcdefghijklmnopqrstuvwxyz'.split(''),
      sortOrder: 1,
    },
    {
      id: uuidv4(),
      name: 'Pre-K · First Words',
      category: 'sight_words',
      description: 'The very first words a child learns to read',
      gradeLevel: 'Pre-K',
      words: ['mom', 'dad', 'cat', 'dog', 'sun', 'go', 'see', 'eat', 'big', 'me', 'I', 'a', 'the', 'is'],
      sortOrder: 2,
    },
    {
      id: uuidv4(),
      name: 'Pre-K · Family',
      category: 'everyday',
      description: 'Words about family — among the first words kids recognize',
      gradeLevel: 'Pre-K',
      words: ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'baby', 'grandma', 'grandpa', 'family', 'home', 'love'],
      sortOrder: 3,
    },
    {
      id: uuidv4(),
      name: 'Pre-K · Colors',
      category: 'everyday',
      description: 'Color names — concrete and visual',
      gradeLevel: 'Pre-K',
      words: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white'],
      sortOrder: 4,
    },
    {
      id: uuidv4(),
      name: 'Pre-K · Numbers 1-10',
      category: 'everyday',
      description: 'Number words zero through ten',
      gradeLevel: 'Pre-K',
      words: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
      sortOrder: 5,
    },
    {
      id: uuidv4(),
      name: 'Pre-K · Animals',
      category: 'everyday',
      description: 'Common animals — concrete and easy to picture',
      gradeLevel: 'Pre-K',
      words: ['cat', 'dog', 'cow', 'pig', 'duck', 'bird', 'fish', 'frog', 'bear', 'mouse'],
      sortOrder: 6,
    },

    // ───────── Kindergarten (ages 4-5) ─────────
    {
      id: uuidv4(),
      name: 'Kindergarten · Dolch Pre-Primer',
      category: 'sight_words',
      description: 'The 40 essential sight words every kindergartner learns',
      gradeLevel: 'Kindergarten',
      words: ['a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for', 'funny', 'go', 'help', 'here', 'I', 'in', 'is', 'it', 'jump', 'little', 'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said', 'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you'],
      sortOrder: 10,
    },
    {
      id: uuidv4(),
      name: 'Kindergarten · CVC Short A',
      category: 'phonics',
      description: 'Three-letter words with the short-a sound (cat, hat, sat)',
      gradeLevel: 'Kindergarten',
      words: ['cat', 'hat', 'mat', 'sat', 'rat', 'bat', 'fat', 'pat', 'mad', 'sad', 'bad', 'had', 'jam', 'ham', 'can', 'man', 'pan', 'fan', 'ran', 'cap', 'map', 'tap', 'bag', 'tag'],
      sortOrder: 11,
    },
    {
      id: uuidv4(),
      name: 'Kindergarten · CVC Short E',
      category: 'phonics',
      description: 'Three-letter words with the short-e sound (bed, red, ten)',
      gradeLevel: 'Kindergarten',
      words: ['bed', 'red', 'led', 'fed', 'hen', 'pen', 'ten', 'men', 'get', 'jet', 'let', 'met', 'net', 'pet', 'set', 'wet', 'leg', 'web'],
      sortOrder: 12,
    },
    {
      id: uuidv4(),
      name: 'Kindergarten · CVC Short I',
      category: 'phonics',
      description: 'Three-letter words with the short-i sound (big, pig, sit)',
      gradeLevel: 'Kindergarten',
      words: ['big', 'dig', 'pig', 'wig', 'fig', 'bin', 'pin', 'tin', 'win', 'fin', 'dip', 'lip', 'sip', 'tip', 'zip', 'bit', 'fit', 'hit', 'sit', 'lit', 'pit'],
      sortOrder: 13,
    },
    {
      id: uuidv4(),
      name: 'Kindergarten · CVC Short O',
      category: 'phonics',
      description: 'Three-letter words with the short-o sound (dog, hot, top)',
      gradeLevel: 'Kindergarten',
      words: ['dog', 'log', 'fog', 'hog', 'jog', 'hot', 'pot', 'lot', 'got', 'not', 'dot', 'cot', 'rod', 'pod', 'hop', 'mop', 'pop', 'top', 'box', 'fox'],
      sortOrder: 14,
    },
    {
      id: uuidv4(),
      name: 'Kindergarten · CVC Short U',
      category: 'phonics',
      description: 'Three-letter words with the short-u sound (sun, cup, run)',
      gradeLevel: 'Kindergarten',
      words: ['sun', 'fun', 'run', 'bun', 'gun', 'bug', 'hug', 'jug', 'mug', 'rug', 'tug', 'cup', 'pup', 'cut', 'but', 'nut', 'gut', 'hut', 'tub', 'mud'],
      sortOrder: 15,
    },
    {
      id: uuidv4(),
      name: 'Kindergarten · Body Parts',
      category: 'everyday',
      description: 'Parts of the body — concrete and pointable',
      gradeLevel: 'Kindergarten',
      words: ['head', 'face', 'eye', 'ear', 'nose', 'mouth', 'arm', 'hand', 'leg', 'foot', 'hair', 'tooth'],
      sortOrder: 16,
    },
    {
      id: uuidv4(),
      name: 'Kindergarten · Action Words',
      category: 'everyday',
      description: 'Verbs kids do every day',
      gradeLevel: 'Kindergarten',
      words: ['run', 'jump', 'walk', 'hop', 'play', 'sing', 'eat', 'drink', 'sleep', 'sit', 'stand', 'hug', 'laugh', 'smile'],
      sortOrder: 17,
    },

    // ───────── 1st Grade (ages 5-6) ─────────
    {
      id: uuidv4(),
      name: '1st Grade · Dolch Primer',
      category: 'sight_words',
      description: 'The 52 sight words after Pre-Primer — second tier',
      gradeLevel: '1st Grade',
      words: ['all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came', 'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like', 'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran', 'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this', 'too', 'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who', 'will', 'with', 'yes'],
      sortOrder: 20,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Dolch List',
      category: 'sight_words',
      description: 'The 41 sight words taught in 1st grade',
      gradeLevel: '1st Grade',
      words: ['after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly', 'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just', 'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put', 'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk', 'were', 'when'],
      sortOrder: 21,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Word Family -at',
      category: 'word_family',
      description: 'Rhyming -at words (cat, hat, that)',
      gradeLevel: '1st Grade',
      words: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'fat', 'pat', 'flat', 'chat', 'that', 'splat'],
      sortOrder: 22,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Word Family -an',
      category: 'word_family',
      description: 'Rhyming -an words (can, ran, plan)',
      gradeLevel: '1st Grade',
      words: ['can', 'man', 'pan', 'fan', 'ran', 'tan', 'van', 'plan', 'than'],
      sortOrder: 23,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Word Family -ig',
      category: 'word_family',
      description: 'Rhyming -ig words (big, pig, twig)',
      gradeLevel: '1st Grade',
      words: ['big', 'dig', 'fig', 'jig', 'pig', 'rig', 'wig', 'twig'],
      sortOrder: 24,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Word Family -og',
      category: 'word_family',
      description: 'Rhyming -og words (dog, log, frog)',
      gradeLevel: '1st Grade',
      words: ['dog', 'fog', 'log', 'jog', 'hog', 'bog', 'frog', 'clog'],
      sortOrder: 25,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Word Family -ug',
      category: 'word_family',
      description: 'Rhyming -ug words (bug, hug, plug)',
      gradeLevel: '1st Grade',
      words: ['bug', 'hug', 'jug', 'mug', 'pug', 'rug', 'tug', 'plug', 'snug'],
      sortOrder: 26,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Digraphs sh-',
      category: 'phonics',
      description: 'The sh- sound — two letters that make one new sound',
      gradeLevel: '1st Grade',
      words: ['she', 'ship', 'shop', 'shut', 'shoe', 'shell', 'shark', 'sheep', 'short'],
      sortOrder: 27,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Digraphs ch-',
      category: 'phonics',
      description: 'The ch- sound — soft and crunchy',
      gradeLevel: '1st Grade',
      words: ['chip', 'chop', 'chin', 'chest', 'cheek', 'chick', 'child', 'chair', 'cherry'],
      sortOrder: 28,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Digraphs th-',
      category: 'phonics',
      description: 'The th- sound — common at the start of small words',
      gradeLevel: '1st Grade',
      words: ['the', 'this', 'that', 'they', 'them', 'then', 'there', 'thing', 'think', 'three', 'thumb'],
      sortOrder: 29,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Days of the Week',
      category: 'everyday',
      description: 'The seven days of the week',
      gradeLevel: '1st Grade',
      words: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      sortOrder: 30,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Weather Words',
      category: 'everyday',
      description: 'Words about weather and the sky',
      gradeLevel: '1st Grade',
      words: ['sun', 'sunny', 'cloud', 'rain', 'rainy', 'snow', 'wind', 'hot', 'cold', 'warm', 'storm', 'rainbow', 'sky'],
      sortOrder: 31,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Numbers 1-20',
      category: 'everyday',
      description: 'Number words eleven through twenty (Pre-K covers 1-10)',
      gradeLevel: '1st Grade',
      words: ['eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
      sortOrder: 32,
    },
    {
      id: uuidv4(),
      name: '1st Grade · Food Words',
      category: 'everyday',
      description: 'Common food words kids see in stories',
      gradeLevel: '1st Grade',
      words: ['apple', 'banana', 'bread', 'cheese', 'milk', 'water', 'juice', 'egg', 'cake', 'cookie', 'pizza', 'fish'],
      sortOrder: 33,
    },

    // ───────── 2nd Grade (ages 6-7) ─────────
    {
      id: uuidv4(),
      name: '2nd Grade · Dolch List',
      category: 'sight_words',
      description: 'The 46 sight words taught in 2nd grade',
      gradeLevel: '2nd Grade',
      words: ['always', 'around', 'because', 'been', 'before', 'best', 'both', 'buy', 'call', 'cold', 'does', "don't", 'fast', 'first', 'five', 'found', 'gave', 'goes', 'green', 'its', 'made', 'many', 'off', 'or', 'pull', 'read', 'right', 'sing', 'sit', 'sleep', 'tell', 'their', 'these', 'those', 'upon', 'us', 'use', 'very', 'wash', 'which', 'why', 'wish', 'work', 'would', 'write', 'your'],
      sortOrder: 40,
    },
    {
      id: uuidv4(),
      name: '2nd Grade · Word Family -ake',
      category: 'word_family',
      description: 'Long-A words ending in -ake (cake, bake, snake)',
      gradeLevel: '2nd Grade',
      words: ['cake', 'bake', 'lake', 'make', 'rake', 'take', 'wake', 'snake', 'shake', 'flake'],
      sortOrder: 41,
    },
    {
      id: uuidv4(),
      name: '2nd Grade · Word Family -ike',
      category: 'word_family',
      description: 'Long-I words ending in -ike (bike, hike, like)',
      gradeLevel: '2nd Grade',
      words: ['bike', 'hike', 'like', 'pike', 'spike', 'strike'],
      sortOrder: 42,
    },
    {
      id: uuidv4(),
      name: '2nd Grade · Word Family -ight',
      category: 'word_family',
      description: 'Long-I words spelled -ight (light, night, bright)',
      gradeLevel: '2nd Grade',
      words: ['light', 'might', 'night', 'right', 'sight', 'tight', 'fight', 'bright', 'flight', 'knight'],
      sortOrder: 43,
    },
    {
      id: uuidv4(),
      name: '2nd Grade · Opposites',
      category: 'everyday',
      description: 'Pairs of opposite words',
      gradeLevel: '2nd Grade',
      words: ['big', 'small', 'hot', 'cold', 'fast', 'slow', 'up', 'down', 'in', 'out', 'open', 'closed', 'happy', 'sad', 'good', 'bad', 'old', 'new', 'tall', 'short'],
      sortOrder: 44,
    },
    {
      id: uuidv4(),
      name: '2nd Grade · Months of the Year',
      category: 'everyday',
      description: 'All twelve months',
      gradeLevel: '2nd Grade',
      words: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      sortOrder: 45,
    },

    // ───────── 3rd Grade (ages 7-8) ─────────
    {
      id: uuidv4(),
      name: '3rd Grade · Dolch List',
      category: 'sight_words',
      description: 'The 41 sight words taught in 3rd grade',
      gradeLevel: '3rd Grade',
      words: ['about', 'better', 'bring', 'carry', 'clean', 'cut', 'done', 'draw', 'drink', 'eight', 'fall', 'far', 'full', 'got', 'grow', 'hold', 'hot', 'hurt', 'if', 'keep', 'kind', 'laugh', 'light', 'long', 'much', 'myself', 'never', 'only', 'own', 'pick', 'seven', 'shall', 'show', 'six', 'small', 'start', 'ten', 'today', 'together', 'try', 'warm'],
      sortOrder: 50,
    },
    {
      id: uuidv4(),
      name: '3rd Grade · Dolch Nouns',
      category: 'sight_words',
      description: 'The 95 most common nouns kids meet in books',
      gradeLevel: '3rd Grade',
      words: ['apple', 'baby', 'back', 'ball', 'bear', 'bed', 'bell', 'bird', 'birthday', 'boat', 'box', 'boy', 'bread', 'brother', 'cake', 'car', 'cat', 'chair', 'chicken', 'children', 'coat', 'corn', 'cow', 'day', 'dog', 'doll', 'door', 'duck', 'egg', 'eye', 'farm', 'farmer', 'father', 'feet', 'fire', 'fish', 'floor', 'flower', 'game', 'garden', 'girl', 'grass', 'ground', 'hand', 'head', 'hill', 'home', 'horse', 'house', 'kitty', 'leg', 'letter', 'man', 'men', 'milk', 'money', 'morning', 'mother', 'name', 'nest', 'night', 'paper', 'party', 'picture', 'pig', 'rabbit', 'rain', 'ring', 'robin', 'school', 'seed', 'sheep', 'shoe', 'sister', 'snow', 'song', 'squirrel', 'stick', 'street', 'sun', 'table', 'thing', 'time', 'top', 'toy', 'tree', 'watch', 'water', 'way', 'wind', 'window', 'wood'],
      sortOrder: 51,
    },
    {
      id: uuidv4(),
      name: '3rd Grade · Fry First 100',
      category: 'sight_words',
      description: 'The 100 most common English words — covers ~50% of all reading',
      gradeLevel: '3rd Grade',
      words: ['the', 'of', 'and', 'a', 'to', 'in', 'is', 'you', 'that', 'it', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'I', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write', 'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first', 'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part'],
      sortOrder: 52,
    },
  ];

  await setItem(STORAGE_KEYS.PRESETS, presets);
  await AsyncStorage.setItem(PRESETS_VERSION_KEY, PRESETS_VERSION);
};

/**
 * Auto-seed a child's word library with an age-appropriate starter pack
 * so they can begin practicing on day 1. Mapped by gradeLevel.
 */
const STARTER_PACK_BY_GRADE: Record<string, string[]> = {
  'Pre-K': ['Pre-K · First Words', 'Pre-K · Family', 'Pre-K · Colors', 'Pre-K · Numbers 1-10'],
  'Kindergarten': ['Kindergarten · Dolch Pre-Primer', 'Kindergarten · CVC Short A', 'Kindergarten · Body Parts'],
  '1st Grade': ['1st Grade · Dolch Primer', '1st Grade · Word Family -at', '1st Grade · Days of the Week'],
  '2nd Grade': ['2nd Grade · Dolch List', '2nd Grade · Word Family -ake', '2nd Grade · Opposites'],
  '3rd Grade': ['3rd Grade · Dolch List', '3rd Grade · Fry First 100'],
};

export const seedStarterWordsForChild = async (
  childId: string,
  gradeLevel: string | undefined,
): Promise<number> => {
  await initializePresets();
  const presets = await getItem<PresetWordList>(STORAGE_KEYS.PRESETS);
  const grade = gradeLevel && STARTER_PACK_BY_GRADE[gradeLevel] ? gradeLevel : 'Kindergarten';
  const targetNames = STARTER_PACK_BY_GRADE[grade] || [];
  const targetSets = presets.filter((p) => targetNames.includes(p.name));

  const wordSet = new Set<string>();
  for (const set of targetSets) {
    for (const w of set.words) wordSet.add(w.toLowerCase());
  }
  if (wordSet.size === 0) return 0;

  const existing = await getWords();
  const alreadyHave = new Set(
    existing.filter((w) => w.childId === childId).map((w) => w.word.toLowerCase()),
  );

  const now = new Date().toISOString();
  const newWords: Word[] = [];
  for (const w of wordSet) {
    if (alreadyHave.has(w)) continue;
    newWords.push({
      id: uuidv4(),
      childId,
      word: w,
      firstSeen: now,
      lastSeen: now,
      totalOccurrences: 1,
      sessionsSeenCount: 0,
      status: 'new',
      masteryCorrectCount: 0,
      incorrectCount: 0,
    });
  }
  if (newWords.length === 0) return 0;

  await setItem(STORAGE_KEYS.WORDS, [...existing, ...newWords]);
  return newWords.length;
};

/**
 * Add all words from a single preset list to a child's library.
 * Returns the count of words added (excludes duplicates).
 */
export const addPresetToChild = async (childId: string, presetId: string): Promise<number> => {
  const preset = await getPresetById(presetId);
  if (!preset) return 0;

  const existing = await getWords();
  const alreadyHave = new Set(
    existing.filter((w) => w.childId === childId).map((w) => w.word.toLowerCase()),
  );

  const now = new Date().toISOString();
  const newWords: Word[] = [];
  for (const raw of preset.words) {
    const w = raw.toLowerCase();
    if (alreadyHave.has(w)) continue;
    newWords.push({
      id: uuidv4(),
      childId,
      word: w,
      firstSeen: now,
      lastSeen: now,
      totalOccurrences: 1,
      sessionsSeenCount: 0,
      status: 'new',
      masteryCorrectCount: 0,
      incorrectCount: 0,
    });
  }
  if (newWords.length === 0) return 0;

  await setItem(STORAGE_KEYS.WORDS, [...existing, ...newWords]);
  return newWords.length;
};

export const getPresets = async (): Promise<PresetWordList[]> => {
  await initializePresets();
  return getItem<PresetWordList>(STORAGE_KEYS.PRESETS);
};

export const getPresetById = async (id: string): Promise<PresetWordList | undefined> => {
  const presets = await getPresets();
  return presets.find(p => p.id === id);
};