import React from 'react';
import { signInWithGoogle } from '../firebase';

export default function Login() {
    const handleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative background blur */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center relative z-10 border border-outline-variant/30">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
                    <span className="material-symbols-outlined text-on-primary text-[32px]">school</span>
                </div>
                
                <h1 className="text-3xl font-bold text-on-surface mb-2 tracking-tight">StudyMate AI</h1>
                <p className="text-on-surface-variant text-center mb-10 text-body-lg">
                    Sign in to access your AI study assistant, save documents, and track your progress.
                </p>

                <button 
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-surface-container-highest hover:bg-surface-container-highest/80 text-on-surface px-6 py-4 rounded-xl border border-outline-variant/50 transition-all shadow-md hover:shadow-lg active:scale-[0.98] group font-medium"
                >
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <p className="mt-8 text-xs text-on-surface-variant/60 text-center max-w-xs">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
