import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  serverTimestamp, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  PlusCircle, 
  CheckCircle, 
  Clock, 
  BookCheck, 
  BookOpen, // Replaced 'Bible' with 'BookOpen' to fix the import error
  Hash, 
  Code, 
  List, 
  Target, 
  Calendar, 
  Trash2, 
  X, 
  Edit 
} from 'lucide-react';

// --- Global Firebase Configuration (Mandatory Setup) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Helper to handle exponential backoff for API calls (though this file primarily uses Firestore, it's good practice)
const MAX_RETRIES = 5;

// Global Firebase Instances
let app = null;
let db = null;
let auth = null;

// Utility function to get the Firestore collection path
const getCollectionPath = (userId, type) => {
    // Public data for shared items, Private data for journal entries
    const collectionName = type === 'shared' ? 'shared_prayers' : 'journal_entries';
    if (type === 'shared') {
        return `artifacts/${appId}/public/data/${collectionName}`;
    }
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
};

// Custom Hook for State Management and Firebase Logic
const useJournalState = () => {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      setError("Firebase config not found. The app cannot load data.");
      setIsLoading(false);
      return;
    }

    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);
    } catch (e) {
      if (!app) {
         setError("Failed to initialize Firebase.");
         setIsLoading(false);
         return;
      }
    }
    
    // Auth Listener and Sign-In Logic
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setIsAuthReady(true);
      } else {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            await signInAnonymously(auth);
          }
        } catch (e) {
          console.error("Authentication failed:", e);
          setError("Failed to authenticate user. Check console for details.");
          setIsAuthReady(true); // Still ready, but failed
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Firestore Snapshot Listener
  useEffect(() => {
    if (!isAuthReady || !userId) return;

    // Use onSnapshot to listen to real-time changes
    const journalRef = collection(db, getCollectionPath(userId, 'private'));
    const q = query(journalRef);

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to JS Date for consistent display
        createdAt: doc.data().createdAt?.toDate() || new Date() 
      })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first
      
      setEntries(fetchedEntries);
      setIsLoading(false);
    }, (e) => {
      console.error("Error fetching journal entries:", e);
      setError("Failed to load journal entries. Please try again.");
      setIsLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [isAuthReady, userId]);

  // Helper function for Firestore operations with retry
  const firestoreOperationWithRetry = useCallback(async (operation, entryData, docId = null) => {
    let lastError = null;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const docRef = docId 
          ? doc(db, getCollectionPath(userId, 'private'), docId) 
          : collection(db, getCollectionPath(userId, 'private'));
        
        if (operation === 'add') {
          // AddDoc is not used with custom IDs, use setDoc with a new generated ID
          const newDocRef = doc(collection(db, getCollectionPath(userId, 'private')));
          await setDoc(newDocRef, { ...entryData, createdAt: serverTimestamp() });
          
        } else if (operation === 'edit') {
          await setDoc(docRef, { ...entryData }, { merge: true });
          
        } else if (operation === 'delete') {
          await deleteDoc(docRef);
        }
        
        return true; // Success
      } catch (e) {
        lastError = e;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    console.error(`Firestore operation failed after ${MAX_RETRIES} attempts:`, lastError);
    setError(`Operation failed: ${lastError.message}`);
    return false; // Failure
  }, [userId]);

  // CRUD Operations
  const saveEntry = useCallback(async (entryData, mode, id = null) => {
    setMessage('');
    const success = await firestoreOperationWithRetry(
      mode === 'edit' ? 'edit' : 'add', 
      entryData, 
      id
    );

    if (success) {
      setMessage(`Entry successfully ${mode === 'edit' ? 'updated' : 'added'}!`);
      setShowModal(false);
      setActiveEntry(null);
    }
  }, [firestoreOperationWithRetry]);

  const deleteEntry = useCallback(async (id) => {
    setMessage('');
    // Use custom confirmation modal instead of alert/confirm
    if (window.confirm("Are you sure you want to delete this entry?")) {
        const success = await firestoreOperationWithRetry('delete', null, id);
        if (success) {
            setMessage('Entry successfully deleted.');
        }
    }
  }, [firestoreOperationWithRetry]);

  const openAddModal = () => {
    setActiveEntry(null);
    setModalMode('add');
    setShowModal(true);
  };

  const openEditModal = (entry) => {
    setActiveEntry(entry);
    setModalMode('edit');
    setShowModal(true);
  };

  const closeMessage = () => setMessage('');

  // Derived state for filtering/grouping
  const tagList = useMemo(() => {
    const tags = new Set();
    entries.forEach(entry => entry.tags?.split(',').map(t => t.trim()).filter(t => t).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [entries]);

  return {
    userId,
    isLoading,
    entries,
    tagList,
    error,
    message,
    activeEntry,
    showModal,
    modalMode,
    openAddModal,
    openEditModal,
    setShowModal,
    saveEntry,
    deleteEntry,
    closeMessage
  };
};

// --- Entry Modal Component ---
const EntryModal = ({ show, mode, entry, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('Prayer');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (entry && mode === 'edit') {
      setTitle(entry.title || '');
      setContent(entry.content || '');
      setType(entry.type || 'Prayer');
      setTags(entry.tags || '');
    } else {
      setTitle('');
      setContent('');
      setType('Prayer');
      setTags('');
    }
  }, [entry, mode]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      title,
      content,
      type,
      tags: tags.toLowerCase() // Normalize tags
    };
    onSave(data, mode, entry?.id);
  };

  const titleText = mode === 'add' ? 'Add New Entry' : 'Edit Entry';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4 transition-opacity duration-300">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-transform duration-300 scale-100">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            {titleText}
            {mode === 'add' ? <PlusCircle className="w-5 h-5 ml-2 text-indigo-600" /> : <Edit className="w-5 h-5 ml-2 text-indigo-600" />}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Gratitude for Health"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            >
              <option value="Prayer">Prayer</option>
              <option value="Study">Scripture Study / Reflection</option>
              <option value="Goal">Spiritual Goal / Intention</option>
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content / Details</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your prayer, reflection, or goal details here..."
              rows="8"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none"
            ></textarea>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Tags (Comma-separated)</label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., gratitude, family, healing, john 3:16"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold shadow-md"
            >
              {mode === 'add' ? 'Save Entry' : 'Update Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Single Entry Component ---
const EntryCard = ({ entry, onEdit, onDelete }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'Prayer': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Study': return <BookOpen className="w-5 h-5 text-indigo-600" />; // Used BookOpen here
      case 'Goal': return <Target className="w-5 h-5 text-green-600" />;
      default: return <List className="w-5 h-5 text-gray-600" />;
    }
  };

  const formattedDate = entry.createdAt 
    ? new Date(entry.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }) 
    : 'Date Unavailable';

  const tags = entry.tags?.split(',').map(t => t.trim()).filter(t => t);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          {getIcon(entry.type)}
          <span className={`ml-2 text-sm font-semibold ${entry.type === 'Prayer' ? 'text-yellow-700' : entry.type === 'Study' ? 'text-indigo-700' : 'text-green-700'}`}>
            {entry.type}
          </span>
        </div>
        <div className="text-xs text-gray-500 flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          {formattedDate}
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3">{entry.title}</h3>
      
      <div className="flex-grow overflow-y-auto max-h-40 mb-4 text-gray-600 text-sm leading-relaxed custom-scrollbar">
        {entry.content}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tags?.map((tag, index) => (
          <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200 transition-colors">
            <Hash className="w-3 h-3 inline mr-1 text-gray-500" />{tag}
          </span>
        ))}
      </div>

      <div className="flex justify-end space-x-3 border-t pt-4">
        <button
          onClick={() => onEdit(entry)}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 transition-colors font-medium p-2 rounded-lg hover:bg-indigo-50"
          title="Edit Entry"
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="flex items-center text-sm text-red-600 hover:text-red-800 transition-colors font-medium p-2 rounded-lg hover:bg-red-50"
          title="Delete Entry"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  const {
    userId,
    isLoading,
    entries,
    tagList,
    error,
    message,
    activeEntry,
    showModal,
    modalMode,
    openAddModal,
    openEditModal,
    setShowModal,
    saveEntry,
    deleteEntry,
    closeMessage
  } = useJournalState();

  const [filterType, setFilterType] = useState('All');
  const [filterTag, setFilterTag] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Filter by Type
      if (filterType !== 'All' && entry.type !== filterType) {
        return false;
      }
      
      // Filter by Tag
      if (filterTag !== 'All') {
        const entryTags = entry.tags?.toLowerCase().split(',').map(t => t.trim()) || [];
        if (!entryTags.includes(filterTag.toLowerCase())) {
          return false;
        }
      }

      // Filter by Search Term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          entry.title.toLowerCase().includes(searchLower) ||
          entry.content.toLowerCase().includes(searchLower) ||
          entry.tags.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [entries, filterType, filterTag, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex items-center space-x-2 text-indigo-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium">Loading Journal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      {/* Header and User ID */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-indigo-700 flex items-center">
            <BookCheck className="w-8 h-8 mr-2" />
            Spiritual Journal
          </h1>
          <div className="text-sm text-gray-600 hidden sm:block">
            <span className="font-medium">User ID:</span> {userId || 'N/A'}
          </div>
        </div>
      </header>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl max-w-7xl mx-auto mt-4 transition-opacity duration-500 flex justify-between items-center">
          <p className="font-medium">Error: {error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl max-w-7xl mx-auto mt-4 transition-opacity duration-500 flex justify-between items-center">
          <p className="font-medium"><CheckCircle className="w-5 h-5 inline mr-2" /> {message}</p>
          <button onClick={closeMessage}><X className="w-4 h-4" /></button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Section */}
        <section className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <button
              onClick={openAddModal}
              className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-lg hover:shadow-xl flex items-center justify-center text-lg mb-4 md:mb-0"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Add New Entry
            </button>
            <div className="text-xl font-bold text-gray-700">
                Total Entries: <span className="text-indigo-600">{entries.length}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search by Title, Content, or Tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="col-span-1 sm:col-span-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
            
            {/* Filter by Type */}
            <div className="col-span-1">
                <label htmlFor="filterType" className="sr-only">Filter by Type</label>
                <select
                  id="filterType"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                >
                  <option value="All">All Types</option>
                  <option value="Prayer">Prayer</option>
                  <option value="Study">Study / Reflection</option>
                  <option value="Goal">Spiritual Goal</option>
                </select>
            </div>

            {/* Filter by Tag */}
            <div className="col-span-1">
                <label htmlFor="filterTag" className="sr-only">Filter by Tag</label>
                <select
                  id="filterTag"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                >
                  <option value="All">All Tags</option>
                  {tagList.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
            </div>
          </div>
        </section>

        {/* Entries Display Grid */}
        <section>
          {filteredEntries.length === 0 ? (
            <div className="text-center p-10 bg-white rounded-xl shadow-lg">
              <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-xl text-gray-600 font-medium">No entries match your current filters or search term.</p>
              <p className="text-gray-500 mt-2">Try adding a new entry or clearing your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEntries.map(entry => (
                <EntryCard 
                  key={entry.id} 
                  entry={entry} 
                  onEdit={openEditModal} 
                  onDelete={deleteEntry} 
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal Overlay */}
      <EntryModal 
        show={showModal} 
        mode={modalMode} 
        entry={activeEntry} 
        onClose={() => setShowModal(false)} 
        onSave={saveEntry}
      />
      
      {/* Custom Scrollbar Styling */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c3c3c3;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a3a3a3;
        }
      `}</style>
    </div>
  );
};

export default App;