'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import { PROFILE_TOKENS as T, PROFILE, MESSAGES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useUIStore } from '@/store/uiStore';

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", 
  "France", "India", "Japan", "Brazil", "Netherlands", "Singapore", "Other"
];

const ProfilePage = () => {
  const router = useRouter();
  const { user, token, githubToken, updateUser, isAuthenticated, _hasHydrated } = useAuthStore();
  const { 
    languages, 
    repos, 
    contributions, 
    githubLoading, 
    fetchGithubData 
  } = useProfileStore();
  const { showToast } = useUIStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    timezone: ''
  });

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (token) {
          const res = await fetch('/api/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();

          if (data.success) {
            updateUser(data.user);
            setFormData({
              name: data.user.name || '',
              bio: data.user.bio || '',
              location: data.user.location || '',
              timezone: data.user.timezone || ''
            });

            if (githubToken) {
              await fetchGithubData(token, githubToken);
            }
          }
        }
      } catch (error) {
        showToast(MESSAGES.ERROR.SERVER_ERROR, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token, githubToken, isAuthenticated, router, updateUser, fetchGithubData, showToast, _hasHydrated]);

  useEffect(() => {
    document.body.style.overflow = isEditing ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isEditing]);

  const handleProjectClick = (repo: any) => {
    if (repo.html_url === '#') return;
    localStorage.setItem('review_selected_repo', JSON.stringify(repo));
    localStorage.setItem('review_active_tab', 'github');
    router.push('/review?tab=github');
  };

  const handleSave = async () => {
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
        showToast(MESSAGES.SUCCESS.PROFILE_UPDATED, 'success');
        updateUser(formData);
        setIsEditing(false);
      } else {
        showToast(data.message || MESSAGES.ERROR.PROFILE_UPDATE_FAILED, 'error');
      }
    } catch (error) {
      showToast(MESSAGES.ERROR.SERVER_ERROR, 'error');
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
    const displayData = (githubToken && contributions.length > 0) 
      ? contributions 
      : (githubToken 
          ? Array.from({ length: 364 }, () => ({ count: 0, date: '' }))
          : Array.from({ length: 364 }, () => ({ count: Math.floor(Math.random() * 2), date: '' }))
        );

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

  return (
    <div className="min-h-screen font-poppins" style={{ background: T.background, color: T.onSurface }}>
      <Navbar />
      
      <main style={{ 
        maxWidth: 1350, 
        marginLeft: '40px', 
        marginRight: '40px', 
        padding: '24px 0',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        
        {/* LEFT CARD — Profile Info */}
        <div style={{ 
          background: T.surface,
          border: `1px solid ${T.outlineVariant}`,
          borderRadius: '16px',
          padding: '24px',
          gridRow: '1 / span 2',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* AVATAR */}
          <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '32px', fontWeight: 700, color: 'white', border: `1px solid ${T.outlineVariant}`
              }}>
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ 
              width: '12px', height: '12px', background: T.success, border: `2px solid ${T.surface}`,
              borderRadius: '50%', position: 'absolute', bottom: '4px', right: '4px'
            }} />
          </div>

          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{user?.name || ''}</div>
            <div style={{ fontSize: '14px', color: T.outline }}>
              {user?.email || ''}
            </div>
          </div>

          <div style={{ fontSize: '13px', color: T.onSurfaceVariant, lineHeight: '1.6', minHeight: '40px' }}>
            {user?.bio || (isLoading ? 'Loading bio...' : '')}
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: T.onSurfaceVariant }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📍 {user?.location || '---'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🕐 {user?.timezone || '--:--'}</span>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <Button 
              label="✏ Edit Profile"
              onClick={() => setIsEditing(true)} 
              variant="outline" 
              fullWidth 
            />
          </div>
        </div>

        {/* RIGHT TOP CARD — Core Tech Stack */}
        <div style={{ 
          background: T.surface,
          border: `1px solid ${T.outlineVariant}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: '#a78bfa', fontSize: '16px' }}>{'{ }'}</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
              {PROFILE.TECH_STACK_TITLE}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              if (githubToken && languages.length === 0 && githubLoading) {
                return <div style={{ fontSize: '12px', color: T.outline, padding: '20px 0' }}>Updating tech stack...</div>;
              }

              const displayLanguages = (githubToken && languages.length > 0) ? languages.slice(0, 3) : [
                { name: 'JavaScript', percentage: 92 },
                { name: 'Python', percentage: 85 },
                { name: 'React', percentage: 78 }
              ];

              return displayLanguages.map((lang) => (
                <div key={lang.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'white' }}>{lang.name}</span>
                    <span style={{ fontSize: '12px', color: '#a78bfa' }}>{lang.percentage}%</span>
                  </div>
                  <div style={{ height: '4px', background: T.surfaceHigh, borderRadius: '2px' }}>
                    <div style={{ 
                      height: '100%', width: `${lang.percentage}%`, background: '#8b5cf6', borderRadius: '2px' 
                    }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* RIGHT BOTTOM CARD — Active Projects */}
        <div style={{ 
          background: T.surface,
          border: `1px solid ${T.outlineVariant}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>📁</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
              {PROFILE.PROJECTS_TITLE}
            </span>
          </div>

          <div>
            {(() => {
              if (githubToken && repos.length === 0 && githubLoading) {
                return <div style={{ fontSize: '12px', color: T.outline, padding: '20px 0' }}>Fetching repositories...</div>;
              }

              const displayRepos = (githubToken && repos.length > 0) ? repos.slice(0, 2) : [
                { name: 'portfolio-v2', html_url: '#' },
                { name: 'ai-code-reviewer', html_url: '#' }
              ];

              return displayRepos.map((repo) => (
                <div 
                  key={repo.name} 
                  onClick={() => handleProjectClick(repo)}
                  style={{ 
                    background: T.surfaceHigh, borderRadius: '8px', padding: '10px 14px', marginBottom: '8px',
                    display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit',
                    border: `1px solid transparent`, transition: 'border 0.2s', cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.border = `1px solid ${T.outlineVariant}`}
                  onMouseLeave={(e) => e.currentTarget.style.border = `1px solid transparent`}
                >
                  <span style={{ color: T.outline }}>📁</span>
                  <span style={{ fontSize: '13px', color: 'white', fontWeight: 500 }}>{repo.name}</span>
                </div>
              ));
            })()}
          </div>
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
          <div 
            className="no-scrollbar"
            style={{ 
              background: T.surface, border: `1px solid ${T.outlineVariant}`, borderRadius: '16px',
              padding: '32px', width: '480px', maxHeight: '80vh', overflowY: 'auto',
              scrollBehavior: 'smooth'
            }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: T.onSurface }}>{PROFILE.EDIT_TITLE}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input 
                label="Name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Your name"
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: T.outline }}>Country</label>
                <select 
                  value={formData.location} 
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  style={{ 
                    background: T.surfaceHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: '8px',
                    padding: '12px', color: T.onSurface, fontSize: '14px', outline: 'none'
                  }}
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: T.outline }}>Local Time</label>
                <input 
                  type="time"
                  value={formData.timezone} 
                  onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                  style={{ 
                    background: T.surfaceHigh, border: `1px solid ${T.outlineVariant}`, borderRadius: '8px',
                    padding: '12px', color: T.onSurface, fontSize: '14px', outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <Button 
                label={PROFILE.CANCEL_BTN}
                onClick={() => setIsEditing(false)} 
                variant="outline" 
                fullWidth 
              />
              <Button 
                label={PROFILE.SAVE_BTN}
                onClick={handleSave} 
                fullWidth 
              />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        body {
          margin: 0;
          font-family: 'Poppins', sans-serif;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
