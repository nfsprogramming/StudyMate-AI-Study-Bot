import { useState } from 'react'
import axios from 'axios'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

export default function QuizGenerator({ onQuizGenerated }) {
    const [quiz, setQuiz] = useState([])
    const [answers, setAnswers] = useState({})
    const [showResults, setShowResults] = useState(false)
    const [score, setScore] = useState(0)
    const [loading, setLoading] = useState(false)
    const [difficulty, setDifficulty] = useState('medium')
    const [numQuestions, setNumQuestions] = useState(5)
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
    const [topic, setTopic] = useState('')

    const generateQuiz = async () => {
        setLoading(true)
        setShowResults(false)
        setAnswers({})
        setCurrentQuestionIdx(0)

        try {
            const response = await axios.post('/api/generate-quiz', {
                num_questions: numQuestions,
                difficulty: difficulty,
                topic: topic.trim() || null
            })
            setQuiz(response.data.questions)
            if (onQuizGenerated) onQuizGenerated(response.data.questions)
        } catch (error) {
            console.error('Quiz error:', error)
            const msg = error.response?.data?.detail || 'Error generating quiz. Please try again.'
            alert(msg)
        } finally {
            setLoading(false)
        }
    }

    const selectAnswer = (option) => {
        if (showResults) return
        setAnswers({ ...answers, [currentQuestionIdx]: option })
    }

    const nextQuestion = () => {
        if (currentQuestionIdx < quiz.length - 1) {
            setCurrentQuestionIdx(currentQuestionIdx + 1)
        } else {
            submitQuiz()
        }
    }

    const previousQuestion = () => {
        if (currentQuestionIdx > 0) {
            setCurrentQuestionIdx(currentQuestionIdx - 1)
        }
    }

    const submitQuiz = () => {
        let correctCount = 0
        quiz.forEach((q, idx) => {
            if (answers[idx] === q.correct) {
                correctCount++
            }
        })
        setScore(correctCount)
        setShowResults(true)
    }

    const exportQuiz = async () => {
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: "Quiz Results",
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 300 }
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Score: ${score * 100} pts / ${quiz.length * 100} pts (${Math.round((score / quiz.length) * 100)}%)`,
                                    bold: true,
                                    size: 28
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 }
                        }),
                        new Paragraph({
                            text: `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
                            spacing: { after: 400 }
                        }),
                        ...quiz.flatMap((q, idx) => {
                            const isCorrect = answers[idx] === q.correct;
                            const userAnswerText = q.options[answers[idx]] || "No Answer";
                            const correctAnswerText = q.options[q.correct];

                            return [
                                new Paragraph({
                                    text: `Question ${idx + 1}: ${q.question}`,
                                    heading: HeadingLevel.HEADING_3,
                                    spacing: { before: 200, after: 100 }
                                }),
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `Your Answer: ${userAnswerText}`,
                                            color: isCorrect ? "008000" : "FF0000",
                                            bold: true
                                        })
                                    ]
                                }),
                                !isCorrect ? new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `Correct Answer: ${correctAnswerText}`,
                                            color: "0000FF",
                                            bold: true
                                        })
                                    ],
                                    spacing: { after: 200 }
                                }) : new Paragraph({ text: "", spacing: { after: 200 } })
                            ];
                        })
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `quiz_results_${new Date().toISOString().split('T')[0]}.docx`);

        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export quiz results.');
        }
    }

    const resetQuiz = () => {
        setQuiz([])
        setAnswers({})
        setShowResults(false)
        setScore(0)
        setCurrentQuestionIdx(0)
    }

    const progressPercentage = quiz.length > 0 ? ((currentQuestionIdx + 1) / quiz.length) * 100 : 0

    return (
        <div className="flex-1 w-full max-w-[1000px] mx-auto px-6 py-8 flex flex-col gap-8">
            {/* Quiz Configuration / Header */}
            <div className="bg-surface-container border border-outline-variant/20 p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col gap-1">
                        <label className="text-[12px] text-on-surface-variant uppercase tracking-widest font-bold">Topic (optional)</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            disabled={loading || quiz.length > 0}
                            placeholder="e.g. Python, Arrays, Neural Networks..."
                            className="bg-surface-container-high border border-outline-variant/30 rounded-lg px-3 py-2 text-body-md outline-none focus:border-primary disabled:opacity-50 w-56"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[12px] text-on-surface-variant uppercase tracking-widest font-bold">Questions</label>
                        <select 
                            value={numQuestions} 
                            onChange={(e) => setNumQuestions(Number(e.target.value))} 
                            disabled={loading || quiz.length > 0}
                            className="bg-surface-container-high border border-outline-variant/30 rounded-lg px-3 py-2 text-body-md outline-none focus:border-primary disabled:opacity-50"
                        >
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[12px] text-on-surface-variant uppercase tracking-widest font-bold">Difficulty</label>
                        <select 
                            value={difficulty} 
                            onChange={(e) => setDifficulty(e.target.value)} 
                            disabled={loading || quiz.length > 0}
                            className="bg-surface-container-high border border-outline-variant/30 rounded-lg px-3 py-2 text-body-md outline-none focus:border-primary disabled:opacity-50"
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {quiz.length > 0 && (
                        <button onClick={resetQuiz} className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                            <span className="material-symbols-outlined text-[18px]">refresh</span> New Quiz
                        </button>
                    )}
                    <button 
                        onClick={generateQuiz} 
                        disabled={loading}
                        className="accent-gradient text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                        {loading ? 'Generating...' : quiz.length > 0 ? 'Regenerate' : 'Generate Quiz'}
                    </button>
                </div>
            </div>

            {/* Empty State */}
            {quiz.length === 0 && !loading && (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4 max-w-md">
                        <span className="material-symbols-outlined text-6xl text-primary opacity-80">quiz</span>
                        <h3 className="font-headline-md text-headline-md text-on-surface">Ready to test your knowledge?</h3>
                        <p className="text-on-surface-variant text-body-lg">Select the number of questions and difficulty level above, then click generate to create a custom quiz based on your uploaded documents.</p>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4 max-w-md">
                        <span className="material-symbols-outlined text-6xl text-primary animate-spin">sync</span>
                        <h3 className="font-headline-md text-headline-md text-on-surface">AI is analyzing documents...</h3>
                        <p className="text-on-surface-variant">Generating challenging questions tailored to your materials.</p>
                    </div>
                </div>
            )}

            {/* Score Screen */}
            {showResults && (
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-10 text-center animate-in fade-in zoom-in duration-500">
                    <span className="material-symbols-outlined text-6xl text-primary mb-4">workspace_premium</span>
                    <h2 className="font-display-lg text-display-lg text-primary mb-2">Quiz Complete!</h2>
                    <div className="font-headline-md text-headline-md text-on-surface mb-2">
                        {score} / {quiz.length} Correct
                    </div>
                    <div className="text-primary font-bold text-2xl mb-8">
                        {Math.round((score / quiz.length) * 100)}% Accuracy
                    </div>
                    <div className="flex justify-center gap-4">
                        <button onClick={exportQuiz} className="bg-surface-container-highest text-on-surface px-6 py-3 rounded-xl flex items-center gap-2 hover:border-primary/50 border border-outline-variant/30 transition-all">
                            <span className="material-symbols-outlined">download</span> Export Results
                        </button>
                        <button onClick={resetQuiz} className="accent-gradient text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            <span className="material-symbols-outlined">refresh</span> Try Another Quiz
                        </button>
                    </div>
                </div>
            )}

            {/* Quiz Workspace */}
            {quiz.length > 0 && !showResults && (
                <>
                    {/* Progress Header */}
                    <div className="flex flex-col gap-4 animate-in fade-in">
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full font-label-md text-label-md mb-2 border border-primary/20">
                                    QUESTION {currentQuestionIdx + 1} OF {quiz.length}
                                </span>
                                <h2 className="font-headline-sm text-headline-sm text-on-surface">AI Generated Quiz</h2>
                            </div>
                            <div className="text-right">
                                <span className="text-on-surface-variant font-label-md text-label-md">SCORE</span>
                                <div className="text-headline-sm font-bold text-primary">
                                    {Object.keys(answers).length * 100} <span className="text-on-surface-variant text-sm font-normal">pts</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(229,0,0,0.5)] transition-all duration-700" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </div>

                    {/* Bento Layout Content */}
                    <div className="grid grid-cols-12 gap-6 items-start">
                        {/* Question Card */}
                        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                            <div className="glass-panel p-8 rounded-2xl flex flex-col gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-on-primary">help_center</span>
                                    </div>
                                    <p className="font-headline-sm text-headline-sm leading-relaxed">
                                        {quiz[currentQuestionIdx].question}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {Object.entries(quiz[currentQuestionIdx].options).map(([key, value]) => {
                                        const isSelected = answers[currentQuestionIdx] === key

                                        return (
                                            <button 
                                                key={key}
                                                className={`group flex items-center gap-4 p-5 rounded-xl border text-left transition-all active:scale-[0.98] ${isSelected ? 'quiz-option-active' : 'border-outline-variant/30 bg-surface-container-low hover:border-primary/40 hover:bg-surface-container-high'}`}
                                                onClick={() => selectAnswer(key)}
                                            >
                                                <div className={`w-10 h-10 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-primary' : 'border-outline-variant/50 group-hover:border-primary/60'}`}>
                                                    <span className={`font-bold ${isSelected ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}>{key}</span>
                                                </div>
                                                <span className="text-body-lg text-on-surface font-medium">{value}</span>
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <button 
                                        className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors disabled:opacity-50"
                                        onClick={previousQuestion}
                                        disabled={currentQuestionIdx === 0}
                                    >
                                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                                        <span>Previous</span>
                                    </button>
                                    <button 
                                        className="accent-gradient text-on-primary font-bold px-10 py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-[0.95] flex items-center gap-2"
                                        onClick={nextQuestion}
                                    >
                                        <span>{currentQuestionIdx === quiz.length - 1 ? 'Submit Answers' : 'Next Question'}</span>
                                        <span className="material-symbols-outlined text-sm">{currentQuestionIdx === quiz.length - 1 ? 'check_circle' : 'arrow_forward'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar Contextual Panel */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                            {/* AI Assistant Card */}
                            <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/20 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-primary/5 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                                <div className="relative z-10 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                            <span className="material-symbols-outlined text-on-primary text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
                                        </div>
                                        <span className="font-bold text-body-md">AI Insights</span>
                                    </div>
                                    <p className="text-body-md text-on-surface-variant">
                                        {answers[currentQuestionIdx] ? "Great, you've selected an answer! Move to the next question when you're ready." : "Take your time. Read the options carefully based on the documents you've uploaded."}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-label-md text-green-500/80 font-medium">Difficulty: {difficulty}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
