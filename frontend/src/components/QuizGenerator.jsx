import { useState } from 'react'
import { FiDownload, FiRefreshCw } from 'react-icons/fi'
import axios from 'axios'

export default function QuizGenerator({ language }) {
    const [quiz, setQuiz] = useState([])
    const [answers, setAnswers] = useState({})
    const [showResults, setShowResults] = useState(false)
    const [score, setScore] = useState(0)
    const [loading, setLoading] = useState(false)
    const [difficulty, setDifficulty] = useState('medium')
    const [numQuestions, setNumQuestions] = useState(5)

    const generateQuiz = async () => {
        setLoading(true)
        setShowResults(false)
        setAnswers({})

        try {
            const response = await axios.post('/api/generate-quiz', {
                num_questions: numQuestions,
                difficulty: difficulty,
                language: language
            })
            setQuiz(response.data.questions)
        } catch (error) {
            console.error('Quiz error:', error)
            alert('Error generating quiz. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const selectAnswer = (questionIdx, option) => {
        if (showResults) return
        setAnswers({ ...answers, [questionIdx]: option })
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
        const quizData = {
            quiz: quiz,
            answers: answers,
            score: score,
            total: quiz.length,
            difficulty: difficulty,
            language: language,
            timestamp: new Date().toISOString()
        }

        try {
            const response = await axios.post('/api/export-quiz', quizData)
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `quiz-results-${new Date().toISOString()}.json`
            a.click()
        } catch (error) {
            console.error('Export error:', error)
        }
    }

    const resetQuiz = () => {
        setQuiz([])
        setAnswers({})
        setShowResults(false)
        setScore(0)
    }

    return (
        <div className="quiz-container">
            {/* Quiz Controls */}
            <div className="quiz-controls">
                <div className="control-group">
                    <label>Number of Questions:</label>
                    <select
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        disabled={loading || quiz.length > 0}
                    >
                        <option value={3}>3</option>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                    </select>
                </div>

                <div className="control-group">
                    <label>Difficulty:</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        disabled={loading || quiz.length > 0}
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>

                <button
                    className="generate-button"
                    onClick={generateQuiz}
                    disabled={loading}
                >
                    {loading ? 'Generating...' : quiz.length > 0 ? 'Regenerate Quiz' : 'Generate Quiz'}
                </button>

                {quiz.length > 0 && (
                    <button className="reset-button" onClick={resetQuiz}>
                        <FiRefreshCw /> New Quiz
                    </button>
                )}
            </div>

            {/* Score Display */}
            {showResults && (
                <div className="score-display">
                    <h2>🎉 Quiz Complete!</h2>
                    <div className="score-value">
                        {score} / {quiz.length}
                    </div>
                    <div className="score-percentage">
                        {Math.round((score / quiz.length) * 100)}%
                    </div>
                    <button className="export-button" onClick={exportQuiz}>
                        <FiDownload /> Export Results
                    </button>
                </div>
            )}

            {/* Quiz Questions */}
            {quiz.map((q, idx) => {
                const isCorrect = showResults && answers[idx] === q.correct
                const isWrong = showResults && answers[idx] && answers[idx] !== q.correct

                return (
                    <div key={idx} className="quiz-question">
                        <p className="question-number">Question {idx + 1} of {quiz.length}</p>
                        <p className="question-text">{q.question}</p>

                        <div className="options-grid">
                            {Object.entries(q.options).map(([key, value]) => {
                                const isSelected = answers[idx] === key
                                const isCorrectAnswer = showResults && key === q.correct

                                let optionClass = 'option'
                                if (isSelected) optionClass += ' selected'
                                if (showResults && isCorrectAnswer) optionClass += ' correct'
                                if (showResults && isSelected && !isCorrectAnswer) optionClass += ' wrong'

                                return (
                                    <div
                                        key={key}
                                        className={optionClass}
                                        onClick={() => selectAnswer(idx, key)}
                                    >
                                        <span className="option-letter">{key}</span>
                                        <span className="option-text">{value}</span>
                                        {showResults && isCorrectAnswer && <span className="check">✓</span>}
                                        {showResults && isSelected && !isCorrectAnswer && <span className="cross">✗</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}

            {/* Submit Button */}
            {quiz.length > 0 && !showResults && (
                <button
                    className="submit-quiz-button"
                    onClick={submitQuiz}
                    disabled={Object.keys(answers).length !== quiz.length}
                >
                    Submit Quiz ({Object.keys(answers).length}/{quiz.length} answered)
                </button>
            )}

            {/* Empty State */}
            {quiz.length === 0 && !loading && (
                <div className="empty-state">
                    <h3>📝 Generate a Quiz</h3>
                    <p>Select difficulty and number of questions, then click Generate Quiz</p>
                    <p className="hint">💡 Make sure you have uploaded PDFs first</p>
                </div>
            )}
        </div>
    )
}
