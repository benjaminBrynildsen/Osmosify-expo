import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface BookItem {
  id: string;
  title: string;
  author?: string;
  words: string[];
  masteredCount: number;
  totalCount: number;
  percent: number;
}

export default function BooksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, words, books, addBook, addBookToLibrary } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const child = children.find(c => c.id === id);
  const childWords = useMemo(() => 
    words.filter(w => w.childId === id),
    [words, id]
  );
  
  const masteredWords = useMemo(() => 
    new Set(childWords.filter(w => w.status === 'mastered').map(w => w.word.toLowerCase())),
    [childWords]
  );
  
  const bookItems: BookItem[] = useMemo(() => {
    return books.map(book => {
      const masteredCount = book.words.filter(w => masteredWords.has(w.toLowerCase())).length;
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        words: book.words,
        masteredCount,
        totalCount: book.words.length,
        percent: book.words.length > 0 ? Math.round((masteredCount / book.words.length) * 100) : 0,
      };
    });
  }, [books, masteredWords]);
  
  const [filter, setFilter] = useState<'all' | 'ready' | 'almost' | 'progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Add Book Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookWords, setNewBookWords] = useState('');
  
  const filteredBooks = useMemo(() => {
    let result = bookItems;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(query) ||
        (b.author && b.author.toLowerCase().includes(query))
      );
    }
    
    switch (filter) {
      case 'ready':
        return result.filter(b => b.percent >= 90);
      case 'almost':
        return result.filter(b => b.percent >= 70 && b.percent < 90);
      case 'progress':
        return result.filter(b => b.percent < 70);
      default:
        return result;
    }
  }, [bookItems, filter, searchQuery]);
  
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return '#22c55e';
    if (percent >= 70) return '#f59e0b';
    return colors.primary;
  };
  
  const handleBookPress = (book: BookItem) => {
    setSelectedBook(book);
    setModalVisible(true);
  };
  
  const handleAddBook = async () => {
    if (!newBookTitle.trim() || !newBookWords.trim()) return;
    
    const wordList = newBookWords
      .split(/[\s,]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0);
    
    await addBook({
      title: newBookTitle.trim(),
      author: newBookAuthor.trim() || undefined,
      words: wordList,
      wordCount: wordList.length,
      isPreset: false,
      isBeta: false,
      sourceType: 'parent',
    });
    
    setNewBookTitle('');
    setNewBookAuthor('');
    setNewBookWords('');
    setAddModalVisible(false);
  };
  
  const renderBookCard = ({ item }: { item: BookItem }) => (
    <TouchableOpacity
      style={[styles.bookCard, { 
        backgroundColor: colors.surface,
        borderColor: getProgressColor(item.percent),
        borderWidth: item.percent >= 90 ? 2 : 0,
      }]}
      onPress={() => handleBookPress(item)}
    >
      <View style={styles.bookHeader}>
        <View style={styles.bookTitleContainer}>
          {item.percent >= 90 && (
            <Ionicons name="star" size={16} color="#22c55e" style={styles.starIcon} />
          )}
          <Text style={[styles.bookTitle, { color: colors.onSurface }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View style={[styles.percentBadge, { backgroundColor: getProgressColor(item.percent) }]}>
          <Text style={styles.percentText}>{item.percent}%</Text>
        </View>
      </View>
      
      {item.author && (
        <Text style={[styles.bookAuthor, { color: colors.onSurfaceVariant }]}>
          by {item.author}
        </Text>
      )}
      
      <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
        <View style={[styles.progressFill, { 
          backgroundColor: getProgressColor(item.percent),
          width: `${item.percent}%`,
        }]} />
      </View>
      
      <Text style={[styles.wordCount, { color: colors.onSurfaceVariant }]}>
        {item.masteredCount} of {item.totalCount} words unlocked
      </Text>
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Book Library</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
      
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
        <TextInput
          style={[styles.searchInput, { color: colors.onSurface }]}
          placeholder="Search books..."
          placeholderTextColor={colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {(['all', 'ready', 'almost', 'progress'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              { 
                backgroundColor: filter === f ? colors.primary : colors.surface,
              }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterTabText,
              { color: filter === f ? colors.onPrimary : colors.onSurface }
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
            {f === 'ready' && (
              <Text style={[styles.filterCount, { color: filter === f ? 'rgba(255,255,255,0.7)' : colors.onSurfaceVariant }]}>
                ({bookItems.filter(b => b.percent >= 90).length})
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Books List */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={64} color={colors.onSurfaceVariant} />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No books found</Text>
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              {filter === 'all' 
                ? 'Add your first book to start tracking reading readiness.'
                : 'Try a different filter or add more books.'}
            </Text>
          </View>
        }
      />
      
      {/* Book Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {selectedBook && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                    {selectedBook.title}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
                
                {selectedBook.author && (
                  <Text style={[styles.modalAuthor, { color: colors.onSurfaceVariant }]}>
                    by {selectedBook.author}
                  </Text>
                )}
                
                <View style={styles.modalProgress}>
                  <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
                    <View style={[styles.progressFill, { 
                      backgroundColor: getProgressColor(selectedBook.percent),
                      width: `${selectedBook.percent}%`,
                    }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.onSurfaceVariant }]}>
                    {selectedBook.masteredCount} of {selectedBook.totalCount} words unlocked
                  </Text>
                </View>
                
                <ScrollView style={styles.wordsList}>
                  <View style={styles.wordsGrid}>
                    {selectedBook.words.map((word, index) => {
                      const isMastered = masteredWords.has(word.toLowerCase());
                      return (
                        <View 
                          key={index}
                          style={[
                            styles.wordChip,
                            { 
                              backgroundColor: isMastered ? 'rgba(34, 197, 94, 0.1)' : colors.surface,
                              borderColor: isMastered ? '#22c55e' : colors.outline,
                              borderWidth: 1,
                            }
                          ]}
                        >
                          {isMastered && (
                            <Ionicons name="checkmark" size={12} color="#22c55e" style={styles.wordCheck} />
                          )}
                          <Text style={[
                            styles.wordChipText,
                            { 
                              color: isMastered ? '#22c55e' : colors.onSurface,
                              textDecorationLine: isMastered ? 'line-through' : 'none',
                            }
                          ]}>
                            {word}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      addBookToLibrary(id, selectedBook.id);
                      setModalVisible(false);
                    }}
                  >
                    <Ionicons name="add-circle" size={20} color={colors.onPrimary} />
                    <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>
                      Add to Library
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surface }]}
                    onPress={() => {
                      setModalVisible(false);
                      router.push(`/child/${id}/flashcards?bookId=${selectedBook.id}`);
                    }}
                  >
                    <Ionicons name="sparkles" size={20} color={colors.primary} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                      Practice Words
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Add Book Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Add Book</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Title *</Text>
                <TextInput
                  style={[styles.modalInput, { 
                    backgroundColor: colors.surface,
                    color: colors.onSurface,
                    borderColor: colors.outline,
                  }]}
                  placeholder="Book title"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={newBookTitle}
                  onChangeText={setNewBookTitle}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Author (optional)</Text>
                <TextInput
                  style={[styles.modalInput, { 
                    backgroundColor: colors.surface,
                    color: colors.onSurface,
                    borderColor: colors.outline,
                  }]}
                  placeholder="Author name"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={newBookAuthor}
                  onChangeText={setNewBookAuthor}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.onSurface }]}>
                  Words (separated by spaces or commas) *
                </Text>
                <TextInput
                  style={[styles.modalTextArea, { 
                    backgroundColor: colors.surface,
                    color: colors.onSurface,
                    borderColor: colors.outline,
                  }]}
                  placeholder="cat dog house tree..."
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={newBookWords}
                  onChangeText={setNewBookWords}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              
              <TouchableOpacity
                style={[
                  styles.addBookButton,
                  { 
                    backgroundColor: newBookTitle.trim() && newBookWords.trim() 
                      ? colors.primary 
                      : colors.surfaceVariant,
                    opacity: newBookTitle.trim() && newBookWords.trim() ? 1 : 0.5
                  }
                ]}
                onPress={handleAddBook}
                disabled={!newBookTitle.trim() || !newBookWords.trim()}
              >
                <Text style={[styles.addBookButtonText, { color: colors.onPrimary }]}>
                  Add Book
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  addButton: {
    padding: 8,
    marginRight: -8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  list: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  bookCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  starIcon: {
    marginRight: 6,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bookAuthor: {
    fontSize: 13,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  wordCount: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  modalAuthor: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalProgress: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 13,
    marginTop: 8,
  },
  wordsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  wordCheck: {
    marginRight: 4,
  },
  wordChipText: {
    fontSize: 13,
  },
  modalActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  modalTextArea: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
  },
  addBookButton: {
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  addBookButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});