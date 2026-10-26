import type { Exercise } from '../types';

/** 產生 YouTube 搜尋連結（明確標示為「搜尋連結」，不是已驗證影片） */
export const ytSearch = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

type Seed = Omit<Exercise, 'videoUrl' | 'videoStatus'> & { search: string };

const seeds: Seed[] = [
  {
    id: 'pushup', nameZh: '標準伏地挺身', nameEn: 'Push-up', category: 'push',
    muscles: ['胸大肌', '三角肌前束', '肱三頭肌', '核心'], defaultSets: 5, defaultTarget: '8–12 下', search: 'push up proper form tutorial',
    cues: ['雙手略寬於肩，手指朝前', '頭到腳跟成一直線，收緊腹部與臀部', '下放到胸口接近地面，手肘約 45 度'],
    mistakes: ['塌腰或翹屁股', '手肘向外打開 90 度', '只做半程'],
    easier: '斜板伏地挺身或跪姿伏地挺身', harder: '慢速離心（3 秒下放）或腳抬高伏地挺身',
  },
  {
    id: 'wall-pushup', nameZh: '靠牆伏地挺身', nameEn: 'Wall Push-up', category: 'push',
    muscles: ['胸大肌', '三角肌前束', '肱三頭肌'], defaultSets: 5, defaultTarget: '5 下', search: 'wall push up form beginner',
    cues: ['面對牆站立，雙手與肩同高同寬', '身體保持直線，胸口靠近牆面', '推回時呼氣'],
    mistakes: ['站得太近幾乎沒有活動範圍', '聳肩', '腰部下沉'],
    easier: '站得更靠近牆', harder: '腳離牆更遠或改斜板伏地挺身',
  },
  {
    id: 'incline-pushup', nameZh: '斜板伏地挺身', nameEn: 'Incline Push-up', category: 'push',
    muscles: ['胸大肌', '三角肌前束', '肱三頭肌', '核心'], defaultSets: 5, defaultTarget: '6 下', search: 'incline push up form tutorial',
    cues: ['雙手放在穩固的桌面、床緣或椅子', '身體一直線，胸口靠近支撐面', '手肘約 45 度'],
    mistakes: ['使用會滑動的椅子', '屁股翹高', '頭往前伸'],
    easier: '使用更高的支撐面', harder: '使用更低的支撐面或標準伏地挺身',
  },
  {
    id: 'squat', nameZh: '徒手深蹲', nameEn: 'Bodyweight Squat', category: 'squat',
    muscles: ['股四頭肌', '臀大肌', '腿後肌', '核心'], defaultSets: 5, defaultTarget: '12–15 下', search: 'bodyweight squat proper form',
    cues: ['雙腳與肩同寬，腳尖微外', '臀部往後往下坐，膝蓋跟腳尖同方向', '腳跟踩穩，起身時夾臀'],
    mistakes: ['膝蓋內夾', '腳跟離地', '彎腰駝背'],
    easier: '椅子深蹲', harder: '慢速深蹲、停頓深蹲或分腿蹲',
  },
  {
    id: 'chair-squat', nameZh: '椅子深蹲', nameEn: 'Chair Squat (Box Squat)', category: 'squat',
    muscles: ['股四頭肌', '臀大肌'], defaultSets: 5, defaultTarget: '8 下', search: 'chair squat form beginner',
    cues: ['站在穩固椅子前', '臀部往後輕碰椅面即站起', '雙手可前伸保持平衡'],
    mistakes: ['整個人重重坐下', '膝蓋內夾', '用手撐腿站起'],
    easier: '使用較高的椅子', harder: '只輕碰不坐下，或改徒手深蹲',
  },
  {
    id: 'reverse-crunch', nameZh: '反向捲腹', nameEn: 'Reverse Crunch', category: 'core',
    muscles: ['腹直肌（下段）', '腹橫肌'], defaultSets: 5, defaultTarget: '8 下', search: 'reverse crunch proper form',
    cues: ['平躺，屈膝 90 度', '用腹部力量把骨盆捲離地面', '慢慢放下，下背貼地'],
    mistakes: ['用甩腿的慣性', '下背拱起', '憋氣'],
    easier: '縮小活動範圍，只捲一點點', harder: '放下時更慢，或改懸吊抬腿',
  },
  {
    id: 'dead-bug', nameZh: 'Dead Bug 死蟲式', nameEn: 'Dead Bug', category: 'core',
    muscles: ['腹橫肌', '腹直肌', '核心穩定'], defaultSets: 5, defaultTarget: '每側 4 下', search: 'dead bug exercise proper form',
    cues: ['平躺，雙手向上、髖膝 90 度', '下背壓地，對側手腳慢慢伸直', '回到起始再換邊'],
    mistakes: ['下背離地拱起', '動作太快', '憋氣'],
    easier: '只動腳不動手', harder: '手握輕啞鈴或伸展更遠、放慢速度',
  },
  {
    id: 'plank', nameZh: '平板支撐', nameEn: 'Plank', category: 'core',
    muscles: ['腹橫肌', '腹直肌', '肩部穩定'], defaultSets: 5, defaultTarget: '15 秒', search: 'plank proper form tutorial',
    cues: ['手肘在肩膀正下方', '頭到腳跟一直線，收腹夾臀', '自然呼吸'],
    mistakes: ['塌腰', '屁股翹太高', '憋氣'],
    easier: '跪姿平板', harder: '延長秒數或抬起單手／單腳',
  },
  {
    id: 'side-plank', nameZh: '側平板', nameEn: 'Side Plank', category: 'core',
    muscles: ['腹斜肌', '臀中肌', '核心'], defaultSets: 5, defaultTarget: '每側 15 秒', search: 'side plank proper form',
    cues: ['手肘在肩膀正下方', '身體側面成一直線', '髖部往上推不下沉'],
    mistakes: ['髖部下沉', '身體前後傾', '聳肩'],
    easier: '屈膝側平板', harder: '上方腳抬起或延長秒數',
  },
  {
    id: 'bench-press', nameZh: '胸推', nameEn: 'Bench Press / Chest Press', category: 'chest',
    muscles: ['胸大肌', '三角肌前束', '肱三頭肌'], defaultSets: 3, defaultTarget: '8–10 下', search: 'bench press proper form beginner',
    cues: ['肩胛骨後收下壓，雙腳踩穩', '下放到胸線附近', '推起時手腕在手肘正上方'],
    mistakes: ['屁股離開椅面', '手腕後折', '彈胸借力'],
    easier: '器械胸推', harder: '增加重量或暫停式胸推',
  },
  {
    id: 'incline-db-press', nameZh: '上斜啞鈴胸推', nameEn: 'Incline Dumbbell Press', category: 'chest',
    muscles: ['胸大肌上束', '三角肌前束', '肱三頭肌'], defaultSets: 2, defaultTarget: '10–12 下', search: 'incline dumbbell press proper form',
    cues: ['椅背約 30 度', '啞鈴下放到上胸兩側', '推起時微微向內收'],
    mistakes: ['椅背角度太高變成肩推', '手肘完全打開 90 度', '啞鈴互相撞擊'],
    easier: '降低重量或使用器械', harder: '慢速離心或增加重量',
  },
  {
    id: 'cable-fly', nameZh: '滑輪夾胸', nameEn: 'Cable Fly', category: 'chest',
    muscles: ['胸大肌'], defaultSets: 2, defaultTarget: '12–15 下', search: 'cable chest fly proper form',
    cues: ['手肘微彎固定', '想像抱大樹往中間夾', '頂點停 1 秒'],
    mistakes: ['手肘伸直或過度彎曲變成推', '重量太重身體晃動', '聳肩'],
    easier: '蝴蝶機夾胸', harder: '改變滑輪高度或增加頂峰停留',
  },
  {
    id: 'triceps-pushdown', nameZh: '三頭肌下壓', nameEn: 'Triceps Pushdown', category: 'arms',
    muscles: ['肱三頭肌'], defaultSets: 2, defaultTarget: '10–12 下', search: 'triceps pushdown proper form',
    cues: ['上臂貼緊身體', '只動前臂向下壓到伸直', '慢慢回放'],
    mistakes: ['手肘前後移動', '用身體重量壓', '回放太快'],
    easier: '降低重量', harder: '單手下壓或頂峰停留',
  },
  {
    id: 'lat-pulldown', nameZh: '高位下拉', nameEn: 'Lat Pulldown', category: 'back',
    muscles: ['背闊肌', '大圓肌', '肱二頭肌'], defaultSets: 3, defaultTarget: '8–12 下', search: 'lat pulldown proper form',
    cues: ['握距略寬於肩', '胸口挺起，把手肘往下往後拉', '拉到上胸附近'],
    mistakes: ['身體大幅後仰借力', '拉到脖子後方', '只用手臂拉'],
    easier: '降低重量或輔助引體', harder: '增加重量或改引體向上',
  },
  {
    id: 'seated-row', nameZh: '坐姿划船', nameEn: 'Seated Cable Row', category: 'back',
    muscles: ['背闊肌', '菱形肌', '斜方肌中下束'], defaultSets: 3, defaultTarget: '10–12 下', search: 'seated cable row proper form',
    cues: ['背打直，胸口挺起', '手肘貼身往後拉', '肩胛骨後收停 1 秒'],
    mistakes: ['身體前後大幅擺動', '聳肩', '圓背'],
    easier: '降低重量', harder: '單手划船或頂峰停留',
  },
  {
    id: 'face-pull', nameZh: '臉拉', nameEn: 'Face Pull', category: 'back',
    muscles: ['三角肌後束', '斜方肌中下束', '旋轉肌群'], defaultSets: 2, defaultTarget: '12–15 下', search: 'face pull proper form',
    cues: ['滑輪約與臉同高，繩索握把', '往臉部方向拉並外旋', '手肘高於手腕'],
    mistakes: ['重量太重變成划船', '身體後仰', '聳肩'],
    easier: '彈力帶臉拉', harder: '頂峰停留 2 秒',
  },
  {
    id: 'biceps-curl', nameZh: '二頭彎舉', nameEn: 'Biceps Curl', category: 'arms',
    muscles: ['肱二頭肌', '肱肌'], defaultSets: 2, defaultTarget: '10–12 下', search: 'dumbbell biceps curl proper form',
    cues: ['上臂固定在身體兩側', '彎舉到頂點擠壓', '慢慢放下'],
    mistakes: ['甩動身體', '手肘前移', '只做半程'],
    easier: '降低重量', harder: '慢速離心或錘式交替',
  },
  {
    id: 'leg-press', nameZh: '腿推', nameEn: 'Leg Press', category: 'legs',
    muscles: ['股四頭肌', '臀大肌', '腿後肌'], defaultSets: 3, defaultTarget: '8–12 下', search: 'leg press proper form',
    cues: ['雙腳與肩同寬踩在踏板中間', '下放到膝蓋約 90 度', '推起時膝蓋不要鎖死'],
    mistakes: ['下背離開椅背', '膝蓋內夾', '膝蓋完全鎖死'],
    easier: '降低重量與深度', harder: '增加重量或單腳腿推',
  },
  {
    id: 'split-squat', nameZh: '分腿蹲', nameEn: 'Split Squat', category: 'legs',
    muscles: ['股四頭肌', '臀大肌', '內收肌'], defaultSets: 2, defaultTarget: '每側 8–10 下', search: 'split squat proper form',
    cues: ['前後腳拉開一大步', '身體垂直下沉，後膝接近地面', '前腳全腳掌施力'],
    mistakes: ['前膝內夾', '步距太小', '身體前傾太多'],
    easier: '扶牆或扶椅', harder: '手持啞鈴或後腳抬高（保加利亞分腿蹲）',
  },
  {
    id: 'leg-curl', nameZh: '腿後勾', nameEn: 'Leg Curl', category: 'legs',
    muscles: ['腿後肌'], defaultSets: 2, defaultTarget: '12 下', search: 'leg curl machine proper form',
    cues: ['膝蓋對準機器轉軸', '勾到底停 1 秒', '慢慢放回'],
    mistakes: ['臀部抬起', '甩動', '回放太快'],
    easier: '降低重量', harder: '單腳腿後勾',
  },
  {
    id: 'calf-raise', nameZh: '小腿提踵', nameEn: 'Calf Raise', category: 'legs',
    muscles: ['腓腸肌', '比目魚肌'], defaultSets: 2, defaultTarget: '15 下', search: 'calf raise proper form',
    cues: ['前腳掌踩在台階邊緣', '腳跟下放到伸展再提起到最高', '頂點停 1 秒'],
    mistakes: ['彈跳式快速做', '活動範圍太小', '膝蓋彎曲借力'],
    easier: '平地提踵', harder: '單腳提踵或負重',
  },
  {
    id: 'rdl', nameZh: '羅馬尼亞硬舉', nameEn: 'Romanian Deadlift', category: 'legs',
    muscles: ['腿後肌', '臀大肌', '豎脊肌'], defaultSets: 3, defaultTarget: '8–10 下', search: 'romanian deadlift proper form',
    cues: ['膝蓋微彎固定，髖部往後推', '槓鈴／啞鈴貼著大腿下滑', '感覺腿後拉伸即夾臀站起'],
    mistakes: ['圓背', '變成深蹲', '重量離身體太遠'],
    easier: '啞鈴或壺鈴、縮小範圍', harder: '單腳羅馬尼亞硬舉',
  },
  {
    id: 'hip-thrust', nameZh: '臀推', nameEn: 'Hip Thrust', category: 'legs',
    muscles: ['臀大肌', '腿後肌'], defaultSets: 2, defaultTarget: '10–12 下', search: 'hip thrust proper form',
    cues: ['上背靠在椅子邊緣', '下巴微收，用臀部把髖推高', '頂點夾臀停 1 秒'],
    mistakes: ['腰部過度拱起', '腳放太遠變成腿後', '頂點沒有夾臀'],
    easier: '地板臀橋', harder: '增加重量或單腳臀推',
  },
  {
    id: 'leg-extension', nameZh: '腿伸展', nameEn: 'Leg Extension', category: 'legs',
    muscles: ['股四頭肌'], defaultSets: 2, defaultTarget: '12–15 下', search: 'leg extension machine proper form',
    cues: ['膝蓋對準機器轉軸', '伸直到頂點停 1 秒', '慢慢放回'],
    mistakes: ['甩動', '臀部離開椅面', '重量太重'],
    easier: '降低重量', harder: '單腳或頂峰停留',
  },
  {
    id: 'full-stretch', nameZh: '全身伸展', nameEn: 'Full Body Stretch', category: 'stretch',
    muscles: ['全身'], defaultSets: 1, defaultTarget: '10–30 分鐘', search: 'full body stretching routine follow along',
    cues: ['每個伸展停 20–40 秒', '緩慢呼吸，不彈震', '感到拉伸但不痛'],
    mistakes: ['憋氣', '彈震式拉伸', '拉到疼痛'],
    easier: '縮短時間、降低幅度', harder: '延長停留時間',
  },
  {
    id: 'reverse-fly', nameZh: '反向飛鳥', nameEn: 'Reverse Fly', category: 'back',
    muscles: ['三角肌後束', '菱形肌'], defaultSets: 2, defaultTarget: '12–15 下', search: 'reverse fly proper form',
    cues: ['身體前傾或使用反向蝴蝶機', '手肘微彎往兩側打開', '肩胛後收'],
    mistakes: ['重量太重聳肩', '甩動', '手肘彎太多'],
    easier: '彈力帶', harder: '頂峰停留',
  },
  {
    id: 'cardio', nameZh: '有氧（飛輪／快走）', nameEn: 'Steady Cardio', category: 'cardio',
    muscles: ['心肺'], defaultSets: 1, defaultTarget: '10–20 分鐘', search: 'incline treadmill walk zone 2 cardio',
    cues: ['可說話但有點喘的強度', '保持穩定節奏', '睡眠不足時降低強度'],
    mistakes: ['每天都衝到力竭', '忽略頭暈或胸悶'],
    easier: '平地快走', harder: '提高坡度或阻力',
  },
  {
    id: 'hasfit-hiit', nameZh: 'HASfit 15 分鐘初學者 HIIT', nameEn: 'HASfit 15 Min Cardio HIIT for Beginners', category: 'cardio',
    muscles: ['全身', '心肺'], defaultSets: 1, defaultTarget: '約 15 分鐘', search: '',
    cues: ['無跳躍、低衝擊', '跟著影片節奏，可隨時降低強度'],
    mistakes: ['睡眠不足仍硬撐高強度', '出現頭暈胸悶仍繼續'],
    easier: '只做前半段或用原地踏步取代', harder: '動作幅度加大（不需要追求跳躍）',
  },
];

export const HIIT_VIDEO = {
  title: 'HASfit - 15 Min Cardio HIIT Workout for Beginners Fat Loss at Home - No Jumping, Full Body, Low Impact',
  youtubeId: 'o00uuJStrco',
  youtubeUrl: 'https://www.youtube.com/watch?v=o00uuJStrco',
  officialUrl: 'https://hasfit.com/workouts/beginner-easy/15-min-cardio-hiit-workout-for-beginners/',
  thumbnail: 'https://i.ytimg.com/vi/o00uuJStrco/hqdefault.jpg',
  /** 2026-10-26 透過 YouTube oEmbed 確認影片存在，標題與作者 HASfit 相符 */
  verifiedNote: '2026-10-26 以 YouTube oEmbed 確認',
};

export const defaultExercises: Exercise[] = seeds.map(({ search, ...s }) =>
  s.id === 'hasfit-hiit'
    ? { ...s, videoUrl: HIIT_VIDEO.youtubeUrl, videoStatus: 'verified' }
    : { ...s, videoUrl: ytSearch(search), videoStatus: 'search' },
);
