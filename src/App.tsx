import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Settings, Volume2, Globe, AlertCircle, RefreshCcw, Languages } from 'lucide-react';
import { useLiveAPI } from './hooks/useLiveAPI';
import { cn } from './lib/utils';

const SCENARIOS = [
  { id: 'casual', label: 'Casual Chat', description: 'Just chat about your day.', roles: null },
  { id: 'public', label: 'Public Chat', description: 'Mingle and chat in a public setting.', roles: null },
  { 
    id: 'coffee', 
    label: 'Coffee Shop', 
    description: 'Practice ordering coffee.', 
    roles: [
      { id: 'customer', label: 'Customer', aiPrompt: 'You are a barista at a coffee shop. The user is a customer ordering coffee.' },
      { id: 'barista', label: 'Barista', aiPrompt: 'You are a customer at a coffee shop ordering coffee. The user is the barista.' }
    ]
  },
  { 
    id: 'restaurant', 
    label: 'Restaurant', 
    description: 'Ordering food and dining out.',
    roles: [
      { id: 'customer', label: 'Customer', aiPrompt: 'You are a waiter at a restaurant. The user is a customer ordering food.' },
      { id: 'waiter', label: 'Waiter', aiPrompt: 'You are a customer at a restaurant ordering food. The user is the waiter.' }
    ]
  },
  { 
    id: 'airport', 
    label: 'Airport', 
    description: 'Navigating check-in and security.',
    roles: [
      { id: 'passenger', label: 'Passenger', aiPrompt: 'You are an airport agent. The user is a passenger checking in.' },
      { id: 'agent', label: 'Agent', aiPrompt: 'You are a passenger at the airport checking in. The user is the airport agent.' }
    ]
  },
  { id: 'directions', label: 'Directions', description: 'Asking for and finding locations.', roles: null },
  { 
    id: 'hotel', 
    label: 'Hotel Booking', 
    description: 'Checking in to a hotel.',
    roles: [
      { id: 'guest', label: 'Guest', aiPrompt: 'You are a hotel receptionist. The user is a guest checking in.' },
      { id: 'receptionist', label: 'Receptionist', aiPrompt: 'You are a guest checking into a hotel. The user is the receptionist.' }
    ]
  },
  { 
    id: 'interview', 
    label: 'Job Interview', 
    description: 'Professional conversational practice.',
    roles: [
      { id: 'interviewee', label: 'Interviewee', aiPrompt: 'You are a hiring manager acting as the interviewer. The user is the candidate being interviewed.' },
      { id: 'interviewer', label: 'Interviewer', aiPrompt: 'You are a job candidate being interviewed. The user is the hiring manager interviewing you.' }
    ]
  }
];

const LANGUAGES = [
  { id: 'spanish', label: 'Spanish (Spain)', voice: 'Puck' }, 
  { id: 'french', label: 'French (France)', voice: 'Kore' },
  { id: 'german', label: 'German (Germany)', voice: 'Zephyr' },
  { id: 'japanese', label: 'Japanese', voice: 'Charon' },
  { id: 'english', label: 'English (US)', voice: 'Fenrir' },
  { id: 'arabic', label: 'Arabic', voice: 'Puck' }
];

const TRANSLATIONS = {
  en: {
    appTitle: "LingoBot AI",
    statusConnected: "Connected",
    statusReady: "Ready",
    heading: "Practice makes perfect",
    subheading: "Select a language and scenario to start your live audio practice session.",
    targetLanguage: "Target Language",
    practiceScenario: "Practice Scenario",
    selectRole: "Your Role (Who are you?)",
    startPractice: "Start Practice",
    connecting: "Connecting...",
    listening: "Listening...",
    disconnected: "Disconnected",
    speakFreely: "Speak freely",
    endPractice: "End Practice",
    audioStreamed: "Audio streamed in real-time",
    voiceSettings: "Voice Settings",
    selectVoice: "Select AI Voice",
    close: "Close"
  },
  ar: {
    appTitle: "لينجو بوت",
    statusConnected: "متصل",
    statusReady: "مستعد",
    heading: "الممارسة تصنع الكمال",
    subheading: "اختر لغة وسيناريو لبدء جلسة التدريب الصوتي المباشر.",
    targetLanguage: "اللغة المستهدفة",
    practiceScenario: "سيناريو الممارسة",
    selectRole: "دورك (من أنت؟)",
    startPractice: "ابدأ الممارسة",
    connecting: "جاري الاتصال...",
    listening: "أستمع...",
    disconnected: "غير متصل",
    speakFreely: "تحدث بحرية",
    endPractice: "إنهاء الممارسة",
    audioStreamed: "يتم بث الصوت في الوقت الفعلي",
    voiceSettings: "إعدادات الصوت",
    selectVoice: "اختر صوت الذكاء الاصطناعي",
    close: "إغلاق"
  }
};

const AVAILABLE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr'];

export default function App() {
  const { isConnected, isConnecting, error, connect, disconnect, transcript } = useLiveAPI();
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].id);
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0].id);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [uiLang, setUiLang] = useState<'en' | 'ar'>('en');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Puck');

  const t = TRANSLATIONS[uiLang];
  const isRtl = uiLang === 'ar';

  const currentScenarioObj = SCENARIOS.find(s => s.id === selectedScenario);

  // Update selected role when scenario changes
  useEffect(() => {
    if (currentScenarioObj?.roles && currentScenarioObj.roles.length > 0) {
      setSelectedRole(currentScenarioObj.roles[0].id);
    } else {
      setSelectedRole(null);
    }
  }, [selectedScenario, currentScenarioObj]);

  // Update selected voice when language changes (only outside of active session or settings override)
  useEffect(() => {
    const lang = LANGUAGES.find(l => l.id === selectedLanguage);
    if (lang && !hasStarted) {
      setSelectedVoice(lang.voice);
    }
  }, [selectedLanguage, hasStarted]);

  const startSession = () => {
    const lang = LANGUAGES.find(l => l.id === selectedLanguage)?.label || 'Spanish';
    const numScen = SCENARIOS.find(s => s.id === selectedScenario)?.description || 'Casual chat';
    const scenarioObj = SCENARIOS.find(s => s.id === selectedScenario);
    
    let rolePrompt = "";
    if (scenarioObj?.roles && selectedRole) {
      const roleObj = scenarioObj.roles.find(r => r.id === selectedRole);
      if (roleObj) {
        rolePrompt = roleObj.aiPrompt;
      }
    }
    
    let prompt = `You are a friendly, native ${lang} language conversational partner. 
    Your goal is to help the user practice their ${lang}. 
    The current scenario is: ${numScen}. 
    ${rolePrompt ? `\n    ${rolePrompt}` : ''}
    Please speak entirely in ${lang}. Be patient, keep your sentences relatively short and natural, and ask questions to keep the conversation going.
    Do NOT offer translations unless the user explicitly asks for help.
    Use natural spoken idioms.`;

    if (lang === 'Arabic') {
      prompt += " Speak in clear Modern Standard Arabic or a widely understood dialect like Levantine/Egyptian, unless asked otherwise.";
    }
    
    connect(prompt, selectedVoice);
    setHasStarted(true);
  };

  const endSession = () => {
    disconnect();
    setHasStarted(false);
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#fdfbf7] text-[#4a4a40] flex flex-col font-sans selection:bg-[#7d8c72]/30 transition-all">
      <header className="px-8 py-4 flex items-center justify-between border-b border-[#e8e4db] bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7d8c72] rounded-full flex items-center justify-center text-white font-bold">
            <Globe size={20} />
          </div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-[#4a4a40]">{t.appTitle}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-[#4a4a40]">
          <button 
            onClick={() => setShowVoiceSettings(true)}
            className="flex items-center gap-2 hover:bg-[#e8e4db] px-3 py-1.5 rounded-full transition-colors text-[#a1a194] leading-none disabled:opacity-50"
            title={t.voiceSettings}
            disabled={isConnected || isConnecting}
          >
            <Settings size={16} />
            <span className="hidden sm:inline">{t.voiceSettings}</span>
          </button>
          <button 
            onClick={() => setUiLang(uiLang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-2 hover:bg-[#e8e4db] px-3 py-1.5 rounded-full transition-colors text-[#a1a194] leading-none"
            title="Toggle UI Language"
          >
            <Languages size={16} />
            {uiLang === 'en' ? 'عربي' : 'English'}
          </button>
          <div className="flex items-center gap-2 bg-[#f2ede4] px-4 py-1.5 rounded-full border border-transparent">
            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-[#7d8c72] animate-pulse" : "bg-[#a1a194]")} />
            {isConnected ? t.statusConnected : t.statusReady}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-6 md:p-12 relative">
        <AnimatePresence>
          {showVoiceSettings && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowVoiceSettings(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#fdfbf7] p-8 rounded-3xl border border-[#e8e4db] shadow-xl max-w-sm w-full space-y-6"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div className="text-center">
                  <h3 className="text-2xl font-serif font-bold text-[#4a4a40] mb-2">{t.voiceSettings}</h3>
                  <p className="text-sm text-[#a1a194]">{t.selectVoice}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_VOICES.map(voice => (
                    <button
                      key={voice}
                      onClick={() => setSelectedVoice(voice)}
                      className={cn(
                        "px-4 py-3 rounded-xl text-sm font-medium transition-all text-center border shadow-sm",
                        selectedVoice === voice
                          ? "bg-[#7d8c72] text-white border-[#7d8c72]" 
                          : "bg-white text-[#4a4a40] border-[#edeae1] hover:bg-[#f2ede4]"
                      )}
                    >
                      {voice}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowVoiceSettings(false)}
                    className="w-full bg-[#f2ede4] text-[#4a4a40] py-3 rounded-xl font-medium transition-colors hover:bg-[#e8e4db]"
                  >
                    {t.close}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!hasStarted ? (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col justify-center items-center max-w-lg mx-auto w-full gap-8"
            >
              <div className="text-center space-y-3">
                <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-[#4a4a40]">{t.heading}</h2>
                <p className="text-[#a1a194] text-lg">{t.subheading}</p>
              </div>

              <div className="w-full space-y-6 bg-[#f9f7f2] p-6 md:p-8 rounded-3xl border border-[#e8e4db] shadow-sm">
                <div className="space-y-4">
                  <label className="text-[11px] uppercase tracking-widest text-[#a1a194] font-bold mx-1">{t.targetLanguage}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.id}
                        onClick={() => setSelectedLanguage(lang.id)}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-medium transition-all text-left border shadow-sm",
                          uiLang === 'ar' && "text-right",
                          selectedLanguage === lang.id 
                            ? "bg-[#7d8c72] text-white border-[#7d8c72]" 
                            : "bg-white text-[#4a4a40] border-[#edeae1] hover:bg-[#f2ede4]"
                        )}
                      >
                        {uiLang === 'ar' && lang.id === 'arabic' ? 'العربية' : 
                         uiLang === 'ar' && lang.id === 'english' ? 'الإنجليزية' :
                         uiLang === 'ar' && lang.id === 'spanish' ? 'الإسبانية' :
                         uiLang === 'ar' && lang.id === 'french' ? 'الفرنسية' :
                         uiLang === 'ar' && lang.id === 'german' ? 'الألمانية' :
                         uiLang === 'ar' && lang.id === 'japanese' ? 'اليابانية' :
                         lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="text-[11px] uppercase tracking-widest text-[#a1a194] font-bold mx-1">{t.practiceScenario}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SCENARIOS.map(scen => (
                      <button
                        key={scen.id}
                        onClick={() => setSelectedScenario(scen.id)}
                        className={cn(
                          "px-4 py-3 rounded-xl text-left transition-all border shadow-sm",
                          uiLang === 'ar' && "text-right",
                          selectedScenario === scen.id 
                            ? "bg-[#f2ede4] text-[#4a4a40] border-[#d4a373]" 
                            : "bg-white text-[#4a4a40] border-[#edeae1] hover:bg-[#f2ede4]"
                        )}
                      >
                        <div className="text-sm font-bold mb-1">
                          {uiLang === 'ar' && scen.id === 'casual' ? 'محادثة عادية' :
                           uiLang === 'ar' && scen.id === 'public' ? 'محادثة عامة' :
                           uiLang === 'ar' && scen.id === 'coffee' ? 'مقهى' :
                           uiLang === 'ar' && scen.id === 'restaurant' ? 'مطعم' :
                           uiLang === 'ar' && scen.id === 'airport' ? 'المطار' :
                           uiLang === 'ar' && scen.id === 'directions' ? 'الاتجاهات' :
                           uiLang === 'ar' && scen.id === 'hotel' ? 'حجز فندق' :
                           uiLang === 'ar' && scen.id === 'interview' ? 'مقابلة عمل' :
                           scen.label}
                        </div>
                        <div className="text-xs opacity-80 leading-relaxed text-balance text-[#7d8c72]">
                          {uiLang === 'ar' && scen.id === 'casual' ? 'تحدث فقط عن يومك.' :
                           uiLang === 'ar' && scen.id === 'public' ? 'الدردشة في بيئة عامة.' :
                           uiLang === 'ar' && scen.id === 'coffee' ? 'تدرب على طلب القهوة.' :
                           uiLang === 'ar' && scen.id === 'restaurant' ? 'طلب الطعام وتناول العشاء.' :
                           uiLang === 'ar' && scen.id === 'airport' ? 'التنقل في تسجيل الوصول.' :
                           uiLang === 'ar' && scen.id === 'directions' ? 'السؤال عن المواقع والعثور عليها.' :
                           uiLang === 'ar' && scen.id === 'hotel' ? 'تسجيل الوصول في فندق.' :
                           uiLang === 'ar' && scen.id === 'interview' ? 'ممارسة محادثة مهنية.' :
                           scen.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {currentScenarioObj?.roles && (
                  <div className="space-y-4 pt-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#a1a194] font-bold mx-1">{t.selectRole}</label>
                    <div className="grid grid-cols-2 gap-3">
                      {currentScenarioObj.roles.map(role => (
                        <button
                          key={role.id}
                          onClick={() => setSelectedRole(role.id)}
                          className={cn(
                            "px-4 py-3 rounded-xl text-sm font-medium transition-all text-center border shadow-sm",
                            selectedRole === role.id 
                              ? "bg-[#7d8c72] text-white border-[#7d8c72]" 
                              : "bg-white text-[#4a4a40] border-[#edeae1] hover:bg-[#f2ede4]"
                          )}
                        >
                          {uiLang === 'ar' && role.id === 'customer' ? 'أنا الزبون' :
                           uiLang === 'ar' && role.id === 'barista' ? 'أنا الباريستا/النادل' :
                           uiLang === 'ar' && role.id === 'waiter' ? 'أنا النادل' :
                           uiLang === 'ar' && role.id === 'passenger' ? 'أنا المسافر' :
                           uiLang === 'ar' && role.id === 'agent' ? 'أنا الموظف' :
                           uiLang === 'ar' && role.id === 'guest' ? 'أنا الضيف' :
                           uiLang === 'ar' && role.id === 'receptionist' ? 'أنا موظف الاستقبال' :
                           uiLang === 'ar' && role.id === 'interviewee' ? 'أنا المرشح' :
                           uiLang === 'ar' && role.id === 'interviewer' ? 'أنا مدیر التوظیف' :
                           role.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-800 p-4 rounded-xl flex gap-3 text-sm border border-red-200 shadow-inner">
                    <AlertCircle className="shrink-0" size={20} />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  onClick={startSession}
                  disabled={isConnecting}
                  className="w-full bg-[#7d8c72] text-white py-4 px-6 rounded-xl font-medium text-lg hover:bg-[#6b7961] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-sm"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCcw className="animate-spin" size={20} />
                      {t.connecting}
                    </>
                  ) : (
                    <>
                      {t.startPractice}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="active"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col absolute inset-0 items-center justify-center py-12 bg-[radial-gradient(#f2ede4_2px,transparent_2px)] [background-size:24px_24px] outline-none"
            >
              <div className="relative group">
                <div className={cn(
                  "absolute -inset-10 rounded-full blur-3xl opacity-20 transition-all duration-1000",
                  isConnected ? "bg-[#7d8c72] animate-pulse" : "bg-[#e8e4db]"
                )} />
                
                <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border-[6px] border-[#f2ede4] bg-white shadow-xl flex flex-col items-center justify-center overflow-hidden">
                  
                  {/* Simulated audio visualizer rings */}
                  {isConnected && (
                    <>
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-4 border-2 border-[#7d8c72]/30 rounded-full"
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        className="absolute inset-8 border-2 border-[#d4a373]/20 rounded-full"
                      />
                    </>
                  )}

                  <div className="relative z-10 flex flex-col items-center gap-4">
                    {isConnected ? (
                       <Volume2 size={48} className="text-[#7d8c72]" />
                    ) : (
                       <MicOff size={48} className="text-[#a1a194]" />
                    )}
                    <h3 className="text-2xl font-serif font-bold text-[#4a4a40]">
                      {isConnected ? t.listening : t.disconnected}
                    </h3>
                    {isConnected && (
                      <p className="text-xs text-[#a1a194] font-bold uppercase tracking-widest italic">{t.speakFreely}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Transcript Display */}
              {transcript && transcript.length > 0 && (
                <div className="mt-8 overflow-y-auto max-h-40 w-full max-w-xl mx-auto space-y-3 z-10 px-4 scrollbar-thin">
                  {[...transcript].reverse().map((turn, idx) => (
                    <div key={idx} className={cn("flex", turn.role === 'model' ? "justify-start" : "justify-end")}>
                      <div className={cn(
                        "rounded-2xl px-4 py-2 max-w-[85%] text-sm",
                        turn.role === 'model' 
                          ? "bg-white text-[#4a4a40] border border-[#edeae1] rounded-tl-sm shadow-sm"
                          : "bg-[#7d8c72] text-white rounded-tr-sm shadow-sm"
                      )}>
                        {turn.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={cn("flex flex-col items-center gap-6 z-10", transcript.length > 0 ? "mt-8" : "mt-16")}>
                <button
                  onClick={endSession}
                  className="bg-white text-[#ac4a4a] hover:bg-[#faf9f6] px-8 py-4 rounded-xl font-medium transition-all flex items-center gap-3 border border-[#edeae1] shadow-sm"
                >
                  <MicOff size={20} />
                  {t.endPractice}
                </button>
                <div className="text-center text-[#a1a194] text-xs font-medium uppercase tracking-widest max-w-sm text-balance">
                  {t.audioStreamed}
                </div>
              </div>

              {error && (
                <div className="mt-8 bg-red-50 text-red-800 p-4 rounded-xl flex gap-3 text-sm border border-red-200 shadow-inner max-w-md z-10">
                  <AlertCircle className="shrink-0" size={20} />
                  <p>{error}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
