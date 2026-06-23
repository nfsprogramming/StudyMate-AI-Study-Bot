export default function LanguageSelector({ languages, selected, onChange }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-3 py-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[18px]">language</span>
                <span className="font-label-md text-label-md">Language</span>
            </div>
            <div className="px-3">
                <select
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-on-surface text-body-md focus:ring-1 focus:ring-primary focus:border-primary py-2 px-3 appearance-none cursor-pointer"
                    value={selected}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
