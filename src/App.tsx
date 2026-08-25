import { useState, useEffect } from 'react';
import { LogIn, LogOut, Plus, Trash2, Send, BookOpen, CheckCircle, XCircle, LayoutDashboard, Trash, Edit, RefreshCw, Eye, EyeOff, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
  status?: 'pending' | 'approved' | 'rejected';
  authorId?: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          setIsAdmin(!!tokenResult.claims.admin);
        } catch (e) {
          console.error(e);
        }
      } else {
        setIsAdmin(false);
      }
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
            isAdmin={isAdmin}
            onView={(id) => { setEditingStoryId(id); setView('detail'); }} 
          />
        )}
        {view === 'form' && (
          <StoryForm 
            storyId={editingStoryId} 
            onCancel={() => { setView('list'); setEditingStoryId(null); }} 
          />
        )}
        {view === 'detail' && editingStoryId && (
          <StoryDetailView
            storyId={editingStoryId}
            isAdmin={isAdmin}
            onBack={() => { setView('list'); setEditingStoryId(null); }}
            onEdit={(id) => { setEditingStoryId(id); setView('form'); }}
          />
        )}
      </main>
    </div>
  );
}

function LoginView({ onLogin }: { onLogin: () => void }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password && (isLoginMode || name)) {
      setIsLoading(true);
      setError('');
      try {
        if (isLoginMode) {
          await signInWithEmailAndPassword(auth, email, password);
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (name) {
            await updateProfile(userCredential.user, { displayName: name });
          }
        }
        onLogin();
      } catch (err: any) {
        console.error('Auth error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="login-view glass-card">
      <div className="login-header">
        <h1>Stela Portal</h1>
        <p>{isLoginMode ? 'Login to your account' : 'Create a Writer Account'}</p>
      </div>
      
      <div className="auth-toggle-container">
        <button 
          className={`auth-toggle-btn ${isLoginMode ? 'active' : ''}`} 
          onClick={() => { setIsLoginMode(true); setError(''); }}
          type="button"
        >
          Login
        </button>
        <button 
          className={`auth-toggle-btn ${!isLoginMode ? 'active' : ''}`} 
          onClick={() => { setIsLoginMode(false); setError(''); }}
          type="button"
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="login-form-wrapper">
        <div className={`form-group-animate ${isLoginMode ? 'hidden' : 'visible'}`}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLoginMode}
              tabIndex={isLoginMode ? -1 : 0}
            />
          </div>
        </div>
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
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-light)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.2rem'
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <div style={{ color: '#e74c3c', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <div className="login-btn-container">
          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', justifyContent: 'center' }}>
            <LogIn size={20} />
            {isLoading ? 'Processing...' : (isLoginMode ? 'Log In' : 'Create Account')}
          </button>
        </div>
      </form>
    </div>
  );
}

function StoryList({ onView, isAdmin }: { onView: (id: string) => void, isAdmin: boolean }) {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: stories = [], isLoading, error, refetch } = useQuery<StoryListItem[]>({
    queryKey: ['stories', statusFilter],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      let url = 'https://api-f6x7qpormq-uc.a.run.app/api/admin/stories';
      if (isAdmin && statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stories');
      return res.json();
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`https://api-f6x7qpormq-uc.a.run.app/api/admin/stories/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    }
  });

  return (
    <div className="dashboard-view section-card">
      <div className="dashboard-header">
        <div>
          <h1>Library</h1>
          <p>Manage your Stela stories</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isAdmin && (
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ width: 'auto', padding: '0.4rem 1rem' }}
            >
              <option value="all">All Stories</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
          <button 
            onClick={() => refetch()} 
            className="btn btn-secondary" 
            style={{ padding: '0.6rem 1rem' }}
          >
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} /> Refresh
          </button>
        </div>
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
                <th>Status</th>
                <th>Chapters</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stories.map(story => {
                return (
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
                    <td>
                      <span className="badge" style={{
                        backgroundColor: story.status === 'approved' ? '#2ecc71' : story.status === 'rejected' ? '#e74c3c' : '#f39c12',
                        color: 'white'
                      }}>
                        {story.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td>{story.totalChapters || 0}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => onView(story.storyId)} 
                          className="btn-icon-subtle" 
                          title="View Story"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        {isAdmin && story.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => statusMutation.mutate({ id: story.storyId, status: 'approved' })}
                              className="btn btn-small"
                              style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none' }}
                              disabled={statusMutation.isPending}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => statusMutation.mutate({ id: story.storyId, status: 'rejected' })}
                              className="btn btn-small"
                              style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none' }}
                              disabled={statusMutation.isPending}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
      const res = await fetch(`https://api-f6x7qpormq-uc.a.run.app/api/admin/stories/${id}`, {
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
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to submit a story.');
      }
      const token = await user.getIdToken();
      const uid = user.uid;

      console.time('⏱️ TOTAL submission');
      console.time('⏱️ 1. Image compression + upload');
      // Launch all uploads in parallel (cover + chapters)
      const coverUploadPromise = (metadata.coverInputType === 'file' && metadata.coverImageFile)
        ? uploadFile(metadata.coverImageFile, `users/${uid}/covers/${Date.now()}_${metadata.coverImageFile.name}`)
        : Promise.resolve(metadata.coverImageUrl);

      const chapterUploadPromises = chapters.map(async (chapter, idx) => {
        let finalImageUrl = chapter.imageUrl;
        if (chapter.imageInputType === 'file' && chapter.imageFile) {
          finalImageUrl = await uploadFile(
            chapter.imageFile,
            `users/${uid}/chapters/${Date.now()}_${idx}_${chapter.imageFile.name}`
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

      
      const url = isEditMode 
        ? `https://api-f6x7qpormq-uc.a.run.app/api/admin/stories/${storyId}`
        : 'https://api-f6x7qpormq-uc.a.run.app/api/admin/stories/submit';
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
                <option value="sci-fi">Sci-fi</option>
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

function StoryDetailView({ storyId, isAdmin, onBack, onEdit }: { storyId: string, isAdmin: boolean, onBack: () => void, onEdit: (id: string) => void }) {
  const queryClient = useQueryClient();

  const [modalState, setModalState] = useState<{ isOpen: boolean, type: 'confirm' | 'success' | 'error', message: string }>({
    isOpen: false,
    type: 'confirm',
    message: ''
  });

  const { data: story, isLoading, error } = useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`https://api-f6x7qpormq-uc.a.run.app/api/admin/stories/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch story details');
      return res.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`https://api-f6x7qpormq-uc.a.run.app/api/admin/stories/${storyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to delete story');
      }
      return storyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      setModalState({
        isOpen: true,
        type: 'success',
        message: 'Story successfully deleted.'
      });
    },
    onError: (error: any) => {
      setModalState({
        isOpen: true,
        type: 'error',
        message: error.message || 'Failed to delete story'
      });
    }
  });

  const confirmDelete = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    deleteMutation.mutate();
  };

  if (isLoading) return <FullPageLoader message="Loading story..." />;
  if (error) return <div style={{ color: '#e74c3c', padding: '2rem', textAlign: 'center' }}>Error: {(error as Error).message}</div>;
  if (!story) return <div style={{ padding: '2rem', textAlign: 'center' }}>Story not found</div>;

  const isApproved = story.status === 'approved';
  const canEditDelete = isAdmin || !isApproved;

  return (
    <div className="dashboard-view section-card">
      <Modal 
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.type === 'confirm' ? 'Delete Story' : modalState.type === 'success' ? 'Success' : 'Error'}
        message={modalState.message}
        onConfirm={modalState.type === 'confirm' ? confirmDelete : () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          if (modalState.type === 'success') onBack();
        }}
        onCancel={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        showCancel={modalState.type === 'confirm'}
        confirmText={modalState.type === 'confirm' ? 'Delete' : 'OK'}
      />
      
      {deleteMutation.isPending && <FullPageLoader message="Deleting story..." />}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={onBack} className="btn btn-secondary btn-icon" style={{ borderRadius: '50%', width: '40px', height: '40px', padding: 0, color: 'var(--text-dark)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ margin: 0, flex: 1, textAlign: 'left', background: 'none', WebkitBackgroundClip: 'initial', WebkitTextFillColor: 'initial', color: 'var(--text-dark)' }}>Story Details</h1>
        {canEditDelete && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => onEdit(storyId)} className="btn btn-secondary">
              <Edit size={16} /> Edit
            </button>
            <button onClick={() => setModalState({ isOpen: true, type: 'confirm', message: 'Are you sure you want to delete this story?' })} className="btn btn-primary" style={{ backgroundColor: '#e74c3c', border: 'none', boxShadow: 'none' }}>
              <Trash size={16} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="chapter-block" style={{ display: 'flex', gap: '2rem' }}>
        {story.coverImageUrl && (
          <img src={story.coverImageUrl} alt="Cover" style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '12px' }} />
        )}
        <div>
          <h2>{story.title}</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-dark)' }}>{story.genre}</span>
            <span className="badge" style={{
              backgroundColor: story.status === 'approved' ? '#2ecc71' : story.status === 'rejected' ? '#e74c3c' : '#f39c12',
              color: 'white'
            }}>
              {story.status?.toUpperCase() || 'UNKNOWN'}
            </span>
            <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-dark)' }}>{story.readingTime} min read</span>
            <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--text-dark)' }}>Ages {story.ageRange?.min}-{story.ageRange?.max}</span>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{story.description}</p>
        </div>
      </div>

      <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Chapters</h3>
      {story.chapters?.map((chapter: any, idx: number) => (
        <div key={idx} className="chapter-block" style={{ marginBottom: '1.5rem' }}>
          <div className="chapter-header">
            <h3>Chapter {chapter.chapterNumber}: {chapter.title}</h3>
          </div>
          {chapter.imageUrl && (
            <img src={chapter.imageUrl} alt={`Chapter ${chapter.chapterNumber}`} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', marginBottom: '1rem' }} />
          )}
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
            {chapter.content || chapter.rawText}
          </div>
        </div>
      ))}
    </div>
  );
}
