'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import { PROFILE_TOKENS as T, PROFILE, MESSAGES, STATUS_CODES } from '@/lib/constants';

interface UserProfile {
  user_id: string;
  name: string;
  username: string | null;
  email: string;
  bio: string | null;
  location: string | null;
  timezone: string | null;
  currently_working_on: string | null;
  avatar_url: string | null;
  github_id: string | null;
}

interface Language {
  name: string;
  percentage: number;
}

interface Repo {
  name: string;
  html_url: string;
}

interface Contribution {
  date: string;
  count: number;
}

const ProfilePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    location: '',
    timezone: '',
    currently_working_on: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchProfile(token);
  }, [router]);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setFormData({
          name: data.user.name || '',
          username: data.user.username || '',
          bio: data.user.bio || '',
          location: data.user.location || '',
          timezone: data.user.timezone || '',
          currently_working_on: data.user.currently_working_on || ''
        });

        const githubToken = localStorage.getItem('github_token');
        if (githubToken) {
          fetchGithubData(githubToken);
        }
      } else {
        setToast({ message: data.message || MESSAGES.ERROR.PROFILE_NOT_FOUND, type: 'error' });
      }
    } catch (error) {
      setToast({ message: MESSAGES.ERROR.SERVER_ERROR, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGithubData = async (githubToken: string) => {
    try {
      const headers = { 'x-github-token': githubToken };
      
      const [langRes, repoRes, contribRes] = await Promise.all([
        fetch('/api/github/languages', { headers }),
        fetch('/api/github/repos', { headers }),
        fetch('/api/github/contributions', { headers })
      ]);

      const [langData, repoData, contribData] = await Promise.all([
        langRes.json(),
        repoRes.json(),
        contribRes.json()
      ]);

      if (langData.success) setLanguages(langData.languages);
      if (repoData.success) setRepos(repoData.repos.slice(0, 3));
      if (contribData.success) setContributions(contribData.contributions);
    } catch (error) {
      console.error('Failed to fetch GitHub data:', error);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setToast({ message: MESSAGES.SUCCESS.PROFILE_UPDATED, type: 'success' });
        setUser({ ...user!, ...formData });
        setIsEditing(false);
      } else {
        setToast({ message: data.message || MESSAGES.ERROR.PROFILE_UPDATE_FAILED, type: 'error' });
      }
    } catch (error) {
      setToast({ message: MESSAGES.ERROR.SERVER_ERROR, type: 'error' });
    }
  };

  const getContributionColor = (count: number) => {
    if (count === 0) return '#1a2035';
    if (count <= 2) return '#3730a3';
    if (count <= 5) return '#4f46e5';
    if (count <= 9) return '#6d5bff';
    return '#c6c0ff';
  };

  const renderContributionMatrix = () => {
    const githubToken = localStorage.getItem('github_token');
    
    // If not connected, show placeholder
    const displayData = githubToken && contributions.length > 0 
      ? contributions 
      : Array.from({ length: 364 }, (_, i) => ({ count: Math.floor(Math.random() * 2) }));

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)', gap: '2px' }}>
        {displayData.map((day, i) => (
          <div
            key={i}
            style={{
              backgroundColor: getContributionColor(day.count),
              borderRadius: '2px',
              aspectRatio: '1'
            }}
            title={day.date ? `${day.date}: ${day.count} contributions` : ''}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center" style={{ background: T.background, color: T.onSurface }}>Loading Profile...</div>;
  }

  return (
    <div style={{ background: T.background, height: '100vh', color: T.onSurface, fontFamily: 'Poppins, sans-serif', overflow: 'hidden' }}>
      <Navbar />
      
      <main style={{ 
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '4fr 4fr auto',
        gap: '16px',
        height: 'calc(100vh - 64px - 32px)',
        overflow: 'hidden'
      }}>
        
        {/* LEFT CARD — Profile Info */}
        <div style={{ 
          background: T.surface,
          border: `1px solid ${T.outlineVariant}`,
          borderRadius: '16px',
          padding: '24px',
          gridRow: 'span 2',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflow: 'hidden'
        }}>
          {/* AVATAR */}
          <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: T.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: 700, color: 'white'
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ 
              width: '12px', height: '12px', background: T.success, border: `2px solid ${T.surface}`,
              borderRadius: '50%', position: 'absolute', bottom: '4px', right: '4px'
            }} />
          </div>

          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: T.onSurface }}>{user?.name}</div>
            <div style={{ fontSize: '13px', color: T.primary }}>
              {user?.username ? `@${user.username}` : <span style={{ opacity: 0.5 }}>{PROFILE.NO_USERNAME}</span>}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: T.onSurfaceVariant, lineHeight: '1.6' }}>
            {user?.bio || <span style={{ opacity: 0.5 }}>{PROFILE.NO_BIO}</span>}
          </div>

          {user?.currently_working_on && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: T.outline, textTransform: 'uppercase' }}>
                CURRENTLY WORKING ON
              </div>
              <Badge label={user.currently_working_on} variant="project" />
            </div>
          )}

          {(user?.location || user?.timezone) && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: T.onSurfaceVariant }}>
              {user.location && <span>📍 {user.location}</span>}
              {user.timezone && <span>🕐 {user.timezone}</span>}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <Button onClick={() => setIsEditing(true)} fullWidth>
              ✏ Edit Profile
            </Button>
          </div>
        </div>

        {/* RIGHT TOP CARD — Core Tech Stack */}
        <div style={{ 
          background: T.surface,
          border: `1px solid ${T.outlineVariant}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: T.primary, fontSize: '16px' }}>{'{ }'}</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 700, color: T.onSurface, textTransform: 'uppercase' }}>
              {PROFILE.TECH_STACK_TITLE}
            </span>
          </div>

          {localStorage.getItem('github_token') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {languages.length > 0 ? (
                languages.slice(0, 3).map((lang) => (
                  <div key={lang.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px' }}>{lang.name}</span>
                      <span style={{ fontSize: '12px', color: T.primary }}>{lang.percentage}%</span>
                    </div>
                    <div style={{ height: '4px', background: T.surfaceHigh, borderRadius: '2px' }}>
                      <div style={{ 
                        height: '100%', width: `${lang.percentage}%`, background: T.primary, borderRadius: '2px' 
                      }} />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: T.outline, fontSize: '13px', textAlign: 'center', padding: '10px' }}>Loading languages...</div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: T.outline, fontSize: '13px' }}>
              {PROFILE.CONNECT_GITHUB}
            </div>
          )}
        </div>

        {/* RIGHT BOTTOM CARD — Active Projects */}
        <div style={{ 
          background: T.surface,
          border: `1px solid ${T.outlineVariant}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>📁</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 700, color: T.onSurface, textTransform: 'uppercase' }}>
              {PROFILE.PROJECTS_TITLE}
            </span>
          </div>

          {localStorage.getItem('github_token') ? (
            <div>
              {repos.length > 0 ? (
                repos.slice(0, 3).map((repo) => (
                  <a 
                    key={repo.name} 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      background: T.surfaceHigh, borderRadius: '8px', padding: '10px 14px', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit'
                    }}
                  >
                    <span style={{ color: T.outline }}>📁</span>
                    <span style={{ fontSize: '13px' }}>{repo.name}</span>
                  </a>
                ))
              ) : (
                <div style={{ color: T.outline, fontSize: '13px', textAlign: 'center', padding: '10px' }}>No active projects found</div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: T.outline, fontSize: '13px' }}>
              {PROFILE.CONNECT_GITHUB}
            </div>
          )}
        </div>

        {/* BOTTOM CARD — Contribution Matrix */}
        <div style={{ 
          background: T.surface,
          border: `1px solid ${T.outlineVariant}`,
          borderRadius: '16px',
          padding: '20px',
          gridColumn: 'span 2'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 700, color: T.onSurface, textTransform: 'uppercase' }}>
                {PROFILE.CONTRIBUTION_TITLE}
              </div>
              <div style={{ fontSize: '12px', color: T.onSurfaceVariant, marginTop: '4px', opacity: 0.7 }}>
                {PROFILE.CONTRIBUTION_SUBTITLE}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: T.outline }}>
              <span>LESS</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[0, 2, 5, 9, 10].map(c => (
                  <div key={c} style={{ width: '10px', height: '10px', background: getContributionColor(c), borderRadius: '2px' }} />
                ))}
              </div>
              <span>MORE</span>
            </div>
          </div>

          {renderContributionMatrix()}
        </div>

      </main>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div style={{ 
          background: 'rgba(0,0,0,0.7)', position: 'fixed', inset: 0, zIndex: 50, 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <div style={{ 
            background: T.surface, border: `1px solid ${T.outlineVariant}`, borderRadius: '16px',
            padding: '32px', width: '480px', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: T.onSurface }}>{PROFILE.EDIT_TITLE}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input 
                label="Name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Your name"
              />
              <Input 
                label="Username" 
                value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value})} 
                placeholder="username"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: T.outline }}>Bio</label>
                <textarea 
                  value={formData.bio} 
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Tell us about yourself"
                  style={{ 
                    background: T.surfaceHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: '8px',
                    padding: '12px', color: T.onSurface, fontSize: '14px', minHeight: '100px', resize: 'none'
                  }}
                />
              </div>
              <Input 
                label="Location" 
                value={formData.location} 
                onChange={(e) => setFormData({...formData, location: e.target.value})} 
                placeholder="e.g. San Francisco, CA"
              />
              <Input 
                label="Timezone" 
                value={formData.timezone} 
                onChange={(e) => setFormData({...formData, timezone: e.target.value})} 
                placeholder="e.g. UTC-8"
              />
              <Input 
                label="Currently Working On" 
                value={formData.currently_working_on} 
                onChange={(e) => setFormData({...formData, currently_working_on: e.target.value})} 
                placeholder="Project name"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <Button onClick={() => setIsEditing(false)} variant="outline" fullWidth>
                {PROFILE.CANCEL_BTN}
              </Button>
              <Button onClick={handleSave} fullWidth>
                {PROFILE.SAVE_BTN}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        body {
          margin: 0;
          font-family: 'Poppins', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
