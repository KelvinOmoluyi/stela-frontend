import { useState, useEffect } from 'react';
import { LogIn, LogOut, Plus, Trash2, Send, BookOpen, CheckCircle, XCircle, LayoutDashboard, Trash, Edit, RefreshCw } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { storage, auth } from './firebase';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';

import './App.css'; 

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 mins caching
    },
  },
});

interface ModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

function Modal({
  isOpen,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  showCancel = false
}: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className={`modal-content ${type === 'confirm' ? 'error' : type}`}>
        {type === 'success' ? (
          <CheckCircle size={56} className="modal-icon success-icon" />
        ) : type === 'error' ? (
          <XCircle size={56} className="modal-icon error-icon" />
        ) : (
          <Trash2 size={56} className="modal-icon error-icon" />
        )}
        <h3>{title}</h3>
        <p>{message}</p>
        
        {showCancel ? (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              {cancelText}
            </button>
            <button type="button" onClick={onConfirm} className="btn btn-primary" style={type === 'confirm' ? { backgroundColor: '#e74c3c' } : {}}>
              {confirmText}
            </button>
          </div>
        ) : (
          <button type="button" onClick={onConfirm} className="btn btn-primary mt-4">
            {confirmText}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return createPortal(
    <div className="loader-overlay">
      <div className="spinner"></div>
      <h3 style={{ color: 'var(--text-dark)', margin: 0 }}>{message}</h3>
    </div>,
    document.body
  );
}

export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

interface Chapter {
  chapterNumber: number;
  title: string;
  imageInputType: 'file' | 'url';
  imageUrl: string;
  imageFile: File | null;
  content: string;
}

interface StoryMetadata {
  title: string;
  genre: string;
  readingTime: string;
  description: string;
  ageMin: string;
  ageMax: string;
  coverInputType: 'file' | 'url';
  coverImageUrl: string;
  coverImageFile: File | null;
}

interface StoryListItem {
  storyId: string;
  title: string;
  genre: string;
  description: string;
  coverImageUrl: string;
  readingTime: number;
  totalChapters: number;
  ageRange?: { min: number; max: number };
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  if (!authChecked) {
    return <FullPageLoader message="Checking authentication..." />;
  }

  if (!isLoggedIn) {
    return (
      <div className="app-container login-layout">
        <LoginView onLogin={() => setIsLoggedIn(true)} />
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 style={{ margin: 0, background: 'linear-gradient(to right, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stela Admin</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${view === 'list' ? 'active' : ''}`}
            onClick={() => { setView('list'); setEditingStoryId(null); }}
          >
            <LayoutDashboard size={20} />
            Library
          </button>
          <button 
            className={`nav-item ${view === 'form' && !editingStoryId ? 'active' : ''}`}
            onClick={() => { setView('form'); setEditingStoryId(null); }}
          >
            <Plus size={20} />
            New Story
          </button>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button onClick={() => signOut(auth)} className="logout-btn" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {view === 'list' && (
          <StoryList 
            onEdit={(id) => { setEditingStoryId(id); setView('form'); }} 
          />
        )}
        {view === 'form' && (
          <StoryForm 
            storyId={editingStoryId} 
            onCancel={() => { setView('list'); setEditingStoryId(null); }} 
          />
        )}
      </main>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setIsLoading(true);
      setError('');
      try {
        await signInWithEmailAndPassword(auth, email, password);
        onLogin();
      } catch (err: any) {
        console.error('Login error:', err);
        setError('Invalid email or password. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="login-view glass-card">
      <div className="login-header">
        <h1>Stela Portal</h1>
        <p>Admin login for children's reading app</p>
      </div>
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="example@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div style={{ color: '#e74c3c', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <div className="login-btn-container">
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <LogIn size={20} />
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </div>
      </form>
    </div>
  );
}

function StoryList({ onEdit }: { onEdit: (id: string) => void }) {
  const queryClient = useQueryClient();

  const [modalState, setModalState] = useState<{ isOpen: boolean, type: 'confirm' | 'success' | 'error', message: string, storyIdToDelete: string | null }>({
    isOpen: false,
    type: 'confirm',
    message: '',
    storyIdToDelete: null
  });

  const { data: stories = [], isLoading, error, refetch } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('https://api-f6x7qpormq-uc.a.run.app/api/stories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stories');
      return res.json() as Promise<StoryListItem[]>;
    }
  });

  const requestDelete = (id: string) => {
    setModalState({
      isOpen: true,
      type: 'confirm',
      message: 'Are you sure you want to delete this story? This cannot be undone.',
      storyIdToDelete: id
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`https://api-f6x7qpormq-uc.a.run.app/api/stories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to delete story');
      }
      return id;
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['stories'] });
      
      // Snapshot the previous value
      const previousStories = queryClient.getQueryData<StoryListItem[]>(['stories']);
      
      // Optimistically update to the new value
      if (previousStories) {
        queryClient.setQueryData<StoryListItem[]>(['stories'], old => 
          old ? old.filter(story => story.storyId !== id) : []
        );
      }
      
      // Return a context with the snapshotted value
      return { previousStories };
    },
    onError: (error: any, _id: string, context: any) => {
      // Roll back on error
      if (context?.previousStories) {
        queryClient.setQueryData(['stories'], context.previousStories);
      }
      setModalState({
        isOpen: true,
        type: 'error',
        message: error.message || 'Failed to delete story',
        storyIdToDelete: null
      });
    },
    onSettled: () => {
      // Always refetch to ensure we're synced with the server
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    }
  });

  const confirmDelete = () => {
    if (!modalState.storyIdToDelete) return;
    const id = modalState.storyIdToDelete;
    setModalState(prev => ({ ...prev, isOpen: false }));
    deleteMutation.mutate(id);
  };

  return (
    <div className="list-view glass-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ textAlign: 'left', background: 'none', WebkitBackgroundClip: 'initial', WebkitTextFillColor: 'initial', color: 'var(--text-dark)' }}>Library</h1>
          <p>Manage your Stela stories</p>
        </div>
        <button 
          onClick={() => refetch()} 
          className="btn btn-secondary" 
          style={{ padding: '0.6rem 1rem' }}
          disabled={deleteMutation.isPending}
        >
          <RefreshCw size={18} className={isLoading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>Loading stories...</div>
      ) : error ? (
        <div style={{ color: '#e74c3c', padding: '1rem', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '8px' }}>{(error as Error).message}</div>
      ) : stories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>No stories found. Create one!</div>
      ) : (
        <div className="table-container">
          <table className="stories-table">
            <thead>
              <tr>
                <th>Cover</th>
                <th>Title</th>
                <th>Genre</th>
                <th>Chapters</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stories.map(story => (
                <tr key={story.storyId}>
                  <td>
                    {story.coverImageUrl ? (
                      <img src={story.coverImageUrl} className="cover-thumb" alt="cover" />
                    ) : (
                      <div className="cover-thumb" style={{ display: 'flex', alignItems:'center', justifyContent:'center', color:'#aaa', fontSize:'0.7rem'}}>No Img</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{story.title}</td>
                  <td><span className="badge">{story.genre}</span></td>
                  <td>{story.totalChapters || 0}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => onEdit(story.storyId)} 
                        className="btn btn-secondary btn-small" 
                        title="Edit"
                        disabled={deleteMutation.isPending}
                      >
                        <Edit size={16} /> Edit
                      </button>
                      <button 
                        onClick={() => requestDelete(story.storyId)} 
                        className="btn btn-icon btn-small" 
                        title="Delete"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={
          modalState.type === 'success' ? 'Success!' 
          : modalState.type === 'error' ? 'Oops! Something went wrong' 
          : 'Confirm Deletion'
        }
        message={modalState.message}
        onConfirm={modalState.type === 'confirm' ? confirmDelete : () => setModalState({ ...modalState, isOpen: false })}
        onCancel={() => setModalState({ ...modalState, isOpen: false })}
        showCancel={modalState.type === 'confirm'}
        confirmText={modalState.type === 'confirm' ? 'Delete' : 'Continue'}
      />
      
      {deleteMutation.isPending && <FullPageLoader message="Deleting story..." />}
    </div>
  );
}

function StoryForm({ storyId, onCancel }: { storyId: string | null, onCancel: () => void }) {
  const queryClient = useQueryClient();
  const isEditMode = !!storyId;

  const [modalState, setModalState] = useState<{ isOpen: boolean, type: 'success' | 'error', message: string }>({
    isOpen: false,
    type: 'success',
    message: ''
  });

  const [metadata, setMetadata] = useState<StoryMetadata>({
    title: '',
    genre: 'contemporary',
    readingTime: '',
    description: '',
    ageMin: '',
    ageMax: '',
    coverInputType: 'url',
    coverImageUrl: '',
    coverImageFile: null
  });

  const [isLoadingData, setIsLoadingData] = useState(isEditMode);

  const [chapters, setChapters] = useState<Chapter[]>([
    { chapterNumber: 1, title: '', imageInputType: 'url', imageUrl: '', imageFile: null, content: '' }
  ]);

  useEffect(() => {
    if (isEditMode) {
      loadStoryData(storyId!);
    }
  }, [storyId]);

  const loadStoryData = async (id: string) => {
    setIsLoadingData(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      // 1. Fetch metadata & chapter list
      const res = await fetch(`https://api-f6x7qpormq-uc.a.run.app/api/stories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load story details');
      const data = await res.json();
      
      // Update metadata
      setMetadata({
        title: data.title || '',
        genre: data.genre || 'contemporary',
        readingTime: data.readingTime?.toString() || '',
        description: data.description || '',
        ageMin: data.ageRange?.min?.toString() || '',
        ageMax: data.ageRange?.max?.toString() || '',
        coverInputType: 'url',
        coverImageUrl: data.coverImageUrl || '',
        coverImageFile: null
      });

      // 2. Map chapters from the story response
      if (data.chapters && data.chapters.length > 0) {
        const fullChapters = data.chapters.map((ch: any) => {
          return {
            chapterNumber: ch.chapterNumber,
            title: ch.title || '',
            imageInputType: 'url' as 'file' | 'url',
            imageUrl: ch.imageUrl || '',
            imageFile: null,
            content: ch.content || ch.rawText || ''
          };
        });
        setChapters(fullChapters);
      } else {
        setChapters([{ chapterNumber: 1, title: '', imageInputType: 'url', imageUrl: '', imageFile: null, content: '' }]);
      }
    } catch (err: any) {
      setModalState({ isOpen: true, type: 'error', message: err.message });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  const handleChapterChange = (index: number, field: keyof Chapter, value: any) => {
    setChapters(prev => {
      const newChapters = [...prev];
      newChapters[index] = { ...newChapters[index], [field]: value };
      return newChapters;
    });
  };

  const addChapter = () => {
    setChapters(prev => [
      ...prev,
      { chapterNumber: prev.length + 1, title: '', imageInputType: 'url', imageUrl: '', imageFile: null, content: '' }
    ]);
  };

  const removeChapter = (index: number) => {
    if (chapters.length > 1) {
      setChapters(prev => {
        const newChapters = prev.filter((_, i) => i !== index);
        return newChapters.map((ch, i) => ({ ...ch, chapterNumber: i + 1 }));
      });
    }
  };

  const compressImage = (file: File, maxDim = 1920, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    let fileToUpload: File | Blob = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await compressImage(file);
      } catch (error) {
        console.warn('Image compression failed, uploading original:', error);
      }
    }
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, fileToUpload);
    return await getDownloadURL(storageRef);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      console.time('⏱️ TOTAL submission');
      console.time('⏱️ 1. Image compression + upload');
      // Launch all uploads in parallel (cover + chapters)
      const coverUploadPromise = (metadata.coverInputType === 'file' && metadata.coverImageFile)
        ? uploadFile(metadata.coverImageFile, `covers/${Date.now()}_${metadata.coverImageFile.name}`)
        : Promise.resolve(metadata.coverImageUrl);

      const chapterUploadPromises = chapters.map(async (chapter, idx) => {
        let finalImageUrl = chapter.imageUrl;
        if (chapter.imageInputType === 'file' && chapter.imageFile) {
          finalImageUrl = await uploadFile(
            chapter.imageFile,
            `chapters/${Date.now()}_${idx}_${chapter.imageFile.name}`
          );
        }
        return {
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          imageUrl: finalImageUrl,
          content: chapter.content
        };
      });

      // Await all uploads simultaneously
      const [finalCoverUrl, processedChapters] = await Promise.all([
        coverUploadPromise,
        Promise.all(chapterUploadPromises)
      ]);
      console.timeEnd('⏱️ 1. Image compression + upload');

      const payload = {
        title: metadata.title,
        genre: metadata.genre,
        description: metadata.description,
        coverImageUrl: finalCoverUrl,
        readingTime: parseInt(metadata.readingTime) || 0,
        ageRange: {
          min: parseInt(metadata.ageMin) || 0,
          max: parseInt(metadata.ageMax) || 0
        },
        chapters: processedChapters
      };

      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to submit a story.');
      }
      const token = await user.getIdToken();
      
      const url = isEditMode 
        ? `https://api-f6x7qpormq-uc.a.run.app/api/stories/${storyId}`
        : 'https://api-f6x7qpormq-uc.a.run.app/api/stories/submit';
      const method = isEditMode ? 'PUT' : 'POST';

      console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes');
      console.time('⏱️ 2. API call');
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      console.timeEnd('⏱️ 2. API call');
      console.timeEnd('⏱️ TOTAL submission');
      
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Failed to ${isEditMode ? 'update' : 'submit'} story to the backend.`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });

      if (!isEditMode) {
        setMetadata({
          title: '', genre: 'contemporary', readingTime: '', description: '',
          ageMin: '', ageMax: '', coverInputType: 'url', coverImageUrl: '', coverImageFile: null
        });
        setChapters([{ chapterNumber: 1, title: '', imageInputType: 'url', imageUrl: '', imageFile: null, content: '' }]);
      }
      
      setModalState({
        isOpen: true,
        type: 'success',
        message: isEditMode ? 'Story updated successfully!' : 'Story created successfully!'
      });
    },
    onError: (error: any) => {
      console.error('Error submitting story:', error);
      setModalState({
        isOpen: true,
        type: 'error',
        message: error.message || 'Failed to submit story. Please try again.'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  if (isLoadingData) {
    return <FullPageLoader message="Loading story data..." />;
  }

  return (
    <div className="dashboard-view">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ textAlign: 'left', background: 'none', WebkitBackgroundClip: 'initial', WebkitTextFillColor: 'initial', color: 'var(--text-dark)' }}>
            {isEditMode ? 'Edit Story' : 'Submit a Story'}
          </h1>
          <p>{isEditMode ? 'Make changes and update the library' : 'Add a new magical tale to the Stela library'}</p>
        </div>
        
        {isEditMode && (
          <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={submitMutation.isPending}>
            Back to Library
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={submitMutation.isPending} style={{ border: 'none', padding: 0, margin: 0, opacity: submitMutation.isPending ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
        {/* Metadata Section */}
        <div className="section-card glass-card">
          <h2><BookOpen size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary)' }}/> Story Details</h2>
          
          <div className="form-group">
            <label htmlFor="title">Story Title</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g., The Dragon Who Lost His Roar"
              value={metadata.title}
              onChange={handleMetadataChange}
              required
            />
          </div>

          <div className="row">
            <div className="form-group">
              <label htmlFor="genre">Genre</label>
              <select
                id="genre"
                name="genre"
                value={metadata.genre}
                onChange={handleMetadataChange}
              >
                <option value="contemporary">Contemporary</option>
                <option value="philosophical">Philosophical</option>
                <option value="comedy">Comedy</option>
                <option value="historical">Historical</option>
                <option value="mystery">Mystery</option>
                <option value="heartwarming">Heartwarming</option>
                <option value="adventure">Adventure</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="readingTime">Reading Time (minutes)</label>
              <input
                id="readingTime"
                name="readingTime"
                type="number"
                min="1"
                placeholder="e.g., 5"
                value={metadata.readingTime}
                onChange={handleMetadataChange}
                required
              />
            </div>
          </div>

          <div className="row">
            <div className="form-group">
              <label htmlFor="ageMin">Age Range Min</label>
              <input
                id="ageMin"
                name="ageMin"
                type="number"
                min="0"
                placeholder="e.g., 3"
                value={metadata.ageMin}
                onChange={handleMetadataChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="ageMax">Age Range Max</label>
              <input
                id="ageMax"
                name="ageMax"
                type="number"
                min="0"
                placeholder="e.g., 8"
                value={metadata.ageMax}
                onChange={handleMetadataChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              name="description"
              maxLength={200}
              placeholder="A short summary of the story..."
              value={metadata.description}
              onChange={handleMetadataChange}
            />
            <p className="help-text">{metadata.description.length}/200 characters</p>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Main Cover Image (Optional)</label>
              <div className="image-toggle">
                <button 
                  type="button" 
                  className={metadata.coverInputType === 'file' ? 'active' : ''} 
                  onClick={() => setMetadata(prev => ({ ...prev, coverInputType: 'file' }))}
                >Attach</button>
                <button 
                  type="button" 
                  className={metadata.coverInputType === 'url' ? 'active' : ''} 
                  onClick={() => setMetadata(prev => ({ ...prev, coverInputType: 'url' }))}
                >URL</button>
              </div>
            </div>
            
            {metadata.coverInputType === 'file' ? (
              <input
                type="file"
                className="file-input"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files ? e.target.files[0] : null;
                  setMetadata(prev => ({ ...prev, coverImageFile: file }));
                }}
              />
            ) : (
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={metadata.coverImageUrl}
                onChange={(e) => setMetadata(prev => ({ ...prev, coverImageUrl: e.target.value }))}
              />
            )}
          </div>
        </div>

        {/* Chapters Section */}
        <div className="section-card glass-card">
          <h2>Chapters</h2>
          
          {chapters.map((chapter, index) => (
            <div key={`chapter-${index}`} className="chapter-block">
              <div className="chapter-header">
                <h3>Chapter {chapter.chapterNumber}</h3>
                {chapters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChapter(index)}
                    className="remove-chapter"
                    title="Remove Chapter"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Chapter Title</label>
                <input
                  type="text"
                  placeholder="e.g., The Journey Begins"
                  value={chapter.title}
                  onChange={(e) => handleChapterChange(index, 'title', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Chapter Image (Optional)</label>
                  <div className="image-toggle">
                    <button 
                      type="button" 
                      className={chapter.imageInputType === 'file' ? 'active' : ''} 
                      onClick={() => handleChapterChange(index, 'imageInputType', 'file')}
                    >Attach</button>
                    <button 
                      type="button" 
                      className={chapter.imageInputType === 'url' ? 'active' : ''} 
                      onClick={() => handleChapterChange(index, 'imageInputType', 'url')}
                    >URL</button>
                  </div>
                </div>
                
                {chapter.imageInputType === 'file' ? (
                  <input
                    type="file"
                    className="file-input"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      handleChapterChange(index, 'imageFile', file);
                    }}
                  />
                ) : (
                  <input
                    type="url"
                    placeholder="https://example.com/chapter-img.jpg"
                    value={chapter.imageUrl}
                    onChange={(e) => handleChapterChange(index, 'imageUrl', e.target.value)}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Chapter Content</label>
                <textarea
                  placeholder="Once upon a time...&#10;&#10;Leave a blank line between paragraphs."
                  value={chapter.content}
                  onChange={(e) => handleChapterChange(index, 'content', e.target.value)}
                  style={{ minHeight: '200px' }}
                  required
                />
              </div>
            </div>
          ))}

          <div className="form-actions">
            <button type="button" onClick={addChapter} className="btn btn-secondary">
              <Plus size={20} />
              Add Another Chapter
            </button>
          </div>
        </div>

        {/* Submit Section */}
        <div className="submit-container" style={{ gap: '1rem' }}>
          {isEditMode && (
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitMutation.isPending}>
            <Send size={20} />
            {submitMutation.isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit Story'}
          </button>
        </div>
        </fieldset>
      </form>

      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type as 'success' | 'error'}
        title={modalState.type === 'success' ? 'Success!' : 'Oops! Something went wrong'}
        message={modalState.message}
        onConfirm={() => {
          setModalState({ ...modalState, isOpen: false });
          if (modalState.type === 'success' && isEditMode) {
            onCancel();
          }
        }}
      />
      
      {submitMutation.isPending && <FullPageLoader message={isEditMode ? "Saving changes..." : "Submitting story..."} />}
    </div>
  );
}
