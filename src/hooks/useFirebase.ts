import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  setDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  getDoc,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { format, isToday } from 'date-fns';

export interface PostTask {
  id?: string;
  text: string;
  completed: boolean;
  isPredefined: boolean;
  userId: string;
  reminderTime?: string;
}

export interface DayData {
  id: string; // YYYY-MM-DD
  score: number;
  reflection: string;
  userId: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

export function useDailyData(date: Date, userId: string | undefined) {
  const [day, setDay] = useState<DayData | null>(null);
  const [tasks, setTasks] = useState<PostTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useUserSettings(userId);

  const dayId = format(date, 'yyyy-MM-dd');

  useEffect(() => {
    if (!userId) return;

    const dayDocRef = doc(db, 'days', dayId);
    const tasksColRef = collection(db, 'days', dayId, 'tasks');

    const unsubDay = onSnapshot(dayDocRef, (snap) => {
      if (snap.exists()) {
        setDay({ id: snap.id, ...snap.data() } as DayData);
      } else {
        setDay(null);
      }
    });

    const unsubTasks = onSnapshot(query(tasksColRef, where('userId', '==', userId), orderBy('createdAt', 'asc')), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as PostTask)));
      setLoading(false);
    });

    return () => {
      unsubDay();
      unsubTasks();
    };
  }, [dayId, userId]);

  // Sync logic moved to its own effect that reacts to settings changes
  useEffect(() => {
    if (!userId || !settings.predefinedTasks || settings.predefinedTasks.length === 0) return;
    if (!isToday(date)) return;

    const syncDayTasks = async () => {
      const dayDocRef = doc(db, 'days', dayId);
      const daySnap = await getDoc(dayDocRef);
      
      if (!daySnap.exists()) {
        await setDoc(dayDocRef, { 
          score: 0, 
          reflection: '', 
          userId, 
          date: dayId, 
          createdAt: serverTimestamp() 
        });
      }
      
      const currentTasksRef = collection(db, 'days', dayId, 'tasks');
      const q = query(currentTasksRef, where('isPredefined', '==', true), where('userId', '==', userId));
      
      const currentPredefinedSnap = await getDocs(q);
      const existingTexts = currentPredefinedSnap.docs.map(d => d.data().text);

      for (const taskText of settings.predefinedTasks) {
        if (!existingTexts.includes(taskText)) {
          await addDoc(currentTasksRef, {
            text: taskText,
            completed: false,
            isPredefined: true,
            userId,
            createdAt: serverTimestamp()
          });
        }
      }
    };

    syncDayTasks();
  }, [dayId, userId, settings.predefinedTasks, date]);

  const updateScoreAndReflection = async (score: number, reflection: string) => {
    if (!userId) return;
    const dayDocRef = doc(db, 'days', dayId);
    const snap = await getDoc(dayDocRef);
    
    if (snap.exists()) {
      await updateDoc(dayDocRef, { score, reflection, updatedAt: serverTimestamp() });
    } else {
      await setDoc(dayDocRef, { 
        score, 
        reflection, 
        userId, 
        date: dayId, 
        createdAt: serverTimestamp() 
      });
      
      // If we are creating the day, we should also populate predefined tasks
      const settingsRef = doc(db, 'settings', userId);
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const predefined = settingsSnap.data().predefinedTasks || [];
        for (const taskText of predefined) {
          await addDoc(collection(db, 'days', dayId, 'tasks'), {
            text: taskText,
            completed: false,
            isPredefined: true,
            userId,
            createdAt: serverTimestamp()
          });
        }
      }
    }
  };

  const updateNote = async (reflection: string) => {
    if (!userId) return;
    const dayDocRef = doc(db, 'days', dayId);
    const snap = await getDoc(dayDocRef);
    if (snap.exists()) {
      await updateDoc(dayDocRef, { reflection, updatedAt: serverTimestamp() });
    } else {
      await setDoc(dayDocRef, {
        score: 0,
        reflection,
        userId,
        date: dayId,
        createdAt: serverTimestamp()
      });
    }
  };

  const addTask = async (text: string) => {
    if (!userId) return;
    // ensure day exists first
    const dayDocRef = doc(db, 'days', dayId);
    const snap = await getDoc(dayDocRef);
    if (!snap.exists()) {
      await setDoc(dayDocRef, { 
        score: 0, 
        reflection: '', 
        userId, 
        date: dayId, 
        createdAt: serverTimestamp() 
      });
    }

    await addDoc(collection(db, 'days', dayId, 'tasks'), {
      text,
      completed: false,
      isPredefined: false,
      userId,
      createdAt: serverTimestamp()
    });

    // Auto-sync score (denominator changed)
    const newTotal = tasks.length + 1;
    const completedCount = tasks.filter(t => t.completed).length;
    const newScore = Math.round((completedCount / newTotal) * 10);
    await updateDoc(dayDocRef, { score: newScore, updatedAt: serverTimestamp() });
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    if (!userId) return;
    const taskRef = doc(db, 'days', dayId, 'tasks', taskId);
    await updateDoc(taskRef, { completed });

    // Auto-sync score to Firestore day document
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed } : t);
    if (updatedTasks.length > 0) {
      const newScore = Math.round((updatedTasks.filter(t => t.completed).length / updatedTasks.length) * 10);
      const dayDocRef = doc(db, 'days', dayId);
      await updateDoc(dayDocRef, { score: newScore, updatedAt: serverTimestamp() });
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) return;
    const { deleteDoc } = await import('firebase/firestore');
    const taskRef = doc(db, 'days', dayId, 'tasks', taskId);
    await deleteDoc(taskRef);

    // Auto-sync score 
    const remainingTasks = tasks.filter(t => t.id !== taskId);
    const dayDocRef = doc(db, 'days', dayId);
    if (remainingTasks.length > 0) {
      const newScore = Math.round((remainingTasks.filter(t => t.completed).length / remainingTasks.length) * 10);
      await updateDoc(dayDocRef, { score: newScore, updatedAt: serverTimestamp() });
    } else {
      await updateDoc(dayDocRef, { score: 0, updatedAt: serverTimestamp() });
    }
  };

  const setTaskReminder = async (taskId: string, reminderTime: string | null) => {
    if (!userId) return;
    const taskRef = doc(db, 'days', dayId, 'tasks', taskId);
    await updateDoc(taskRef, { reminderTime });
  };

  return { day, tasks, loading, updateScoreAndReflection, updateNote, addTask, toggleTask, deleteTask, setTaskReminder };
}

export interface UserSettings {
  predefinedTasks: string[];
  joinedAt?: any;
  onboardingCompleted?: boolean;
  theme?: string;
  quizData?: {
    age?: string;
    religion?: string;
    country?: string;
    language?: string;
  };
}

export function useUserSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings>({ predefinedTasks: [], theme: 'rose' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const ref = doc(db, 'settings', userId);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          predefinedTasks: data.predefinedTasks || [],
          theme: data.theme || 'rose',
          ...data
        } as UserSettings);
      } else {
        // Init default settings
        setDoc(ref, { 
          predefinedTasks: ['Faire du sport', 'Boire 2L d\'eau', 'Lire 20 minutes', 'Méditer'], 
          userId,
          joinedAt: serverTimestamp(),
          onboardingCompleted: false,
          theme: 'rose'
        });
      }
      setLoading(false);
    });
  }, [userId]);

  const updatePredefinedTasks = async (tasks: string[]) => {
    if (!userId) return;
    const ref = doc(db, 'settings', userId);
    await updateDoc(ref, { predefinedTasks: tasks });
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!userId) return;
    const ref = doc(db, 'settings', userId);
    await updateDoc(ref, { ...newSettings });
  };

  return { settings, loading, updatePredefinedTasks, updateSettings };
}

export function useHistory(userId: string | undefined) {
  const [history, setHistory] = useState<DayData[]>([]);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'days'), where('userId', '==', userId), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as DayData)));
    });
  }, [userId]);

  return { history };
}
