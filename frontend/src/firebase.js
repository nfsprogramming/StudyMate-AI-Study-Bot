import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3WapSLjPY1bUN4YVWB4snQmztqjDjhEU",
  authDomain: "studymate-ai-pro-app.firebaseapp.com",
  projectId: "studymate-ai-pro-app",
  storageBucket: "studymate-ai-pro-app.firebasestorage.app",
  messagingSenderId: "373119124741",
  appId: "1:373119124741:web:50f5191f49c663b64c236c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Customize provider prompts
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        if (error.code === 'auth/configuration-not-found') {
            alert('Google Sign-In is not yet enabled.\n\nPlease go to:\nFirebase Console → studymate-ai-pro-app → Build → Authentication → Sign-in method → Enable Google')
        } else {
            console.error("Error signing in with Google", error);
        }
        throw error;
    }
};

export const signInWithClassroom = async () => {
    try {
        const classroomProvider = new GoogleAuthProvider();
        classroomProvider.setCustomParameters({ prompt: 'consent select_account' });
        classroomProvider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
        classroomProvider.addScope('https://www.googleapis.com/auth/classroom.coursework.me');
        classroomProvider.addScope('https://www.googleapis.com/auth/classroom.coursework.students');
        classroomProvider.addScope('https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly');
        classroomProvider.addScope('https://www.googleapis.com/auth/classroom.announcements.readonly');
        classroomProvider.addScope('https://www.googleapis.com/auth/classroom.topics.readonly');
        classroomProvider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
        classroomProvider.addScope('https://www.googleapis.com/auth/classroom.student-submissions.me.readonly');
        classroomProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
        
        const result = await signInWithPopup(auth, classroomProvider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        
        return { user: result.user, token };
    } catch (error) {
        console.error("Error signing in with Classroom scopes", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
};

// Firestore chat history helpers
export const saveChatSession = async (userId, session) => {
    try {
        const ref = doc(db, 'users', userId, 'chatSessions', session.id);
        await setDoc(ref, {
            ...session,
            updatedAt: Date.now()
        });
    } catch (error) {
        console.error('Error saving chat session:', error);
    }
};

export const loadChatSessions = async (userId) => {
    try {
        const q = query(
            collection(db, 'users', userId, 'chatSessions'),
            orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (error) {
        console.error('Error loading chat sessions:', error);
        return [];
    }
};

export const deleteChatSession = async (userId, sessionId) => {
    try {
        await deleteDoc(doc(db, 'users', userId, 'chatSessions', sessionId));
    } catch (error) {
        console.error('Error deleting chat session:', error);
    }
};

export { auth, db };
