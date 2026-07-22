import { useState } from 'react';
import { LogIn, LogOut, Plus, Trash2, Send, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { storage, auth } from './firebase';
import './App.css'; // Just keeping it in case, but index.css has the main styles

interface Chapter {
  number: number;
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
  coverImage: string;
  coverImageFile: File | null;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="app-container">
      {!isLoggedIn ? (
        <LoginView onLogin={() => setIsLoggedIn(true)} />
      ) : (
        <DashboardView onLogout={() => setIsLoggedIn(false)} />
      )}
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

function DashboardView({ onLogout }: { onLogout: () => void }) {
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
    coverInputType: 'file',
    coverImage: '',
    coverImageFile: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [chapters, setChapters] = useState<Chapter[]>([
    { number: 1, title: '', imageInputType: 'file', imageUrl: '', imageFile: null, content: '' }
  ]);

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
      { number: prev.length + 1, title: '', imageInputType: 'file', imageUrl: '', imageFile: null, content: '' }
    ]);
  };

  const removeChapter = (index: number) => {
    if (chapters.length > 1) {
      setChapters(prev => {
        const newChapters = prev.filter((_, i) => i !== index);
        // Re-number chapters sequentially
        return newChapters.map((ch, i) => ({ ...ch, number: i + 1 }));
      });
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Handle Main Cover Upload
      let finalCoverUrl = metadata.coverImage;
      if (metadata.coverInputType === 'file' && metadata.coverImageFile) {
        finalCoverUrl = await uploadFile(
          metadata.coverImageFile, 
          `covers/${Date.now()}_${metadata.coverImageFile.name}`
        );
      }

      // 2. Handle Chapter Image Uploads
      const processedChapters = await Promise.all(chapters.map(async (chapter, idx) => {
        let finalImageUrl = chapter.imageUrl;
        if (chapter.imageInputType === 'file' && chapter.imageFile) {
          finalImageUrl = await uploadFile(
            chapter.imageFile,
            `chapters/${Date.now()}_${idx}_${chapter.imageFile.name}`
          );
        }
        
        return {
          chapterNumber: chapter.number,
          title: chapter.title,
          imageUrl: finalImageUrl,
          content: chapter.content
        };
      }));

      // 3. Final Payload
      const payload = {
        title: metadata.title,
        genre: metadata.genre,
        description: metadata.description,
        coverImage: finalCoverUrl,
        readingTime: parseInt(metadata.readingTime) || 0,
        ageMin: parseInt(metadata.ageMin) || 0,
        ageMax: parseInt(metadata.ageMax) || 0,
        chapters: processedChapters
      };

      console.log('Story Submission Payload:', JSON.stringify(payload, null, 2));

      // 4. API Call
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to submit a story.');
      }
      const token = await user.getIdToken();
      
      const response = await fetch('https://api-f6x7qpormq-uc.a.run.app/api/stories/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        // Try to get a specific error message from the backend if possible
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Failed to submit story to the backend.');
      }
      
      // Reset form state on success
      setMetadata({
        title: '',
        genre: 'contemporary',
        readingTime: '',
        description: '',
        ageMin: '',
        ageMax: '',
        coverInputType: 'file',
        coverImage: '',
        coverImageFile: null
      });
      setChapters([
        { number: 1, title: '', imageInputType: 'file', imageUrl: '', imageFile: null, content: '' }
      ]);
      
      setModalState({
        isOpen: true,
        type: 'success',
        message: 'Story submitted successfully! Check console for JSON payload.'
      });
    } catch (error: any) {
      console.error('Error submitting story:', error);
      setModalState({
        isOpen: true,
        type: 'error',
        message: error.message || 'Failed to submit story. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-view">
      <div className="dashboard-header">
        <div>
          <h1>Submit a Story</h1>
          <p>Add a new magical tale to the Stela library</p>
        </div>
        <button onClick={onLogout} className="logout-btn">
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <form onSubmit={handleSubmit}>
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
                value={metadata.coverImage}
                onChange={(e) => setMetadata(prev => ({ ...prev, coverImage: e.target.value }))}
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
                <h3>Chapter {chapter.number}</h3>
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
        <div className="submit-container">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            <Send size={20} />
            {isSubmitting ? 'Submitting...' : 'Submit Story'}
          </button>
        </div>
      </form>

      {modalState.isOpen && (
        <div className="modal-overlay">
          <div className={`modal-content ${modalState.type}`}>
            {modalState.type === 'success' ? (
              <CheckCircle size={56} className="modal-icon success-icon" />
            ) : (
              <XCircle size={56} className="modal-icon error-icon" />
            )}
            <h3>{modalState.type === 'success' ? 'Success!' : 'Oops! Something went wrong'}</h3>
            <p>{modalState.message}</p>
            <button onClick={() => setModalState({ ...modalState, isOpen: false })} className="btn btn-primary mt-4">
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
