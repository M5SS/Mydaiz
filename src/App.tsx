import React, { useState, useEffect, ReactNode } from 'react';
import { useAuth, useDailyData, useHistory, useUserSettings } from './hooks/useFirebase';
import { auth } from './lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { format, addDays, subDays, isToday, isBefore, isAfter, startOfDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Settings, 
  History, 
  LogOut, 
  Flower2, 
  Star,
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  Languages,
  Edit2,
  Check,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { cn } from './lib/utils';

// Utility for gentle sound effect
const playBloomSound = () => {
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Create a gentle, blooming "ping" sound
    osc.type = 'sine';
    // Start at a pleasant frequency (E5) and slide up slightly to B5 for an "encouraging" lift
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.4);
    
    // Smooth volume envelope to avoid clicks
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    
    // Close context after playback to save resources
    setTimeout(() => {
      ctx.close();
    }, 1000);
  } catch (e) {
    // Fail silently if audio is blocked or unsupported
    console.warn("Audio playback failed", e);
  }
};

const THEMES = [
  { id: 'rose', name: { en: 'Rose Bloom', fr: 'Éclosion Rose' }, color: 'rose' },
  { id: 'sky', name: { en: 'Azure Sky', fr: 'Ciel Azur' }, color: 'sky' },
  { id: 'emerald', name: { en: 'Emerald Garden', fr: 'Jardin Émeraude' }, color: 'emerald' },
  { id: 'amber', name: { en: 'Golden Glow', fr: 'Lueur Dorée' }, color: 'amber' },
  { id: 'violet', name: { en: 'Violet Dream', fr: 'Rêve Violet' }, color: 'violet' },
  { id: 'slate', name: { en: 'Midnight Slate', fr: 'Ardoise Nuit' }, color: 'slate' },
];

const translations = {
  en: {
    appName: "My DaiZ",
    tagline: "Capture your daily radiance. ✨",
    signIn: "Join the Garden",
    daily: "Today's DaiZ",
    history: "Magic",
    settings: "Garden Rules",
    gardener: "Daily Gardener",
    logout: "Leave the Garden",
    hello: "Hello",
    howDay: "How is your beautiful day going?",
    checklist: "Daily Checklist",
    today: "Today",
    emptyGarden: "Your garden is empty today.",
    addPetal: "Add a custom petal...",
    glowPoints: "Glow Points",
    quietHarmony: "Quiet Harmony",
    radiantJoy: "Radiant Joy",
    eveningNotes: "Evening Notes",
    reflectionPlaceholder: "What made you smile today?...",
    preserve: "Preserve Today",
    spark: "Daily Spark",
    quote: "Your joy is the most precious petal in the garden. Keep blooming!",
    harvest: "The Harvest",
    harvestTag: "Flipping through your radiant memories.",
    back: "Take me back",
    rules: "Garden Rules",
    rulesTag: "Define the petals that bloom every single morning.",
    corePetal: "Add a core petal...",
    language: "Language",
    swipeTip: "Swipe right to complete →",
    totalGlow: "Total Glow",
    perfectDays: "Perfect Days",
    harvests: "Harvests",
    radiant: "Radiant",
    onboardingTitle: "Welcome to your Garden",
    onboardingSub: "Let's get to know you to personalize your rituals.",
    ageLabel: "Your stage of life",
    spiritualityLabel: "Your spirituality",
    morningGreeting: "Good Morning",
    afternoonGreeting: "Good Afternoon",
    eveningGreeting: "Good Evening",
    nightGreeting: "Good Night",
    locationLabel: "Your location",
    secular: "Secular Wisdom",
    teen: "Under 20",
    adult: "20 - 60 years",
    senior: "Over 60",
    core: "Core",
    france: "France",
    usa: "USA",
    other: "Other",
    save: "Save",
    reminder: "Reminder",
    setReminder: "Set Reminder",
    reminderSet: "Reminder set for",
    notificationTitle: "Time to Bloom!",
    notificationBody: "It's time for your habit: ",
    saveNote: "Save Note",
    noteSaved: "Note saved!",
    chooseTheme: "Color Palette",
    themeTag: "Drench your garden in your favorite hues.",
  },
  fr: {
    appName: "My DaiZ",
    tagline: "Capturez l'éclat de votre journée. ✨",
    signIn: "Entrer dans le jardin",
    daily: "Aujourd'hui",
    history: "Magie",
    settings: "Mes Pétales",
    gardener: "Jardinier du jour",
    logout: "Quitter le jardin",
    hello: "Bonjour",
    howDay: "Comment se passe votre belle journée ?",
    checklist: "Liste du jour",
    today: "Aujourd'hui",
    emptyGarden: "Votre jardin est vide aujourd'hui.",
    addPetal: "Ajouter une pétale personnalisée...",
    glowPoints: "Éclat du jour",
    quietHarmony: "Harmonie Douce",
    radiantJoy: "Joie Radieuse",
    eveningNotes: "Réflexions du soir",
    reflectionPlaceholder: "Qu'est-ce qui vous a fait sourire aujourd'hui ?...",
    preserve: "Préserver ce jour",
    spark: "Étincelle du jour",
    quote: "Votre joie est la pétale la plus précieuse du jardin. Continuez de fleurir !",
    harvest: "La Moisson",
    harvestTag: "Feuilletez vos souvenirs éclatants.",
    back: "Revoir ce jour",
    rules: "Règles du jardin",
    rulesTag: "Définissez les pétales qui fleurissent chaque matin.",
    corePetal: "Ajouter une pétale de base...",
    language: "Langue",
    swipeTip: "Glissez vers la droite pour terminer →",
    totalGlow: "Éclat Total",
    perfectDays: "Jours Parfaits",
    harvests: "Moissons",
    radiant: "Éclatant",
    onboardingTitle: "Bienvenue dans votre Jardin",
    onboardingSub: "Commençons par faire connaissance pour personnaliser vos rituels.",
    ageLabel: "Votre étape de vie",
    spiritualityLabel: "Votre spiritualité",
    morningGreeting: "Bon Matin",
    afternoonGreeting: "Bon Après-midi",
    eveningGreeting: "Bonne Soirée",
    nightGreeting: "Douce Nuit",
    locationLabel: "Votre localisation",
    secular: "Sagesse Laïque",
    teen: "Moins de 20 ans",
    adult: "20 - 60 ans",
    senior: "Plus de 60 ans",
    core: "Essentiel",
    france: "France",
    usa: "États-Unis",
    other: "Ailleurs",
    save: "Enregistrer",
    reminder: "Rappel",
    setReminder: "Définir un rappel",
    reminderSet: "Rappel défini pour",
    notificationTitle: "C'est l'heure de fleurir !",
    notificationBody: "C'est l'heure pour votre rituel : ",
    saveNote: "Enregistrer la note",
    noteSaved: "Note enregistrée !",
    chooseTheme: "Palette de couleurs",
    themeTag: "Plongez votre jardin dans vos teintes préférées.",
  }
};

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'daily' | 'history' | 'settings'>('daily');
  const [lang, setLang] = useState<'en' | 'fr'>('fr');

  const t = translations[lang];
  const locale = lang === 'fr' ? fr : enUS;
  const [isNoteSaving, setIsNoteSaving] = useState(false);

  const { day, tasks, updateScoreAndReflection, updateNote, addTask, toggleTask, deleteTask, setTaskReminder } = useDailyData(selectedDate, user?.uid);
  const { history } = useHistory(user?.uid);
  const { settings, loading: settingsLoading, updatePredefinedTasks, updateSettings } = useUserSettings(user?.uid);
  const theme = settings.theme || 'rose';
  const tBase = THEMES.find(th => th.id === theme)?.color || 'rose';
  
  const themeColors = {
    rose: { bg: '#FFF5F7' },
    sky: { bg: '#F0F9FF' },
    emerald: { bg: '#F0FDF4' },
    amber: { bg: '#FFFBEB' },
    violet: { bg: '#F5F3FF' },
    slate: { bg: '#F8FAFC' },
  }[theme] || { bg: '#FFF5F7' };

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const joinDate = settings.joinedAt ? startOfDay(new Date(settings.joinedAt.seconds * 1000)) : startOfDay(new Date());
  const today = startOfDay(new Date());

  const canGoBack = isAfter(startOfDay(selectedDate), joinDate);
  const canGoForward = isBefore(startOfDay(selectedDate), today);
  const isPast = isBefore(startOfDay(selectedDate), today);

  const [newTaskText, setNewTaskText] = useState('');
  const [reflectionInput, setReflectionInput] = useState('');

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const calculatedScore = tasks.length > 0 
    ? Math.round((completedTasks / totalTasks) * 10) 
    : 0;

  useEffect(() => {
    if (day) {
      setReflectionInput(day.reflection || '');
    } else {
      setReflectionInput('');
    }
  }, [day, selectedDate]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleLogout = () => signOut(auth);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return (t as any).morningGreeting;
    if (hour < 18) return (t as any).afternoonGreeting;
    if (hour < 22) return (t as any).eveningGreeting;
    return (t as any).nightGreeting;
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8" style={{ backgroundColor: themeColors.bg }}>
        <motion.div 
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1] 
          }}
          transition={{ 
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className={cn("p-8 bg-white rounded-[40px] shadow-2xl shadow-opacity-10", `shadow-${tBase}-100`)}
        >
          <Flower2 className={cn("w-16 h-16", `text-${tBase}-400`)} />
        </motion.div>
        <div className="flex flex-col items-center gap-2">
          <h2 className={cn("text-2xl font-bold tracking-tighter", `text-${tBase}-600`)}>Preparing your garden...</h2>
          <div className="flex gap-1">
             {[0, 1, 2].map(i => (
               <motion.div 
                key={i}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className={cn("w-1.5 h-1.5 rounded-full", `bg-${tBase}-400`)}
               />
             ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: themeColors.bg }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md w-full"
        >
          <div className="mb-8 flex justify-center">
            <div className={cn("p-6 bg-white rounded-[40px] shadow-xl shadow-opacity-10", `shadow-${tBase}-50`)}>
              <Flower2 className={cn("w-16 h-16", `text-${tBase}-500`)} />
            </div>
          </div>
          <h1 className={cn("text-5xl font-bold mb-4", `text-${tBase}-600`)}>{t.appName}</h1>
          <p className={cn("mb-10 text-lg font-bold", `text-${tBase}-400`)}>{t.tagline}</p>
          <button
            onClick={handleLogin}
            className={cn(
              "w-full py-5 text-white rounded-3xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 shadow-opacity-20",
              `bg-${tBase}-500 hover:bg-${tBase}-600 shadow-${tBase}-100`
            )}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-6 h-6 mr-1" />
            {t.signIn}
          </button>
        </motion.div>
      </div>
    );
  }

  if (user && settings.onboardingCompleted === false) {
    return (
      <OnboardingQuiz 
        onComplete={(quizData) => {
          // Generate tasks based on quiz
          const tasks = ['Boire 2L d\'eau', 'Lire 20 minutes'];
          
          if (quizData.religion === 'Islam') {
            tasks.push('Prière du jour', 'Lire le Coran');
          } else if (quizData.religion === 'Christian') {
            tasks.push('Prière matinale', 'Lire la Bible');
          } else {
            tasks.push('Méditation', 'Journaling');
          }

          if (quizData.age === 'teen') {
            tasks.push('Étudier 1h');
          } else if (quizData.age === 'senior') {
            tasks.push('Marche tranquille');
          } else {
            tasks.push('Planifier la journée');
          }

          updateSettings({
            onboardingCompleted: true,
            quizData,
            predefinedTasks: tasks
          });
        }}
        lang={lang}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans overflow-x-hidden transition-colors duration-500" style={{ backgroundColor: themeColors.bg }}>
      <NotificationManager tasks={tasks} date={selectedDate} lang={lang} />
      <BloomCelebration active={progress === 100 && tasks.length > 0} color={tBase} />
      {/* Mobile Header */}
      <div className={cn("md:hidden flex items-center justify-between p-5 bg-white shadow-sm")}>
        <div className="flex items-center gap-2">
          <Flower2 className={cn("w-6 h-6", `text-${tBase}-500`)} />
          <span className={cn("text-2xl font-bold", `text-${tBase}-600`)}>{t.appName}</span>
        </div>
        <button onClick={() => setActiveTab('settings')} className={cn("p-2 rounded-xl bg-opacity-50", `bg-${tBase}-50 text-${tBase}-500`)}>
          <Settings size={24} />
        </button>
      </div>

      {/* Sidebar - Navigation */}
      <nav className={cn("hidden md:flex w-80 bg-white p-8 flex-col gap-10 flex-shrink-0")}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-2xl", `bg-${tBase}-50`)}>
            <Flower2 className={cn("w-8 h-8", `text-${tBase}-500`)} />
          </div>
          <span className={cn("text-3xl font-bold tracking-tight", `text-${tBase}-600`)}>{t.appName}</span>
        </div>

        <div className="flex flex-col gap-3 flex-grow">
          <NavBtn 
            active={activeTab === 'daily'} 
            onClick={() => setActiveTab('daily')} 
            icon={<Calendar size={22} />} 
            label={t.daily} 
            color={tBase}
          />
          <NavBtn 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History size={22} />} 
            label={t.history} 
            color={tBase}
          />
          <NavBtn 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<Settings size={22} />} 
            label={t.settings} 
            color={tBase}
          />
        </div>

        <div className="pt-8 flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <img 
              src={user.photoURL || ''} 
              alt={user.displayName || ''} 
              className={cn("w-12 h-12 rounded-2xl shadow-sm")}
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col overflow-hidden">
              <span className="text-base font-bold text-gray-700 truncate">{user.displayName?.split(' ')[0]}</span>
              <span className={cn("text-[10px] font-bold uppercase tracking-widest truncate", `text-${tBase}-400`)}>{t.gardener}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className={cn("flex items-center gap-2 text-sm font-bold transition-colors w-full p-2 text-gray-300", `hover:text-${tBase}-500`)}
          >
            <LogOut size={18} />
            {t.logout}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-5 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl mx-auto pb-24 md:pb-0"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div className="space-y-1">
                  <h1 className={cn("text-4xl md:text-5xl font-bold", `text-${tBase}-600`)}>{getGreeting()}, {user.displayName?.split(' ')[0]} ! ✨</h1>
                  <p className={cn("text-lg md:text-xl font-bold tracking-tight", `text-${tBase}-400`)}>{t.howDay}</p>
                </div>
                <div className={cn("bg-white px-6 py-3 rounded-2xl shadow-sm flex items-center gap-4")}>
                  <button 
                    onClick={() => canGoBack && setSelectedDate(subDays(selectedDate, 1))}
                    disabled={!canGoBack}
                    className={cn(
                      "transition-colors",
                      canGoBack ? `text-${tBase}-400 hover:text-${tBase}-500` : "text-gray-100 cursor-not-allowed"
                    )}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="text-center min-w-[120px]">
                    <div className={cn("text-[10px] uppercase tracking-widest font-bold", `text-${tBase}-400`)}>{format(selectedDate, 'EEEE', { locale })}</div>
                    <div className={cn("text-xl font-bold uppercase", `text-${tBase}-500`)}>{format(selectedDate, 'd MMMM', { locale })}</div>
                  </div>
                  <button 
                    onClick={() => canGoForward && setSelectedDate(addDays(selectedDate, 1))}
                    disabled={!canGoForward}
                    className={cn(
                      "transition-colors",
                      canGoForward ? `text-${tBase}-400 hover:text-${tBase}-500` : "text-gray-100 cursor-not-allowed"
                    )}
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Tasks Section */}
                <section className="lg:col-span-7 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-700 flex items-center gap-4">
                      <span className={cn("w-2.5 h-10 rounded-full", `bg-${tBase}-400`)}></span>
                      {t.checklist}
                    </h2>
                    {isToday(selectedDate) && (
                      <span className={cn("px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest", `bg-${tBase}-50 text-${tBase}-500`)}>
                        {t.today}
                      </span>
                    )}
                  </div>

                  {totalTasks > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("bg-white p-5 rounded-3xl shadow-sm")}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", `text-${tBase}-400`)}>Progress</span>
                        <div className="flex items-center gap-2">
                          {progress === 100 && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1"
                            >
                              <Star size={10} fill="currentColor" /> {lang === 'fr' ? 'ÉCLOSION !' : 'BLOOMED!'}
                            </motion.span>
                          )}
                          <span className={cn("text-sm font-bold", `text-${tBase}-600`)}>{Math.round(progress)}%</span>
                        </div>
                      </div>
                      <div className={cn("h-3 rounded-full overflow-hidden p-0.5 shadow-inner", `bg-${tBase}-50`)}>
                        <motion.div 
                          className={cn("h-full rounded-full shadow-sm bg-gradient-to-r", `from-${tBase}-400 to-${tBase}-600`)}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        />
                      </div>
                      <div className="mt-3 flex justify-center items-center gap-1">
                         <span className={cn("text-[10px] font-bold", `text-${tBase}-400`)}>{completedTasks} {lang === 'fr' ? 'pétales éclos' : 'petals bloomed'}</span>
                         <span className={cn("text-[10px] italic", `text-${tBase}-100`)}>/ {totalTasks}</span>
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="flex flex-col gap-4 relative">
                    {tasks.length > 0 ? (
                      <motion.div 
                        initial="hidden"
                        animate="show"
                        variants={{
                          hidden: { opacity: 0 },
                          show: {
                            opacity: 1,
                            transition: {
                              staggerChildren: 0.1
                            }
                          }
                        }}
                        className="flex flex-col gap-3"
                      >
                        {tasks.map((task) => (
                          <motion.div
                            key={task.id}
                            variants={{
                              hidden: { opacity: 0, y: 10 },
                              show: { opacity: 1, y: 0 }
                            }}
                          >
                            <SwipeableTask 
                              task={task} 
                              onToggle={(completed) => !isPast && toggleTask(task.id!, completed)} 
                              onDelete={() => !isPast && deleteTask(task.id!)}
                              onSetReminder={(time) => !isPast && setTaskReminder(task.id!, time)}
                              lang={lang}
                              readOnly={isPast}
                              color={tBase}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <div className={cn("text-center py-12 bg-white rounded-3xl")}>
                        <Flower2 className={cn("w-10 h-10 mx-auto mb-3", `text-${tBase}-100`)} />
                        <p className={cn("font-bold", `text-${tBase}-400`)}>{t.emptyGarden}</p>
                      </div>
                    )}

                    {!isPast && (
                      <div className={cn("task-card flex items-center gap-4 p-5 rounded-2xl group transition-all shadow-sm bg-opacity-50", `bg-${tBase}-50 focus-within:bg-${tBase}-100`)}>
                        <button 
                          onClick={() => {
                            if (newTaskText.trim()) {
                              addTask(newTaskText.trim());
                              setNewTaskText('');
                            }
                          }}
                          className={cn("w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold transition-all active:scale-90 shadow-sm", `text-${tBase}-400 hover:bg-${tBase}-500 hover:text-white`)}
                        >
                          <Plus size={20} />
                        </button>
                        <input 
                          type="text" 
                          placeholder={t.addPetal}
                          className={cn("flex-grow bg-transparent border-none focus:ring-0 text-lg font-bold placeholder:italic", `text-${tBase}-600 placeholder:${tBase}-400/30`)}
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTaskText.trim()) {
                              addTask(newTaskText.trim());
                              setNewTaskText('');
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* Score & Reflection Section */}
                <section className="lg:col-span-5 flex flex-col gap-8">
                  <div className={cn("bg-white rounded-[40px] p-10 shadow-2xl flex flex-col items-center justify-center gap-8 shadow-opacity-30", `shadow-${tBase}-100`)}>
                    <div className="relative w-56 h-56">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="16" fill="transparent" className={cn(`text-${tBase}-50`)}></circle>
                        <motion.circle 
                          cx="112" 
                          cy="112" 
                          r="100" 
                          stroke="currentColor" 
                          strokeWidth="16" 
                          fill="transparent" 
                          strokeDasharray="628.3" 
                          initial={{ strokeDashoffset: 628.3 }}
                          animate={{ strokeDashoffset: 628.3 - (628.3 * calculatedScore / 10) }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn(`text-${tBase}-500`)}
                        ></motion.circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-6xl font-bold text-gray-700">{calculatedScore * 10}</span>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest mt-1 block", `text-${tBase}-400`)}>{t.glowPoints}</span>
                      </div>
                    </div>

                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className={cn("text-sm font-bold uppercase tracking-widest", `text-${tBase}-400`)}>{t.eveningNotes}</h4>
                        {reflectionInput !== (day?.reflection || '') && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={async () => {
                              setIsNoteSaving(true);
                              await updateNote(reflectionInput);
                              setIsNoteSaving(false);
                            }}
                             className={cn("text-[10px] font-bold uppercase tracking-widest bg-opacity-50 px-3 py-1 rounded-lg transition-colors", `text-${tBase}-600 bg-${tBase}-50 hover:bg-${tBase}-100`)}
                          >
                            {isNoteSaving ? '...' : (t as any).saveNote}
                          </motion.button>
                        )}
                      </div>
                      <textarea 
                        className={cn(
                          "w-full min-h-[140px] border-none rounded-[28px] p-6 focus:ring-0 resize-none font-bold placeholder:italic transition-all",
                          `bg-${tBase}-50 text-${tBase}-600 placeholder:${tBase}-400/30`,
                          isPast && `bg-${tBase}-50/50`
                        )}
                        placeholder={t.reflectionPlaceholder}
                        value={reflectionInput}
                        onChange={(e) => setReflectionInput(e.target.value)}
                      />
                    </div>

                    {!isPast && (
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateScoreAndReflection(calculatedScore, reflectionInput)}
                        className={cn("w-full py-5 text-white rounded-3xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-3 shadow-opacity-30", `bg-${tBase}-500 shadow-${tBase}-100 hover:bg-${tBase}-600`)}
                      >
                        <Save size={22} className="stroke-[3px]" />
                        {t.preserve}
                      </motion.button>
                    )}
                  </div>

                  <div className="bg-amber-100 rounded-[32px] p-8 flex flex-col gap-6 shadow-lg shadow-amber-100/30">
                    <div className="space-y-3">
                      <h3 className="text-amber-700 font-bold flex items-center gap-2 text-lg">💡 {t.spark}</h3>
                      <p className="text-amber-900 leading-relaxed font-semibold italic text-lg pr-4">
                        "{t.quote}"
                      </p>
                    </div>
                    <div className="flex -space-x-3">
                      {['🥇', '🔥', '✨', '🌸'].map((emoji, i) => (
                        <div key={i} className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-xl shadow-sm transform hover:-translate-y-2 transition-transform cursor-pointer">
                          {emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl mx-auto pb-24 md:pb-0"
            >
              <div className="text-center mb-16">
                 <div className={cn("inline-block p-5 bg-white rounded-[40px] shadow-2xl mb-6 relative shadow-opacity-50", `shadow-${tBase}-100`)}>
                   <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-2 rounded-full animate-pulse">
                     <Star size={16} fill="white" />
                   </div>
                   <History className={cn("w-12 h-12", `text-${tBase}-500`)} />
                 </div>
                 <h2 className={cn("text-6xl font-bold mb-2 font-display tracking-tighter", `text-${tBase}-600`)}>{t.harvest}</h2>
                 <p className={cn("text-xl font-bold opacity-80", `text-${tBase}-400`)}>{t.harvestTag}</p>
              </div>

              {/* Magic Stats Dashboard */}
              {history.length === 0 ? (
                <div className={cn("text-center py-20 bg-white rounded-[60px] max-w-2xl mx-auto")}>
                   <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6", `bg-${tBase}-50`)}>
                     <Star size={32} className={cn(`text-${tBase}-100`)} />
                   </div>
                   <p className={cn("text-xl font-bold italic", `text-${tBase}-400`)}>{lang === 'fr' ? 'Votre premier souvenir attend d\'être éclos...' : 'Your first memory is waiting to bloom...'}</p>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 px-4 md:px-0">
                {[
                  { 
                    label: t.totalGlow, 
                    value: history.reduce((acc, curr) => acc + (curr.score * 10), 0), 
                    icon: '✨',
                    color: `text-${tBase}-600`,
                    bg: 'bg-white',
                    desc: lang === 'fr' ? 'Points accumulés' : 'Points earned'
                  },
                  { 
                    label: t.perfectDays, 
                    value: history.filter(h => h.score === 10).length, 
                    icon: '🌟',
                    color: 'text-amber-600',
                    bg: 'bg-amber-50',
                    desc: lang === 'fr' ? 'Pétales parfaits' : 'Perfect petals'
                  },
                  { 
                    label: lang === 'fr' ? 'Série' : 'Streak', 
                    value: '7', // Fallback or mock streak for now
                    icon: '🔥',
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                    desc: lang === 'fr' ? 'Jours d\'élégance' : 'Days of elegance'
                  }
                ].map((stat, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className={cn(
                      "p-8 rounded-[40px] shadow-xl shadow-gray-100 flex flex-col items-center justify-center text-center group transition-all hover:translate-y-[-8px] cursor-default",
                      stat.bg
                    )}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl mb-4 transform group-hover:rotate-12 transition-transform">
                      {stat.icon}
                    </div>
                    <span className={cn("text-4xl font-bold mb-1", stat.color)}>{stat.value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{stat.label}</span>
                    <span className="text-[10px] font-bold text-gray-300 italic">{stat.desc}</span>
                  </motion.div>
                ))}
              </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {history.map((item, idx) => (
                    <motion.div 
                      key={item.id} 
                      className={cn("bg-white p-10 rounded-[50px] shadow-2xl transition-all cursor-pointer group flex flex-col gap-6 relative overflow-hidden", `shadow-${tBase}-100/20`)}
                      onClick={() => {
                        setSelectedDate(new Date(item.id));
                        setActiveTab('daily');
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      whileHover={{ y: -10 }}
                    >
                    {/* Floating Glow Decorative */}
                    <div className={cn(
                      "absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[60px] opacity-20 pointer-events-none transition-all duration-700 group-hover:scale-150",
                      item.score >= 8 ? "bg-amber-400" : "bg-rose-500"
                    )} />

                    <div className="flex justify-between items-start relative z-10">
                      <div className="space-y-1">
                        <div className={cn("text-xs uppercase tracking-[0.2em] font-bold leading-none mb-1", `text-${tBase}-400`)}>{format(new Date(item.id), 'EEEE', { locale })}</div>
                        <h4 className={cn("text-4xl font-bold leading-none tracking-tighter", `text-${tBase}-600`)}>{format(new Date(item.id), 'd MMMM', { locale })}</h4>
                      </div>
                      <div className={cn(
                        "flex flex-col items-center justify-center w-20 h-20 rounded-[30px] shadow-inner relative overflow-hidden",
                        item.score >= 8 ? "bg-amber-50 text-amber-600" : `bg-${tBase}-50 text-${tBase}-500`
                      )}>
                        <span className="text-3xl font-bold z-10">{item.score * 10}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest z-10 opacity-60">Pts</span>
                        {item.score === 10 && (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 opacity-10"
                          >
                            <Star className="w-full h-full p-2" fill="currentColor" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <div className="relative group-hover:px-2 transition-all">
                      <p className={cn("text-xl line-clamp-3 font-bold leading-relaxed p-8 rounded-[35px] shadow-inner text-gray-700 bg-opacity-30", `bg-${tBase}-50`)}>
                        {item.reflection || (lang === 'fr' ? "Une journée gravée dans le temps, remplie de petits éclats de bonheur." : "A day etched in time, filled with small sparks of happiness.")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between px-2 pt-2 relative z-10">
                      <div className={cn("flex items-center gap-1.5 text-sm font-bold transition-all", `text-${tBase}-400 group-hover:text-${tBase}-500`)}>
                         {t.back} <ChevronRight size={18} className="mt-0.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                      {item.score >= 8 && (
                        <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest">
                          <Star size={12} fill="currentColor" /> {t.radiant}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="max-w-2xl mx-auto pb-24 md:pb-0"
                  >
                    <div className="text-center mb-12">
                       <div className={cn("inline-block p-4 bg-white rounded-3xl shadow-sm mb-4")}>
                          <Settings className={cn("w-10 h-10", `text-${tBase}-500`)} />
                        </div>
                        <h2 className={cn("text-5xl font-bold mb-2", `text-${tBase}-600`)}>{t.rules}</h2>
                        <p className={cn("text-lg font-bold", `text-${tBase}-400`)}>{t.rulesTag}</p>
                    </div>

              <div className="flex flex-col gap-8">
                {/* Theme Selection */}
                <div className={cn("bg-white rounded-[40px] p-8 shadow-xl shadow-opacity-30", `shadow-${tBase}-100/30`)}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={cn("w-10 h-10 text-white rounded-2xl flex items-center justify-center", `bg-${tBase}-500`)}>
                      <Flower2 size={20} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xl font-bold text-gray-700">{t.chooseTheme}</h3>
                      <p className="text-xs font-bold text-gray-400">{t.themeTag}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {THEMES.map((th) => (
                      <button
                        key={th.id}
                        onClick={() => updateSettings({ theme: th.id })}
                        className={cn(
                          "p-4 rounded-3xl transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                          theme === th.id 
                            ? `bg-${th.color}-50 shadow-lg shadow-${th.color}-100` 
                            : `bg-white hover:bg-${th.color}-50`
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center transition-transform group-hover:scale-110",
                          `bg-${th.color}-500 text-white`
                        )}>
                          <Flower2 size={24} />
                        </div>
                        <span className={cn(
                          "text-xs font-bold uppercase tracking-widest",
                          theme === th.id ? `text-${th.color}-600` : "text-gray-400"
                        )}>
                          {th.name[lang]}
                        </span>
                        {theme === th.id && (
                          <motion.div 
                            layoutId="activeTheme"
                            className={cn("absolute top-2 right-2 w-2 h-2 rounded-full", `bg-${th.color}-500`)} 
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Switcher */}
                <div className={cn("bg-white rounded-[40px] p-8 shadow-xl shadow-opacity-30", `shadow-${tBase}-100/30`)}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={cn("w-10 h-10 text-white rounded-2xl flex items-center justify-center", `bg-${tBase}-500`)}>
                      <Languages size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700">{t.language}</h3>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setLang('en')}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-bold transition-all",
                        lang === 'en' ? `bg-${tBase}-500 text-white shadow-xl shadow-${tBase}-100` : `bg-${tBase}-50 text-${tBase}-400 hover:bg-${tBase}-100`
                      )}
                    >
                      English
                    </button>
                    <button 
                      onClick={() => setLang('fr')}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-bold transition-all",
                        lang === 'fr' ? `bg-${tBase}-500 text-white shadow-xl shadow-${tBase}-100` : `bg-${tBase}-50 text-${tBase}-400 hover:bg-${tBase}-100`
                      )}
                    >
                      Français
                    </button>
                  </div>
                </div>

                {/* Predefined Tasks */}
                <div className={cn("bg-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden shadow-opacity-40", `shadow-${tBase}-100/50`)}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                    {settings.predefinedTasks.map((task, idx) => (
                      <motion.div 
                        layout
                        key={idx} 
                        className={cn("flex items-center gap-4 p-5 rounded-2xl group transition-all shadow-sm bg-opacity-30", `bg-${tBase}-50 hover:bg-${tBase}-100`)}
                      >
                        <div className={cn("w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm", `text-${tBase}-400`)}>
                          <Flower2 size={16} />
                        </div>
                        
                        {editingIdx === idx ? (
                          <div className="flex-grow flex gap-2">
                             <input 
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => {
                                  if (editValue.trim() !== "" && editValue !== task) {
                                    const newTasks = [...settings.predefinedTasks];
                                    newTasks[idx] = editValue;
                                    updatePredefinedTasks(newTasks);
                                  }
                                  setEditingIdx(null);
                                }}
                                className={cn("flex-grow bg-white rounded-xl px-3 py-1 font-bold outline-none shadow-inner", `text-${tBase}-600`)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (editValue.trim() !== "") {
                                      const newTasks = [...settings.predefinedTasks];
                                      newTasks[idx] = editValue;
                                      updatePredefinedTasks(newTasks);
                                    }
                                    setEditingIdx(null);
                                  }
                                  if (e.key === 'Escape') setEditingIdx(null);
                                }}
                             />
                             <button 
                               onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                               onClick={() => {
                                 if (editValue.trim() !== "") {
                                   const newTasks = [...settings.predefinedTasks];
                                   newTasks[idx] = editValue;
                                   updatePredefinedTasks(newTasks);
                                 }
                                 setEditingIdx(null);
                               }}
                               className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100 shrink-0"
                             >
                               <Check size={18} />
                             </button>
                          </div>
                        ) : (
                          <span 
                            className={cn("flex-grow text-base font-bold cursor-pointer transition-colors text-gray-700", `hover:text-${tBase}-500`)}
                            onClick={() => {
                              setEditingIdx(idx);
                              setEditValue(task);
                            }}
                          >
                            {task}
                          </span>
                        )}

                        <div className="flex gap-1 shrink-0">
                          {editingIdx !== idx && (
                            <button 
                              onClick={() => {
                                setEditingIdx(idx);
                                setEditValue(task);
                              }}
                              className={cn("w-10 h-10 flex items-center justify-center rounded-xl transition-all opacity-30", `text-${tBase}-400 hover:text-${tBase}-500 hover:bg-${tBase}-50 hover:opacity-100`)}
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              const newTasks = [...settings.predefinedTasks];
                              newTasks.splice(idx, 1);
                              updatePredefinedTasks(newTasks);
                              if (editingIdx === idx) setEditingIdx(null);
                            }}
                            className={cn("w-10 h-10 flex items-center justify-center rounded-xl transition-all opacity-30", `text-${tBase}-400 hover:text-rose-600 hover:bg-${tBase}-50 hover:opacity-100`)}
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="relative group">
                    <button 
                      onClick={() => {
                        const input = document.getElementById('core-petal-input') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          updatePredefinedTasks([...settings.predefinedTasks, input.value.trim()]);
                          input.value = '';
                        }
                      }}
                      className={cn("absolute left-5 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm transition-all z-10 active:scale-90", `text-${tBase}-400 hover:bg-${tBase}-500 hover:text-white`)}
                    >
                      <Plus size={20} />
                    </button>
                    <input 
                      id="core-petal-input"
                      type="text" 
                      placeholder={t.corePetal}
                      className={cn("w-full rounded-3xl p-6 pl-20 text-lg font-bold focus:ring-0 transition-all shadow-inner", `bg-${tBase}-50 text-${tBase}-600 placeholder:${tBase}-400/30`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          if (val.trim()) {
                            updatePredefinedTasks([...settings.predefinedTasks, val.trim()]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-16 md:hidden">
                <button 
                  onClick={handleLogout}
                  className={cn("w-full py-5 bg-white rounded-3xl font-bold flex items-center justify-center gap-3 shadow-sm active:scale-95 transition-all text-gray-400", `hover:text-${tBase}-500`)}
                >
                  <LogOut size={22} />
                  {t.logout}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className={cn("md:hidden fixed bottom-0 left-0 right-0 bg-white px-8 py-5 flex justify-around rounded-t-[40px] z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]")}>
        <MobileNavBtn active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} icon={<Calendar size={24} />} title={lang === 'fr' ? 'Jour' : 'Day'} color={tBase} />
        <MobileNavBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={24} />} title={lang === 'fr' ? 'Magie' : 'Magic'} color={tBase} />
        <MobileNavBtn active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={24} />} title={lang === 'fr' ? 'Pétales' : 'Petals'} color={tBase} />
      </div>
    </div>
  );
}

function BloomCelebration({ active, color = 'rose' }: { active: boolean, color?: string }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
      {[...Array(20)].map((_, i) => (
        <motion.div
           key={i}
           initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
           animate={{ 
             opacity: [0, 1, 1, 0],
             scale: [0, 1.5, 1],
             x: (Math.random() - 0.5) * window.innerWidth * 0.8,
             y: (Math.random() - 0.5) * window.innerHeight * 0.8,
             rotate: Math.random() * 360
           }}
           transition={{ duration: 3, ease: "easeOut", delay: Math.random() * 0.5 }}
           className="absolute"
        >
          {i % 2 === 0 ? (
            <Flower2 className={cn(`text-${color}-400`)} size={Math.random() * 40 + 20} />
          ) : (
            <Star className="text-amber-400 fill-amber-400" size={Math.random() * 20 + 10} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function NotificationManager({ tasks, date, lang }: { tasks: any[], date: Date, lang: 'en' | 'fr' }) {
  const t = (translations as any)[lang];
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = format(now, "HH:mm");

      tasks.forEach((task) => {
        if (
          task.reminderTime === currentTime &&
          !task.completed &&
          !notifiedTasks.has(task.id!) &&
          isToday(date)
        ) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(t.notificationTitle, {
              body: `${t.notificationBody} ${task.text}`,
              icon: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png",
            });
          }
          setNotifiedTasks((prev) => {
            const next = new Set(prev);
            next.add(task.id!);
            return next;
          });
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [tasks, notifiedTasks, t]);

  return null;
}

interface SwipeableTaskProps {
  task: any;
  onToggle: (completed: boolean) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onSetReminder: (time: string | null) => void | Promise<void>;
  lang?: string;
  readOnly?: boolean;
  color?: string;
}

const SwipeableTask: React.FC<SwipeableTaskProps> = ({ task, onToggle, onDelete, onSetReminder, lang = 'fr', readOnly = false, color = 'rose' }) => {
  const [isSparkling, setIsSparkling] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const t = translations[lang as keyof typeof translations];

  useEffect(() => {
    if (task.completed) {
      setIsSparkling(true);
      playBloomSound();
      const timer = setTimeout(() => setIsSparkling(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [task.completed]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl group shadow-sm mb-3 last:mb-0", `bg-${color}-50`)}>
      <motion.div 
        layout
        animate={{ 
          opacity: task.completed ? 0.8 : 1,
          scale: task.completed ? [1, 1.05, 0.98] : 1,
          boxShadow: task.completed ? "0 10px 25px -5px rgba(16, 185, 129, 0.3)" : "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        }}
        whileHover={(!task.completed && !readOnly) ? { scale: 1.005, backgroundColor: "#fff" } : {}}
        transition={{ 
          type: "spring", 
          stiffness: 600, 
          damping: 40,
          scale: { duration: 0.3 } 
        }}
        className={cn(
          "task-card flex items-center justify-between p-5 rounded-2xl transition-all relative z-10",
          task.completed 
            ? "bg-emerald-50/80 shadow-emerald-50" 
            : cn("bg-white shadow-opacity-10", `shadow-${color}-100`),
          !readOnly && !task.completed && cn("cursor-pointer"),
          readOnly && "cursor-default"
        )}
        onTap={(e) => {
          if (readOnly) return;
          // Prevent tap when clicking buttons
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('input')) return;
          onToggle(!task.completed);
        }}
      >
        <div className="flex items-center gap-5 relative flex-grow">
          {/* Completion Celebration Particles */}
          <AnimatePresence>
            {isSparkling && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 1, 0.5], 
                      x: (i % 2 === 0 ? 1 : -1) * (Math.random() * 40 + 20),
                      y: (i < 3 ? -1 : 1) * (Math.random() * 40 + 20),
                      opacity: 0,
                      rotate: Math.random() * 360
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute left-4 top-4 z-20 pointer-events-none"
                  >
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          <motion.div 
            animate={{ 
              scale: task.completed ? [1, 1.3, 1] : 1,
              rotate: task.completed ? [0, 20, -10, 0] : 0,
              backgroundColor: task.completed ? "#10b981" : "#fff"
            }}
            transition={{ duration: 0.5, ease: "backOut" }}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all relative z-10 font-bold",
              task.completed 
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" 
                : cn(`text-transparent bg-white shadow-sm`),
              !readOnly && !task.completed
            )}
          >
            <AnimatePresence mode="wait">
              {task.completed ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <CheckCircle2 size={20} className="stroke-[3px]" />
                </motion.div>
              ) : (
                <motion.div
                  key="circle"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Circle size={20} className={cn(`text-${color}-400`, !readOnly && `group-hover:text-${color}-500`)} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <div className="flex flex-col">
            <span className={cn(
              "text-lg font-bold transition-all relative z-10",
              task.completed ? "text-emerald-700/50 line-through italic" : "text-gray-700"
            )}>
              {task.text}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {task.isPredefined && (
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md inline-block w-fit",
                  task.completed ? "bg-emerald-100/50 text-emerald-600" : `bg-${color}-50 text-${color}-400`
                )}>
                  {t.core}
                </span>
              )}
              {task.reminderTime && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-500 flex items-center gap-1">
                  <Bell size={8} fill="currentColor" /> {task.reminderTime}
                </span>
              )}
            </div>
          </div>
          
          {/* Subtle line-through animation */}
          {task.completed && (
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              className="absolute left-14 right-0 h-0.5 bg-emerald-200 origin-left top-1/2 -translate-y-1/2 z-0"
              transition={{ delay: 0.2, duration: 0.4 }}
            />
          )}
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1 relative z-10">
            <AnimatePresence>
              {showTimePicker && (
                <motion.div
                  initial={{ opacity: 0, x: 10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.9 }}
                  className={cn("absolute right-full mr-2 bg-white p-2 rounded-xl shadow-xl flex items-center gap-2 z-50 shrink-0")}
                >
                  <input 
                    type="time" 
                    defaultValue={task.reminderTime || "08:00"}
                    onChange={(e) => onSetReminder(e.target.value)}
                    className={cn("text-xs font-bold border-none p-1 focus:ring-0", `text-${color}-500`)}
                  />
                  <button 
                    onClick={() => setShowTimePicker(false)}
                    className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      onSetReminder(null);
                      setShowTimePicker(false);
                    }}
                    className={cn("p-1 rounded-lg text-[8px] font-bold hover:bg-opacity-80 transition-all", `text-${color}-400 hover:bg-${color}-50`)}
                  >
                    DEL
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowTimePicker(!showTimePicker);
              }}
              className={cn(
                "p-3 flex-shrink-0 transition-all",
                task.reminderTime ? "text-amber-400" : `text-${color}-400 hover:text-${color}-500`
              )}
            >
              <Bell size={18} fill={task.reminderTime ? "currentColor" : "none"} />
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={cn("p-3 flex-shrink-0 transition-colors", `text-${color}-400 hover:text-rose-600`)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

function OnboardingQuiz({ onComplete, lang }: { onComplete: (data: any) => void, lang: 'en' | 'fr' }) {
  const t = translations[lang];
  const tBase = 'rose'; // Default for onboarding or use a local one if needed

  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    age: '',
    religion: '',
    country: '',
    language: lang === 'fr' ? 'Français' : 'English'
  });

  const steps = [
    {
      title: t.onboardingTitle,
      subtitle: t.onboardingSub,
      field: 'age',
      options: [
        { value: 'teen', label: t.teen },
        { value: 'adult', label: t.adult },
        { value: 'senior', label: t.senior }
      ]
    },
    {
       title: t.spiritualityLabel,
       subtitle: t.onboardingSub,
       field: 'religion',
       options: [
         { value: 'Islam', label: 'Islam' },
         { value: 'Christian', label: lang === 'fr' ? 'Chrétien' : 'Christian' },
         { value: 'None', label: t.secular }
       ]
    },
    {
       title: t.locationLabel,
       subtitle: lang === 'fr' ? "D'où venez-vous ?" : "Where are you from?",
       field: 'country',
       options: [
         { value: 'France', label: t.france },
         { value: 'USA', label: t.usa },
         { value: 'Other', label: t.other }
       ]
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-rose-50">
      <motion.div 
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn("max-w-md w-full bg-white p-10 rounded-[60px] shadow-2xl text-center shadow-rose-100/50")}
      >
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-3xl bg-rose-50">
            <Star className="animate-spin-slow text-rose-500" size={32} />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-2 text-rose-600">{currentStep.title}</h2>
        <p className="font-bold mb-10 text-rose-400">{currentStep.subtitle}</p>

        <div className="flex flex-col gap-4">
          {currentStep.options.map((option) => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={option.value}
              onClick={() => {
                const newData = { ...data, [currentStep.field]: option.value };
                setData(newData);
                if (step < steps.length - 1) {
                  setStep(step + 1);
                } else {
                  onComplete(newData);
                }
              }}
              className="py-5 rounded-3xl font-bold hover:bg-white transition-all shadow-sm bg-rose-50 text-rose-500"
            >
              {option.label}
            </motion.button>
          ))}
        </div>

        <div className="mt-12 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div key={i} className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              i === step ? "w-8 bg-rose-500" : "bg-rose-50"
            )} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label, color = 'rose' }: { active: boolean, onClick: () => void, icon: ReactNode, label: string, color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 group relative overflow-hidden text-left w-full",
        active 
          ? `bg-${color}-500 text-white shadow-xl shadow-${color}-100 scale-105` 
          : `text-${color}-400 hover:text-${color}-500 hover:bg-${color}-50`
      )}
    >
      <div className={cn(
        "transition-transform duration-300 group-hover:scale-110",
        active ? "text-white" : `text-${color}-400`
      )}>
        {icon}
      </div>
      <span className="font-bold text-base tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="activePill"
          className={cn("absolute right-0 top-0 bottom-0 w-2.5 opacity-30", `bg-${color}-400`)}
        />
      )}
    </button>
  );
}

function MobileNavBtn({ active, onClick, icon, title, color = 'rose' }: { active: boolean, onClick: () => void, icon: ReactNode, title: string, color?: string }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 min-w-[70px] relative">
      <div className={cn(
        "p-2.5 rounded-2xl transition-all duration-300",
        active ? `bg-${color}-500 text-white shadow-lg shadow-${color}-100 -translate-y-2 scale-125` : `text-${color}-400`
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-widest",
        active ? `text-${color}-500` : `text-${color}-400`
      )}>{title}</span>
    </button>
  );
}
