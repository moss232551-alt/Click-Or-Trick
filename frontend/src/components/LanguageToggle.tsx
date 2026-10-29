import { useLanguage } from '../context/LanguageContext';

const LanguageToggle = () => {
  const { language, setLanguage, strings } = useLanguage();

  return (
    <div className="lang-toggle" role="group" aria-label={strings.languageToggle.helper}>
      <button
        type="button"
        className={language === 'th' ? 'active' : ''}
        onClick={() => setLanguage('th')}
        title={strings.languageToggle.thai}
      >
        {strings.languageToggle.thaiShort}
      </button>
      <span aria-hidden="true">|</span>
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => setLanguage('en')}
        title={strings.languageToggle.english}
      >
        {strings.languageToggle.englishShort}
      </button>
    </div>
  );
};

export default LanguageToggle;
