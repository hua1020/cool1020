import React, { useState, useEffect, useMemo } from 'react';
import { 
  Utensils, Trash2, ChevronLeft, ChevronRight, 
  Dumbbell, PenTool, Wallet, DollarSign, Star, TrendingUp, Activity
} from 'lucide-react';

const GEMINI_API_KEY = "AIzaSyD4xI-16qTVBnPKrUxSmtrnJQs9rbYGLpk"; 

const App = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date()); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('diet');
  const [dietMode, setDietMode] = useState('ai'); 

  // AI 建議狀態
  const [dietAdvice, setDietAdvice] = useState("我是營養師，錄入後我會為你分析。");
  const [workoutAdvice, setWorkoutAdvice] = useState("我是教練，紀錄後我會給你建議。");
  const [diaryAdvice, setDiaryAdvice] = useState("我是心理師，讓我陪你聊聊。");
  const [financeAdvice, setFinanceAdvice] = useState("我是理財顧問，幫你優化開支。");

  // 資料存儲
  const [meals, setMeals] = useState(() => JSON.parse(localStorage.getItem('diet_data')) || []);
  const [workouts, setWorkouts] = useState(() => JSON.parse(localStorage.getItem('workout_data')) || []);
  const [diaries, setDiaries] = useState(() => JSON.parse(localStorage.getItem('diary_data')) || {});
  const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem('finance_data')) || []);

  // 常用清單
  const [dietFavs, setDietFavs] = useState(() => JSON.parse(localStorage.getItem('diet_favs')) || [
    { name: '茶葉蛋', calories: 75, protein: 7 },
    { name: '高蛋白', calories: 120, protein: 25 }
  ]);
  const [workoutFavs, setWorkoutFavs] = useState(() => JSON.parse(localStorage.getItem('workout_favs')) || [
    { name: '臥推', weight: 60, sets: 4, reps: 8 },
    { name: '深蹲', weight: 80, sets: 4, reps: 8 }
  ]);
  const [financeFavs, setFinanceFavs] = useState(() => JSON.parse(localStorage.getItem('finance_favs')) || [
    { name: '晚餐', amount: 100, category: '飲食' }
  ]);

  const [aiDietInput, setAiDietInput] = useState('');
  const [manualDiet, setManualDiet] = useState({ name: '', calories: '', protein: '' });
  const [workoutInput, setWorkoutInput] = useState({ name: '', weight: '', sets: '', reps: '' });
  const [diaryText, setDiaryText] = useState('');
  const [financeInput, setFinanceInput] = useState({ name: '', amount: '', category: '飲食' });

  const goals = { calories: 2650, protein: 140 };

  useEffect(() => {
    localStorage.setItem('diet_data', JSON.stringify(meals));
    localStorage.setItem('workout_data', JSON.stringify(workouts));
    localStorage.setItem('diary_data', JSON.stringify(diaries));
    localStorage.setItem('finance_data', JSON.stringify(transactions));
    localStorage.setItem('diet_favs', JSON.stringify(dietFavs));
    localStorage.setItem('workout_favs', JSON.stringify(workoutFavs));
    localStorage.setItem('finance_favs', JSON.stringify(financeFavs));
  }, [meals, workouts, diaries, transactions, dietFavs, workoutFavs, financeFavs]);

  useEffect(() => { setDiaryText(diaries[selectedDate] || ''); }, [selectedDate, diaries]);

  const dailyMeals = useMemo(() => meals.filter(m => m.date === selectedDate), [meals, selectedDate]);
  const dailyWorkouts = useMemo(() => workouts.filter(w => w.date === selectedDate), [workouts, selectedDate]);
  const dailyFinance = useMemo(() => transactions.filter(t => t.date === selectedDate), [transactions, selectedDate]);
  const totals = useMemo(() => dailyMeals.reduce((acc, curr) => ({
    calories: acc.calories + (Number(curr.calories) || 0), protein: acc.protein + (Number(curr.protein) || 0),
  }), { calories: 0, protein: 0 }), [dailyMeals]);
  const dailyExp = useMemo(() => dailyFinance.reduce((sum, t) => sum + Number(t.amount), 0), [dailyFinance]);

  const callGemini = async (prompt, systemPrompt, isJson = false) => {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\n\n內容：${prompt}` }] }] }) });
      const result = await response.json();
      let text = result.candidates[0].content.parts[0].text;
      if (isJson) { const jsonMatch = text.match(/\{[\s\S]*\}/); text = jsonMatch ? jsonMatch[0] : null; }
      return text;
    } catch (err) { return null; }
  };

  const handleAddMeal = async (e) => {
    e.preventDefault(); setIsAnalyzing(true);
    try {
      let newMeal;
      if (dietMode === 'ai') {
        const json = await callGemini(aiDietInput, "營養師，轉 JSON: {\"calories\": 500, \"protein\": 30, \"name\": \"名稱\"}", true);
        if (json) { newMeal = { ...JSON.parse(json), id: Date.now(), date: selectedDate }; setAiDietInput(''); }
      } else {
        if (!manualDiet.name) return;
        newMeal = { ...manualDiet, id: Date.now(), date: selectedDate };
        setManualDiet({ name: '', calories: '', protein: '' });
      }
      if (newMeal) {
        setMeals(prev => [...prev, newMeal]);
        const adv = await callGemini(`攝取:${newMeal.calories}kcal`, "營養師，給增肌建議，30字內。");
        if (adv) setDietAdvice(adv);
      }
    } finally { setIsAnalyzing(false); }
  };

  const handleAddWorkout = async (e) => {
    e.preventDefault(); if (!workoutInput.name) return;
    const newW = { ...workoutInput, id: Date.now(), date: selectedDate };
    setWorkouts(prev => [...prev, newW]);
    setWorkoutInput({ name: '', weight: '', sets: '', reps: '' });
    const adv = await callGemini(newW.name, "教練，給訓練鼓勵，30字內。");
    if (adv) setWorkoutAdvice(adv);
  };

  const handleAddFinance = async (e) => {
    e.preventDefault(); if (!financeInput.name) return;
    const newF = { ...financeInput, id: Date.now(), date: selectedDate };
    setTransactions(prev => [...prev, newF]);
    setFinanceInput({ name: '', amount: '', category: '飲食' });
    const adv = await callGemini(`${newF.amount}元`, "理財顧問，給省錢金句，20字內。");
    if (adv) setFinanceAdvice(adv);
  };

  const handleDiaryAI = async () => {
    setIsAnalyzing(true);
    const adv = await callGemini(diaryText, "心理導師，針對壓力給予溫暖回饋，40字內。");
    if (adv) setDiaryAdvice(adv);
    setIsAnalyzing(false);
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear(); const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null); 
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d).toISOString().split('T')[0]);
    return days;
  }, [currentMonth]);

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: window.innerWidth > 850 ? '300px 1fr' : '1fr', gap: '20px' }}>
        <aside>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>{currentMonth.getMonth()+1}月</h3>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()-1)))} style={btnMiniStyle}><ChevronLeft size={14}/></button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth()+1)))} style={btnMiniStyle}><ChevronRight size={14}/></button>
              </div>
            </div>
            <div style={calendarGridStyle}>
              {['日','一','二','三','四','五','六'].map(d => <div key={d} style={weekLabelStyle}>{d}</div>)}
              {calendarDays.map((date, idx) => (
                <div key={idx} onClick={() => date && setSelectedDate(date)} style={{ ...dayStyle, backgroundColor: date === selectedDate ? '#111827' : 'transparent', color: date === selectedDate ? 'white' : (date ? '#374151' : 'transparent') }}>
                  {date ? date.split('-')[2] : ''}
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...cardStyle, marginTop: '15px' }}>
             <ProgressStat label="熱量" current={totals.calories} goal={goals.calories} unit="kcal" color="#10b981" />
             <ProgressStat label="蛋白質" current={totals.protein} goal={goals.protein} unit="g" color="#3b82f6" />
             <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>今日支出</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#b45309' }}>$ {dailyExp}</div>
             </div>
          </div>
        </aside>

        <main>
          <div style={tabContainerStyle}>
            <TabBtn active={activeTab === 'diet'} onClick={() => setActiveTab('diet')} icon={<Utensils size={16}/>} label="飲食" />
            <TabBtn active={activeTab === 'workout'} onClick={() => setActiveTab('workout')} icon={<Dumbbell size={16}/>} label="訓練" />
            <TabBtn active={activeTab === 'diary'} onClick={() => setActiveTab('diary')} icon={<PenTool size={16}/>} label="日記" />
            <TabBtn active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={<Wallet size={16}/>} label="記帳" />
          </div>

          <div style={cardStyle}>
            {activeTab === 'diet' && (
              <div>
                <AdviceBox icon={<Activity color="#10b981" />} title="營養師" text={dietAdvice} bgColor="#f0fdf4" borderColor="#bbf7d0" />
                <div style={favSectionStyle}>
                  <Star size={14} color="#f59e0b" />
                  <select style={favSelectStyle} onChange={(e) => setManualDiet(dietFavs[e.target.value] || manualDiet)}>
                    <option value="">常用飲食</option>
                    {dietFavs.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
                  </select>
                </div>
                <div style={modeToggleStyle}><button onClick={() => setDietMode('ai')} style={dietMode === 'ai' ? activeModeBtn : inactiveModeBtn}>AI</button><button onClick={() => setDietMode('manual')} style={dietMode === 'manual' ? activeModeBtn : inactiveModeBtn}>手動</button></div>
                <form onSubmit={handleAddMeal} style={formStyle}>
                  {dietMode === 'ai' ? <textarea style={inputStyle} value={aiDietInput} onChange={e => setAiDietInput(e.target.value)} placeholder="吃了什麼..." /> : 
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px' }}>
                    <input style={inputStyle} placeholder="名稱" value={manualDiet.name} onChange={e => setManualDiet({...manualDiet, name: e.target.value})} />
                    <input style={inputStyle} placeholder="kcal" type="number" value={manualDiet.calories} onChange={e => setManualDiet({...manualDiet, calories: e.target.value})} />
                    <input style={inputStyle} placeholder="蛋白" type="number" value={manualDiet.protein} onChange={e => setManualDiet({...manualDiet, protein: e.target.value})} />
                    <button type="button" onClick={() => setDietFavs([...dietFavs, manualDiet])} style={btnFavStyle}><Star size={16}/></button>
                  </div>}
                  <button disabled={isAnalyzing} style={btnSubmitStyle}>儲存</button>
                </form>
                {dailyMeals.map(m => <ListItem key={m.id} title={m.name} subtitle={`${m.calories}kcal`} onDelete={() => setMeals(meals.filter(i => i.id !== m.id))} />)}
              </div>
            )}

            {activeTab === 'workout' && (
              <div>
                <AdviceBox icon={<TrendingUp color="#3b82f6" />} title="教練" text={workoutAdvice} bgColor="#eff6ff" borderColor="#bfdbfe" />
                <div style={favSectionStyle}>
                  <Star size={14} color="#f59e0b" />
                  <select style={favSelectStyle} onChange={(e) => setWorkoutInput(workoutFavs[e.target.value] || workoutInput)}>
                    <option value="">常用訓練</option>
                    {workoutFavs.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
                  </select>
                </div>
                <form onSubmit={handleAddWorkout} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: '8px' }}>
                  <input style={inputStyle} placeholder="動作" value={workoutInput.name} onChange={e => setWorkoutInput({...workoutInput, name: e.target.value})} />
                  <input style={inputStyle} placeholder="kg" type="number" value={workoutInput.weight} onChange={e => setWorkoutInput({...workoutInput, weight: e.target.value})} />
                  <input style={inputStyle} placeholder="組" type="number" value={workoutInput.sets} onChange={e => setWorkoutInput({...workoutInput, sets: e.target.value})} />
                  <input style={inputStyle} placeholder="下" type="number" value={workoutInput.reps} onChange={e => setWorkoutInput({...workoutInput, reps: e.target.value})} />
                  <button type="button" onClick={() => setWorkoutFavs([...workoutFavs, workoutInput])} style={btnFavStyle}><Star size={16}/></button>
                  <button style={{ ...btnSubmitStyle, gridColumn: 'span 5' }}>新增訓練</button>
                </form>
                {dailyWorkouts.map(w => <ListItem key={w.id} title={w.name} subtitle={`${w.weight}kg`} onDelete={() => setWorkouts(workouts.filter(i => i.id !== w.id))} />)}
              </div>
            )}

            {activeTab === 'finance' && (
              <div>
                <AdviceBox icon={<DollarSign color="#b45309" />} title="理財" text={financeAdvice} bgColor="#fffbeb" borderColor="#fde68a" />
                <div style={favSectionStyle}>
                   <Star size={14} color="#f59e0b" />
                   <select style={favSelectStyle} onChange={(e) => setFinanceInput(financeFavs[e.target.value] || financeInput)}>
                    <option value="">常用支出</option>
                    {financeFavs.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
                  </select>
                </div>
                <form onSubmit={handleAddFinance} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px' }}>
                  <input style={inputStyle} placeholder="項目" value={financeInput.name} onChange={e => setFinanceInput({...financeInput, name: e.target.value})} />
                  <input style={inputStyle} placeholder="金額" type="number" value={financeInput.amount} onChange={e => setFinanceInput({...financeInput, amount: e.target.value})} />
                  <select style={inputStyle} value={financeInput.category} onChange={e => setFinanceInput({...financeInput, category: e.target.value})}>
                    <option>飲食</option><option>健身</option><option>麻將紀錄</option>
                  </select>
                  <button type="button" onClick={() => setFinanceFavs([...financeFavs, financeInput])} style={btnFavStyle}><Star size={16}/></button>
                  <button style={{ ...btnSubmitStyle, gridColumn: 'span 4', backgroundColor: '#b45309' }}>新增支出</button>
                </form>
                {dailyFinance.map(t => <ListItem key={t.id} title={t.name} subtitle={`$${t.amount}`} onDelete={() => setTransactions(transactions.filter(i => i.id !== t.id))} />)}
              </div>
            )}

            {activeTab === 'diary' && (
              <div>
                <AdviceBox icon={<Activity color="#ec4899" />} title="心理" text={diaryAdvice} bgColor="#fdf2f8" borderColor="#fbcfe8" />
                <textarea style={{ ...inputStyle, height: '150px', marginTop: '10px' }} value={diaryText} onChange={e => setDiaryText(e.target.value)} placeholder="心情..." />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button onClick={handleDiaryAI} style={{ ...btnSubmitStyle, flex: 1, backgroundColor: '#6b7280' }}>AI 諮詢</button>
                  <button onClick={() => setDiaries({...diaries, [selectedDate]: diaryText})} style={{ ...btnSubmitStyle, flex: 1 }}>儲存日記</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// 樣式組件
const AdviceBox = ({ icon, title, text, bgColor, borderColor }) => (
  <div style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, padding: '10px', borderRadius: '10px', display: 'flex', gap: '10px' }}>
    <div style={{ marginTop: '2px' }}>{icon}</div>
    <div><div style={{ fontWeight: '800', fontSize: '13px' }}>{title}</div><div style={{ fontSize: '12px', color: '#374151' }}>{text}</div></div>
  </div>
);
const ProgressStat = ({ label, current, goal, unit, color }) => (
  <div style={{ padding: '8px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '5px' }}>
    <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 'bold' }}>{label}</div>
    <div style={{ fontSize: '13px', fontWeight: '900' }}>{Math.round(current)} / {goal}</div>
    <div style={{ width: '100%', height: '3px', backgroundColor: '#e5e7eb', borderRadius: '10px', marginTop: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min((current/goal)*100, 100)}%`, height: '100%', backgroundColor: color }} />
    </div>
  </div>
);
const ListItem = ({ title, subtitle, onDelete }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
    <div><div style={{ fontWeight: '700', fontSize: '12px' }}>{title}</div><div style={{ fontSize: '10px', color: '#6b7280' }}>{subtitle}</div></div>
    <button onClick={onDelete} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={14}/></button>
  </div>
);
const TabBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', backgroundColor: active ? '#111827' : 'white', color: active ? 'white' : '#6b7280' }}>{icon} {label}</button>
);

const containerStyle = { backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '15px', fontFamily: 'system-ui' };
const cardStyle = { backgroundColor: 'white', borderRadius: '15px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
const calendarGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' };
const weekLabelStyle = { textAlign: 'center', fontSize: '9px', color: '#9ca3af', fontWeight: 'bold' };
const dayStyle = { textAlign: 'center', padding: '5px 0', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' };
const btnMiniStyle = { border: '1px solid #e5e7eb', backgroundColor: 'white', borderRadius: '5px', cursor: 'pointer' };
const tabContainerStyle = { display: 'flex', gap: '5px', marginBottom: '15px' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', boxSizing: 'border-box' };
const formStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const btnSubmitStyle = { backgroundColor: '#059669', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' };
const modeToggleStyle = { display: 'flex', gap: '5px', marginBottom: '10px', backgroundColor: '#f3f4f6', padding: '3px', borderRadius: '8px' };
const activeModeBtn = { flex: 1, padding: '4px', border: 'none', borderRadius: '6px', backgroundColor: 'white', fontSize: '11px', fontWeight: 'bold' };
const inactiveModeBtn = { flex: 1, padding: '4px', border: 'none', backgroundColor: 'transparent', color: '#6b7280', fontSize: '11px' };
const favSectionStyle = { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff7ed', padding: '8px 12px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #ffedd5' };
const favSelectStyle = { flex: 1, border: 'none', backgroundColor: 'transparent', fontSize: '12px', outline: 'none', cursor: 'pointer' };
const btnFavStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#f59e0b', cursor: 'pointer' };

export default App;