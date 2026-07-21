import { useState } from 'react';
import { LogIn, LogOut, Plus, Trash2, Send, BookOpen } from 'lucide-react';
import './App.css'; // Just keeping it in case, but index.css has the main styles

interface Chapter {
  number: number;
  title: string;
  imageUrl: string;
  content: string;
}

interface StoryMetadata {
  title: string;
  genre: string;
  readingTime: string;
  description: string;
  ageMin: string;
  ageMax: string;
  coverImage: string;
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin();
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
            placeholder="admin@stela.com"
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
        <div className="login-btn-container">
          <button type="submit" className="btn btn-primary">
            <LogIn size={20} />
            Log In
          </button>
        </div>
      </form>
    </div>
  );
}

function DashboardView({ onLogout }: { onLogout: () => void }) {
  const [metadata, setMetadata] = useState<StoryMetadata>({
    title: '',
    genre: 'contemporary',
    readingTime: '',
    description: '',
    ageMin: '',
    ageMax: '',
    coverImage: ''
  });

  const [chapters, setChapters] = useState<Chapter[]>([
    { number: 1, title: '', imageUrl: '', content: '' }
  ]);

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  const handleChapterChange = (index: number, field: keyof Chapter, value: string) => {
    setChapters(prev => {
      const newChapters = [...prev];
      newChapters[index] = { ...newChapters[index], [field]: value };
      return newChapters;
    });
  };

  const addChapter = () => {
    setChapters(prev => [
      ...prev,
      { number: prev.length + 1, title: '', imageUrl: '', content: '' }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...metadata,
      readingTime: parseInt(metadata.readingTime) || 0,
      ageMin: parseInt(metadata.ageMin) || 0,
      ageMax: parseInt(metadata.ageMax) || 0,
      chapters
    };
    console.log('Story Submission Payload:', JSON.stringify(payload, null, 2));
    alert('Story submitted successfully! Check console for JSON payload.');
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
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              maxLength={200}
              placeholder="A short summary of the story..."
              value={metadata.description}
              onChange={handleMetadataChange}
              required
            />
            <p className="help-text">{metadata.description.length}/200 characters</p>
          </div>

          <div className="form-group">
            <label htmlFor="coverImage">Main Cover Image URL (Optional)</label>
            <input
              id="coverImage"
              name="coverImage"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={metadata.coverImage}
              onChange={handleMetadataChange}
            />
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
                <label>Chapter Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/chapter-img.jpg"
                  value={chapter.imageUrl}
                  onChange={(e) => handleChapterChange(index, 'imageUrl', e.target.value)}
                />
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
          <button type="submit" className="btn btn-primary">
            <Send size={20} />
            Submit Story
          </button>
        </div>
      </form>
    </div>
  );
}
