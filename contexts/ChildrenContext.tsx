import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import type { Child, Word, ReadingSession, Book, ChildBookProgress } from '../types';
import * as storage from '../lib/storage';

interface ChildrenContextType {
  children: Child[];
  currentChild: Child | null;
  words: Word[];
  sessions: ReadingSession[];
  books: Book[];
  bookProgress: ChildBookProgress[];
  loading: boolean;
  addChild: (name: string, gradeLevel?: string) => Promise<Child>;
  updateChild: (child: Child) => Promise<void>;
  deleteChild: (childId: string) => Promise<void>;
  selectChild: (child: Child | null) => void;
  refreshData: () => Promise<void>;
  addSession: (childId: string, bookTitle: string, extractedText: string) => Promise<ReadingSession>;
  addWords: (childId: string, newWords: string[]) => Promise<void>;
  updateWord: (word: Word) => Promise<void>;
  masterWord: (wordId: string) => Promise<void>;
  addBook: (book: Omit<Book, 'id' | 'createdAt'>) => Promise<Book>;
  deleteBook: (bookId: string) => Promise<void>;
  addBookToLibrary: (childId: string, bookId: string) => Promise<void>;
}

const ChildrenContext = createContext<ChildrenContextType | undefined>(undefined);

const DEFAULT_CHILD_SETTINGS = {
  stopWordsEnabled: false,
  gradeLevelFilterEnabled: false,
  masteryThreshold: 4,
  deckSize: 4,
  timerSeconds: 7,
  demoteOnMiss: true,
  voicePreference: 'shimmer' as const,
  sentencesRead: 0,
  gifCelebrationsEnabled: true,
  theme: 'default' as const,
};

export function ChildrenProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [currentChild, setCurrentChild] = useState<Child | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookProgress, setBookProgress] = useState<ChildBookProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [childrenData, wordsData, sessionsData, booksData, progressData] = await Promise.all([
        storage.getChildren(),
        storage.getWords(),
        storage.getSessions(),
        storage.getBooks(),
        storage.getBookProgress(),
      ]);
      
      setChildren(childrenData);
      setWords(wordsData);
      setSessions(sessionsData);
      setBooks(booksData);
      setBookProgress(progressData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addChild = async (name: string, gradeLevel?: string): Promise<Child> => {
    const newChild: Child = {
      id: uuidv4(),
      name,
      gradeLevel,
      ...DEFAULT_CHILD_SETTINGS,
      createdAt: new Date().toISOString(),
    };
    
    await storage.saveChild(newChild);
    setChildren(prev => [...prev, newChild]);
    return newChild;
  };

  const updateChild = async (child: Child): Promise<void> => {
    await storage.saveChild(child);
    setChildren(prev => prev.map(c => c.id === child.id ? child : c));
    if (currentChild?.id === child.id) {
      setCurrentChild(child);
    }
  };

  const deleteChild = async (childId: string): Promise<void> => {
    await storage.deleteChild(childId);
    setChildren(prev => prev.filter(c => c.id !== childId));
    if (currentChild?.id === childId) {
      setCurrentChild(null);
    }
    await refreshData();
  };

  const selectChild = (child: Child | null) => {
    setCurrentChild(child);
  };

  const addSession = async (
    childId: string, 
    bookTitle: string, 
    extractedText: string
  ): Promise<ReadingSession> => {
    // Extract words from text
    const wordList = extractedText
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && w.length <= 15);
    
    const uniqueWords = [...new Set(wordList)];
    
    // Get existing words for this child
    const existingWords = await storage.getWordsByChild(childId);
    const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));
    
    const newWords: Word[] = [];
    const now = new Date().toISOString();
    
    for (const wordText of uniqueWords) {
      if (!existingWordSet.has(wordText)) {
        const newWord: Word = {
          id: uuidv4(),
          childId,
          word: wordText,
          firstSeen: now,
          lastSeen: now,
          totalOccurrences: 1,
          sessionsSeenCount: 1,
          status: 'new',
          masteryCorrectCount: 0,
          incorrectCount: 0,
        };
        newWords.push(newWord);
      }
    }
    
    // Save new words
    if (newWords.length > 0) {
      await storage.saveWords(newWords);
    }
    
    // Create session
    const session: ReadingSession = {
      id: uuidv4(),
      childId,
      bookTitle: bookTitle || 'Reading Session',
      createdAt: now,
      imageUrls: [],
      extractedText,
      newWordsCount: newWords.length,
      totalWordsCount: uniqueWords.length,
    };
    
    await storage.saveSession(session);
    await refreshData();
    
    return session;
  };

  const addWords = async (childId: string, newWords: string[]): Promise<void> => {
    const existingWords = await storage.getWordsByChild(childId);
    const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));
    
    const wordsToAdd: Word[] = [];
    const now = new Date().toISOString();
    
    for (const wordText of newWords) {
      const cleanWord = wordText.toLowerCase().trim();
      if (cleanWord && !existingWordSet.has(cleanWord)) {
        wordsToAdd.push({
          id: uuidv4(),
          childId,
          word: cleanWord,
          firstSeen: now,
          lastSeen: now,
          totalOccurrences: 1,
          sessionsSeenCount: 1,
          status: 'new',
          masteryCorrectCount: 0,
          incorrectCount: 0,
        });
      }
    }
    
    if (wordsToAdd.length > 0) {
      await storage.saveWords(wordsToAdd);
      await refreshData();
    }
  };

  const updateWord = async (word: Word): Promise<void> => {
    await storage.saveWord(word);
    setWords(prev => prev.map(w => w.id === word.id ? word : w));
  };

  const masterWord = async (wordId: string): Promise<void> => {
    await storage.updateWordStatus(wordId, 'mastered', true);
    await refreshData();
  };

  const addBook = async (book: Omit<Book, 'id' | 'createdAt'>): Promise<Book> => {
    const newBook: Book = {
      ...book,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    
    await storage.saveBook(newBook);
    setBooks(prev => [...prev, newBook]);
    return newBook;
  };

  const deleteBook = async (bookId: string): Promise<void> => {
    await storage.deleteBook(bookId);
    setBooks(prev => prev.filter(b => b.id !== bookId));
  };

  const addBookToLibrary = async (childId: string, bookId: string): Promise<void> => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    // Add book words to child's word library
    await addWords(childId, book.words);
    
    // Calculate progress
    const childWords = await storage.getWordsByChild(childId);
    const masteredWords = new Set(
      childWords.filter(w => w.status === 'mastered').map(w => w.word.toLowerCase())
    );
    
    const masteredCount = book.words.filter(w => masteredWords.has(w.toLowerCase())).length;
    
    const progress: ChildBookProgress = {
      id: uuidv4(),
      childId,
      bookId,
      masteredWordCount: masteredCount,
      totalWordCount: book.words.length,
      readinessPercent: Math.round((masteredCount / book.words.length) * 100),
      isReady: masteredCount >= book.words.length * 0.9,
      lastUpdated: new Date().toISOString(),
    };
    
    await storage.saveBookProgress(progress);
    await refreshData();
  };

  return (
    <ChildrenContext.Provider
      value={{
        children,
        currentChild,
        words,
        sessions,
        books,
        bookProgress,
        loading,
        addChild,
        updateChild,
        deleteChild,
        selectChild,
        refreshData,
        addSession,
        addWords,
        updateWord,
        masterWord,
        addBook,
        deleteBook,
        addBookToLibrary,
      }}
    >
      {reactChildren}
    </ChildrenContext.Provider>
  );
}

export function useChildren() {
  const context = useContext(ChildrenContext);
  if (context === undefined) {
    throw new Error('useChildren must be used within a ChildrenProvider');
  }
  return context;
}