'use client';
import { useState, useEffect } from 'react';
import { X, Check, ChevronRight, Music2, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const GENRES = [
  'Afrobeats','Bongo Flava','Hip-Hop','R&B','Pop',
  'Gospel','Jazz','Rock','Electronic','Reggae','Classical',
];

const GENRE_ARTISTS: Record<string, string[]> = {
  'Afrobeats':   ['Burna Boy','Wizkid','Davido','Rema','Tems','Ckay','Asake'],
  'Bongo Flava': ['Diamond Platnumz','Harmonize','Rayvanny','Zuchu','Ali Kiba'],
  'Hip-Hop':     ['Drake','Kendrick Lamar','J. Cole','Travis Scott','21 Savage'],
  'R&B':         ['The Weeknd','SZA','Frank Ocean','H.E.R.','Jhené Aiko'],
  'Pop':         ['Taylor Swift','Ed Sheeran','Dua Lipa','Harry Styles','Billie Eilish'],
  'Gospel':      ['Kirk Franklin','Hillsong','Maverick City','Sinach','Mercy Chinwo'],
  'Jazz':        ['Miles Davis','John Coltrane','Norah Jones','Diana Krall'],
  'Rock':        ['Coldplay','Imagine Dragons','Linkin Park','Arctic Monkeys'],
  'Electronic':  ['Avicii','Calvin Harris','Martin Garrix','Marshmello','Kygo'],
  'Reggae':      ['Bob Marley','Chronixx','Popcaan','Kabaka Pyramid'],
  'Classical':   ['Mozart','Beethoven','Bach','Chopin','Debussy'],
};

export default function OnboardingModal() {
  const { user } = useAuthStore();
  const [show,           setShow]           = useState(false);
  const [step,           setStep]           = useState<1 | 2>(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedArtists,setSelectedArtists]= useState<string[]>([]);
  const [saving,         setSaving]         = useState(false);

  useEffect(() => {
    if (!user) return;
    // Check if onboarding already done
    api.get('/users/preferences')
      .then(r => { if (!r.data.completed) setShow(true); })
      .catch(() => {});
  }, [user]);

  const availableArtists = selectedGenres
  .flatMap(g => GENRE_ARTISTS[g] || [])
  .filter((a, i, arr) => arr.indexOf(a) === i);

  const toggleGenre = (g: string) => {
    setSelectedGenres(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
    // Remove artists from deselected genre
    setSelectedArtists(prev =>
      prev.filter(a => selectedGenres
        .filter(x => x !== g)
        .flatMap(x => GENRE_ARTISTS[x] || [])
        .includes(a)
      )
    );
  };

  const toggleArtist = (a: string) =>
    setSelectedArtists(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );

  const handleNext = () => {
    if (selectedGenres.length === 0) return;
    setStep(2);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Find artist IDs from DB for selected artist names
      await api.post('/users/preferences', {
        genres:     selectedGenres,
        artist_ids: [],           // names stored in genres for recommendations
        artist_names: selectedArtists,
      });
      setShow(false);
    } catch {
      setShow(false); // dismiss anyway
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      await api.post('/users/preferences', { genres: [], artist_ids: [], artist_names: [] });
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-yellow-400" />
            <span className="text-xs text-white/40 font-semibold uppercase tracking-widest">
              Step {step} of 2
            </span>
          </div>
          <h2 className="text-xl font-black">
            {step === 1 ? 'What do you listen to?' : 'Pick your favourite artists'}
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {step === 1
              ? 'Choose genres you love — we\'ll personalise your experience'
              : 'Select artists you enjoy — helps us recommend better music'
            }
          </p>
          {/* Progress bar */}
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
          <button onClick={handleSkip}
            className="absolute top-5 right-5 text-white/20 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2 max-h-72 overflow-y-auto">
          {step === 1 ? (
            <div className="flex flex-wrap gap-2 py-2">
              {GENRES.map(g => {
                const selected = selectedGenres.includes(g);
                return (
                  <button key={g} onClick={() => toggleGenre(g)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      selected
                        ? 'bg-white text-black scale-105'
                        : 'bg-white/[0.07] text-white/60 hover:bg-white/10 hover:text-white'
                    }`}>
                    {selected && <Check size={12} className="inline mr-1" />}
                    {g}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 py-2">
              {availableArtists.length === 0 ? (
                <p className="text-white/30 text-sm">No artists found for selected genres</p>
              ) : availableArtists.map(a => {
                const selected = selectedArtists.includes(a);
                return (
                  <button key={a} onClick={() => toggleArtist(a)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      selected
                        ? 'bg-white text-black scale-105'
                        : 'bg-white/[0.07] text-white/60 hover:bg-white/10 hover:text-white'
                    }`}>
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      {selected
                        ? <Check size={10} className="text-black" />
                        : <Music2 size={9} className="text-white/50" />
                      }
                    </div>
                    {a}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <button onClick={handleSkip}
            className="text-sm text-white/30 hover:text-white/60 transition-colors">
            Skip for now
          </button>
          {step === 1 ? (
            <button onClick={handleNext} disabled={selectedGenres.length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                selectedGenres.length > 0
                  ? 'bg-white text-black hover:opacity-90 active:scale-95'
                  : 'bg-white/10 text-white/20 cursor-not-allowed'
              }`}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white text-black hover:opacity-90 active:scale-95 transition-all">
              {saving ? 'Saving...' : (
                <><Sparkles size={14} /> Let\'s go!</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
