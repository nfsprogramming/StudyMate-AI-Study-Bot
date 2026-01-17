import { FiGlobe } from 'react-icons/fi'

export default function LanguageSelector({ languages, selected, onChange }) {
    return (
        <div className="language-selector">
            <label className="selector-label">
                <FiGlobe /> Language
            </label>
            <select
                className="language-dropdown"
                value={selected}
                onChange={(e) => onChange(e.target.value)}
            >
                {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                ))}
            </select>
        </div>
    )
}
