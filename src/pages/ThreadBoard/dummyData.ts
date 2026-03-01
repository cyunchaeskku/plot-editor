export interface PostDialogue {
  character_name: string;
  character_color: string;
  text: string;
}

// ── Plot types ────────────────────────────────────────────────────────────────

export interface PlotContentPreview {
  scene_heading: string;
  scene_location: string;
  scene_time: string;
  dialogues: PostDialogue[];
}

export type PlotBlockType = 'dialogue' | 'narration' | 'stage_direction';

export interface PlotBlock {
  type: PlotBlockType;
  character_name?: string;
  character_color?: string;
  text: string;
}

export interface PlotScene {
  scene_heading: string;
  scene_location: string;
  scene_time: string;
  blocks: PlotBlock[];
}

export interface PlotFullContent {
  type: 'plot';
  scenes: PlotScene[];
}

// ── Novel types ───────────────────────────────────────────────────────────────

export interface NovelContentPreview {
  chapter_title: string;
  excerpt: string;
}

export interface NovelFullContent {
  type: 'novel';
  chapter_title: string;
  paragraphs: string[];
}

// ── Post union ────────────────────────────────────────────────────────────────

interface BasePost {
  id: number;
  author_name: string;
  author_color: string;
  created_at: string;
  work_title: string;
  episode_title: string;
  post_title: string;
  description: string;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
}

export interface PlotPost extends BasePost {
  work_type: 'plot';
  content_preview: PlotContentPreview;
  full_content: PlotFullContent;
}

export interface NovelPost extends BasePost {
  work_type: 'novel';
  content_preview: NovelContentPreview;
  full_content: NovelFullContent;
}

export type Post = PlotPost | NovelPost;

// ── Comment ───────────────────────────────────────────────────────────────────

export interface Comment {
  id: number;
  post_id: number;
  author_name: string;
  author_color: string;
  text: string;
  created_at: string;
  like_count: number;
}

// ── Dummy posts ───────────────────────────────────────────────────────────────

export const DUMMY_POSTS: Post[] = [
  // ── 1. 안나 카레니나 (plot) ────────────────────────────────────────────────
  {
    id: 1,
    work_type: 'plot',
    author_name: '김소연',
    author_color: '#AD1B02',
    created_at: '2일 전',
    work_title: '안나 카레니나',
    episode_title: 'EP 1 무도회장',
    post_title: '무도회장 에피소드 피드백 요청',
    description: '최근 작품 차용 아이디어 공유',
    content_preview: {
      scene_heading: 'S#1 재밌는 씬',
      scene_location: '재밌는 장소',
      scene_time: '재밌는 시간',
      dialogues: [
        { character_name: '브론스키', character_color: '#AD1B02', text: '나는 네가 싫다, 아니 아니 좋다...' },
        { character_name: '키티', character_color: '#E88D14', text: '너무하네요, 백작.' },
        { character_name: '안나', character_color: '#8B1A00', text: '두 분 다 참... 사교계란 이런 것이지요.' },
      ],
    },
    full_content: {
      type: 'plot',
      scenes: [
        {
          scene_heading: 'S#1 무도회장',
          scene_location: '페테르부르크 귀족 무도회장',
          scene_time: '겨울 밤',
          blocks: [
            { type: 'narration', text: '찬란한 샹들리에 아래, 페테르부르크 최고의 무도회가 열린다. 귀족들의 속삭임과 왈츠 선율이 교차한다.' },
            { type: 'stage_direction', text: '브론스키, 키티를 발견하고 천천히 다가선다.' },
            { type: 'dialogue', character_name: '브론스키', character_color: '#AD1B02', text: '나는 네가 싫다, 아니 아니... 좋다.' },
            { type: 'dialogue', character_name: '키티', character_color: '#E88D14', text: '너무하네요, 백작. 장난이 지나치세요.' },
            { type: 'dialogue', character_name: '안나', character_color: '#8B1A00', text: '두 분 다 참... 사교계란 이런 것이지요.' },
            { type: 'narration', text: '안나의 눈이 잠시 브론스키에게 머문다. 찰나의 시선, 운명의 첫 교차.' },
            { type: 'stage_direction', text: '오케스트라가 다음 왈츠를 시작한다.' },
            { type: 'dialogue', character_name: '브론스키', character_color: '#AD1B02', text: '안나 아르카디예브나, 이번 무도회의 여왕은 당신이시군요.' },
            { type: 'dialogue', character_name: '안나', character_color: '#8B1A00', text: '아첨이 지나치세요, 브론스키 백작.' },
          ],
        },
        {
          scene_heading: 'S#2 복도의 마주침',
          scene_location: '무도회장 밖 대리석 복도',
          scene_time: '같은 밤, 늦은 시각',
          blocks: [
            { type: 'stage_direction', text: '안나, 숄을 걸치며 복도에 홀로 서 있다.' },
            { type: 'dialogue', character_name: '브론스키', character_color: '#AD1B02', text: '혼자 계신 건가요?' },
            { type: 'dialogue', character_name: '안나', character_color: '#8B1A00', text: '남편을 기다리고 있습니다.' },
            { type: 'narration', text: '하지만 발걸음은 남편 쪽이 아닌 창가로 향한다.' },
            { type: 'dialogue', character_name: '브론스키', character_color: '#AD1B02', text: '언제 모스크바에 오셨습니까?' },
            { type: 'dialogue', character_name: '안나', character_color: '#8B1A00', text: '오늘 도착했어요. 오빠 스티바 일로...' },
            { type: 'narration', text: '두 사람 사이에 짧은 침묵. 창밖으로 눈이 내린다.' },
          ],
        },
      ],
    },
    tags: ['희곡', '로맨스', '플롯'],
    view_count: 364,
    like_count: 83,
    comment_count: 2,
  },

  // ── 2. 파우스트 (plot) ────────────────────────────────────────────────────
  {
    id: 2,
    work_type: 'plot',
    author_name: '이현우',
    author_color: '#1B4FAD',
    created_at: '3일 전',
    work_title: '파우스트',
    episode_title: 'EP 3 계약',
    post_title: '메피스토펠레스 캐릭터 설계 공유',
    description: '악마 계약 장면 대사 초안입니다',
    content_preview: {
      scene_heading: 'S#3 지하 서재',
      scene_location: '파우스트의 서재',
      scene_time: '자정',
      dialogues: [
        { character_name: '파우스트', character_color: '#2E4057', text: '그래, 나는 이 세상 모든 지식을 얻고 싶다.' },
        { character_name: '메피스토', character_color: '#C41E3A', text: '훌륭하오. 그 소원, 제가 이루어 드리지요.' },
      ],
    },
    full_content: {
      type: 'plot',
      scenes: [
        {
          scene_heading: 'S#3 지하 서재',
          scene_location: '파우스트의 서재',
          scene_time: '자정',
          blocks: [
            { type: 'narration', text: '한밤중. 수천 권의 책이 쌓인 파우스트의 서재. 촛불 하나만이 타오른다.' },
            { type: 'stage_direction', text: '파우스트, 무릎을 꿇고 마법진을 그린다.' },
            { type: 'dialogue', character_name: '파우스트', character_color: '#2E4057', text: '그래, 나는 이 세상 모든 지식을 얻고 싶다. 그것이 나의 저주이자 갈망이다.' },
            { type: 'dialogue', character_name: '메피스토', character_color: '#C41E3A', text: '훌륭하오. 그 소원, 제가 이루어 드리지요.' },
            { type: 'stage_direction', text: '메피스토펠레스, 연기 속에서 천천히 모습을 드러낸다.' },
            { type: 'dialogue', character_name: '파우스트', character_color: '#2E4057', text: '당신은... 무엇을 원하오?' },
            { type: 'dialogue', character_name: '메피스토', character_color: '#C41E3A', text: '이승에서 당신이 만족하는 그 순간—오직 그 한 순간만.' },
            { type: 'narration', text: '파우스트는 한참을 생각한다. 그는 자신이 결코 만족하지 않을 것임을 안다.' },
            { type: 'dialogue', character_name: '파우스트', character_color: '#2E4057', text: '좋소. 계약하겠소.' },
          ],
        },
        {
          scene_heading: 'S#4 계약 이후',
          scene_location: '파우스트의 서재, 동이 틀 무렵',
          scene_time: '새벽',
          blocks: [
            { type: 'stage_direction', text: '새벽. 파우스트, 창가에 홀로 앉아 있다. 계약서가 불꽃 속에 사라진다.' },
            { type: 'narration', text: '지식의 문이 열렸다. 그러나 그것이 구원인지 파멸인지, 파우스트는 알 수 없었다.' },
            { type: 'dialogue', character_name: '파우스트', character_color: '#2E4057', text: '(독백) 이제 나는 무엇이든 알 수 있다. 그런데... 왜 이렇게 쓸쓸하지?' },
          ],
        },
      ],
    },
    tags: ['희곡', '판타지', '철학'],
    view_count: 218,
    like_count: 45,
    comment_count: 5,
  },

  // ── 3. 벚꽃 지는 봄날 (plot) ─────────────────────────────────────────────
  {
    id: 3,
    work_type: 'plot',
    author_name: '박지현',
    author_color: '#2D6A4F',
    created_at: '5일 전',
    work_title: '벚꽃 지는 봄날',
    episode_title: 'EP 2 이별',
    post_title: '이별 장면 감정선 고민',
    description: '주인공 감정 표현에 피드백 부탁드려요',
    content_preview: {
      scene_heading: 'S#7 벚꽃 나무 아래',
      scene_location: '캠퍼스 중앙 광장',
      scene_time: '봄 저녁',
      dialogues: [
        { character_name: '서준', character_color: '#2D6A4F', text: '우리... 이제 각자의 길을 가는 게 맞겠지.' },
        { character_name: '하은', character_color: '#E69BAC', text: '그래도 돼요? 정말로 그래도 돼요?' },
        { character_name: '서준', character_color: '#2D6A4F', text: '...' },
      ],
    },
    full_content: {
      type: 'plot',
      scenes: [
        {
          scene_heading: 'S#7 벚꽃 나무 아래',
          scene_location: '캠퍼스 중앙 광장',
          scene_time: '봄 저녁',
          blocks: [
            { type: 'narration', text: '봄날 저녁. 벚꽃 잎이 흩날리는 캠퍼스 광장. 두 사람이 나란히 서 있다.' },
            { type: 'stage_direction', text: '서준, 오랫동안 말을 꺼내지 못한다.' },
            { type: 'dialogue', character_name: '서준', character_color: '#2D6A4F', text: '우리... 이제 각자의 길을 가는 게 맞겠지.' },
            { type: 'dialogue', character_name: '하은', character_color: '#E69BAC', text: '그래도 돼요? 정말로 그래도 돼요?' },
            { type: 'dialogue', character_name: '서준', character_color: '#2D6A4F', text: '...' },
            { type: 'narration', text: '서준이 아무 말도 하지 않는다. 하은은 그 침묵에서 이미 답을 읽는다.' },
            { type: 'dialogue', character_name: '하은', character_color: '#E69BAC', text: '아무 말 안 해줄 거예요?' },
            { type: 'dialogue', character_name: '서준', character_color: '#2D6A4F', text: '하은아...' },
            { type: 'stage_direction', text: '벚꽃 한 잎이 하은의 어깨 위로 떨어진다. 서준, 그것을 말없이 바라본다.' },
          ],
        },
        {
          scene_heading: 'S#8 혼자',
          scene_location: '캠퍼스 외곽 골목',
          scene_time: '같은 저녁, 조금 후',
          blocks: [
            { type: 'stage_direction', text: '광장을 벗어나 골목. 하은, 혼자 걷는다.' },
            { type: 'narration', text: '울지 않겠다고 다짐했다. 그러나 눈물은 다짐을 비웃는다.' },
            { type: 'dialogue', character_name: '하은', character_color: '#E69BAC', text: '(속삭이듯) 바보 같은 사람.' },
          ],
        },
      ],
    },
    tags: ['현대극', '멜로', '청춘'],
    view_count: 502,
    like_count: 127,
    comment_count: 11,
  },

  // ── 4. 탐정 K (plot) ─────────────────────────────────────────────────────
  {
    id: 4,
    work_type: 'plot',
    author_name: '최민준',
    author_color: '#7B2D8B',
    created_at: '1주일 전',
    work_title: '탐정 K',
    episode_title: 'EP 5 진실',
    post_title: '반전 구조 의견 구합니다',
    description: '마지막 씬 반전이 너무 뻔한지 걱정됩니다',
    content_preview: {
      scene_heading: 'S#12 옥상',
      scene_location: '건물 옥상',
      scene_time: '폭우가 내리는 밤',
      dialogues: [
        { character_name: '탐정 K', character_color: '#7B2D8B', text: '당신이 진범이군요. 처음부터 알고 있었습니다.' },
        { character_name: '용의자 이씨', character_color: '#555555', text: '어떻게... 어떻게 알았죠?' },
        { character_name: '탐정 K', character_color: '#7B2D8B', text: '담배 연기 냄새요. 당신만 실내에서 담배를 피웠으니까.' },
      ],
    },
    full_content: {
      type: 'plot',
      scenes: [
        {
          scene_heading: 'S#12 옥상',
          scene_location: '건물 옥상',
          scene_time: '폭우가 내리는 밤',
          blocks: [
            { type: 'narration', text: '폭우가 쏟아지는 밤. 건물 옥상. 탐정 K와 용의자 이씨가 마주 선다.' },
            { type: 'dialogue', character_name: '탐정 K', character_color: '#7B2D8B', text: '당신이 진범이군요. 처음부터 알고 있었습니다.' },
            { type: 'dialogue', character_name: '용의자 이씨', character_color: '#555555', text: '어떻게... 어떻게 알았죠?' },
            { type: 'dialogue', character_name: '탐정 K', character_color: '#7B2D8B', text: '담배 연기 냄새요. 당신만 실내에서 담배를 피웠으니까.' },
            { type: 'stage_direction', text: '이씨, 뒷걸음질친다. K, 천천히 다가선다.' },
            { type: 'dialogue', character_name: '탐정 K', character_color: '#7B2D8B', text: '3월 7일 밤, 당신은 사무실에 없었습니다. 하지만 창문 너머 담배 냄새는 당신 것이었죠.' },
            { type: 'narration', text: '이씨의 얼굴에서 마지막 가면이 무너진다.' },
            { type: 'dialogue', character_name: '용의자 이씨', character_color: '#555555', text: '그 여자가 먼저...' },
            { type: 'dialogue', character_name: '탐정 K', character_color: '#7B2D8B', text: '진실은 법정에서 말하세요.' },
          ],
        },
        {
          scene_heading: 'S#13 해결',
          scene_location: '경찰서',
          scene_time: '다음 날 아침',
          blocks: [
            { type: 'stage_direction', text: '다음 날 아침. 경찰서. K, 보고서를 작성한다.' },
            { type: 'narration', text: '또 하나의 사건이 끝났다. 그러나 탐정 K는 안다—진실이 항상 정의를 가져오지는 않는다는 것을.' },
          ],
        },
      ],
    },
    tags: ['추리', '스릴러', '반전'],
    view_count: 891,
    like_count: 203,
    comment_count: 18,
  },

  // ── 5. 달의 노래 (plot) ──────────────────────────────────────────────────
  {
    id: 5,
    work_type: 'plot',
    author_name: '정수아',
    author_color: '#B5451B',
    created_at: '1주일 전',
    work_title: '달의 노래',
    episode_title: 'EP 1 만남',
    post_title: '전통 설화 기반 세계관 공유',
    description: '한국 전통 설화를 현대적으로 재해석했어요',
    content_preview: {
      scene_heading: 'S#2 달빛 아래',
      scene_location: '고즈넉한 한옥 마당',
      scene_time: '보름달 뜨는 밤',
      dialogues: [
        { character_name: '달래', character_color: '#B5451B', text: '당신은... 사람이 아니지요?' },
        { character_name: '월하', character_color: '#C0C0C0', text: '달빛이 닿는 곳은 모두 내 세계입니다.' },
      ],
    },
    full_content: {
      type: 'plot',
      scenes: [
        {
          scene_heading: 'S#2 달빛 아래',
          scene_location: '고즈넉한 한옥 마당',
          scene_time: '보름달 뜨는 밤',
          blocks: [
            { type: 'narration', text: '보름달이 뜬 밤. 한옥 마당. 달빛이 마당 가득 흘러내린다.' },
            { type: 'dialogue', character_name: '달래', character_color: '#B5451B', text: '당신은... 사람이 아니지요?' },
            { type: 'dialogue', character_name: '월하', character_color: '#C0C0C0', text: '달빛이 닿는 곳은 모두 내 세계입니다.' },
            { type: 'narration', text: '달래는 두렵지 않다. 이상하게도, 전혀 두렵지 않다.' },
            { type: 'dialogue', character_name: '달래', character_color: '#B5451B', text: '왜 나에게 나타난 거예요?' },
            { type: 'dialogue', character_name: '월하', character_color: '#C0C0C0', text: '당신이 불렀습니다. 백 년 전부터, 당신의 전생이.' },
            { type: 'stage_direction', text: '달빛이 더욱 밝아진다. 달래의 그림자가 두 개가 된다.' },
          ],
        },
        {
          scene_heading: 'S#3 기억',
          scene_location: '한옥 마당, 조금 후',
          scene_time: '같은 밤',
          blocks: [
            { type: 'narration', text: '달래의 눈앞에 낯선 기억들이 펼쳐진다. 조선의 어느 밤, 누군가 달을 향해 빌었다.' },
            { type: 'dialogue', character_name: '달래', character_color: '#B5451B', text: '저 기억이... 제 건가요?' },
            { type: 'dialogue', character_name: '월하', character_color: '#C0C0C0', text: '당신이 기억하지 않아도, 달은 기억합니다.' },
          ],
        },
      ],
    },
    tags: ['판타지', '전통', '설화'],
    view_count: 673,
    like_count: 154,
    comment_count: 9,
  },

  // ── 6. 폭풍 속으로 (plot) ────────────────────────────────────────────────
  {
    id: 6,
    work_type: 'plot',
    author_name: '한도현',
    author_color: '#1A5276',
    created_at: '2주일 전',
    work_title: '폭풍 속으로',
    episode_title: 'EP 4 대립',
    post_title: '대립 구도 플롯 초안',
    description: '가족 내 갈등을 메인 플롯으로 설정했습니다',
    content_preview: {
      scene_heading: 'S#9 거실',
      scene_location: '가족 거실',
      scene_time: '저녁 식사 후',
      dialogues: [
        { character_name: '아버지', character_color: '#1A5276', text: '넌 항상 네 방식대로만 하려고 해!' },
        { character_name: '민재', character_color: '#2E86AB', text: '아버지 방식이 틀렸다면요?' },
        { character_name: '어머니', character_color: '#E69BAC', text: '제발, 제발 그만해요 둘 다.' },
      ],
    },
    full_content: {
      type: 'plot',
      scenes: [
        {
          scene_heading: 'S#9 거실',
          scene_location: '가족 거실',
          scene_time: '저녁 식사 후',
          blocks: [
            { type: 'narration', text: '저녁 식사 후. 거실. 오래된 갈등이 다시 불붙는다.' },
            { type: 'dialogue', character_name: '아버지', character_color: '#1A5276', text: '넌 항상 네 방식대로만 하려고 해!' },
            { type: 'dialogue', character_name: '민재', character_color: '#2E86AB', text: '아버지 방식이 틀렸다면요?' },
            { type: 'dialogue', character_name: '어머니', character_color: '#E69BAC', text: '제발, 제발 그만해요 둘 다.' },
            { type: 'stage_direction', text: '민재, 자리에서 일어선다. 아버지와 눈이 마주친다.' },
            { type: 'dialogue', character_name: '아버지', character_color: '#1A5276', text: '이 집에서 내 말이 법이야. 항상 그래왔어.' },
            { type: 'dialogue', character_name: '민재', character_color: '#2E86AB', text: '그래서 엄마가 30년을 이렇게 사셨잖아요.' },
            { type: 'narration', text: '정적. 어머니의 손이 살짝 떨린다.' },
          ],
        },
        {
          scene_heading: 'S#10 방문 앞',
          scene_location: '복도',
          scene_time: '같은 밤, 조금 후',
          blocks: [
            { type: 'stage_direction', text: '복도. 민재, 방문 앞에서 멈춘다. 어머니가 뒤따라온다.' },
            { type: 'dialogue', character_name: '어머니', character_color: '#E69BAC', text: '아버지도... 힘드신 거야.' },
            { type: 'dialogue', character_name: '민재', character_color: '#2E86AB', text: '알아요. 그래서 더 화가 나요.' },
            { type: 'narration', text: '어머니가 아들의 등을 쓸어내린다. 말없이.' },
          ],
        },
      ],
    },
    tags: ['가족극', '드라마', '갈등'],
    view_count: 289,
    like_count: 67,
    comment_count: 4,
  },

  // ── 7. 서울의 겨울 (novel) ───────────────────────────────────────────────
  {
    id: 7,
    work_type: 'novel',
    author_name: '윤지호',
    author_color: '#4A7C59',
    created_at: '4일 전',
    work_title: '서울의 겨울',
    episode_title: 'Chapter 2 낯선 방',
    post_title: '도시 고독 소설 챕터 공유',
    description: '서울 이주민의 내면을 담은 소설입니다',
    content_preview: {
      chapter_title: 'Chapter 2 낯선 방',
      excerpt: '이사한 지 사흘이 지났지만, 방은 아직도 낯설었다. 상자에서 꺼내지 않은 물건들이 벽을 따라 줄지어 있었고...',
    },
    full_content: {
      type: 'novel',
      chapter_title: 'Chapter 2 낯선 방',
      paragraphs: [
        '이사한 지 사흘이 지났지만, 방은 아직도 낯설었다. 상자에서 꺼내지 않은 물건들이 벽을 따라 줄지어 있었고, 민수는 그것들을 볼 때마다 이 공간이 자신의 것이 아닌 듯한 기분이 들었다.',
        '창문 너머로 서울의 밤이 펼쳐져 있었다. 수백만 개의 불빛. 그러나 그 누구도 민수를 알지 못했다. 이 도시에서 민수는 그저 또 하나의 이름 없는 숫자였다.',
        '핸드폰에 메시지 하나가 도착했다. 본가에서 어머니였다. "밥은 먹었니?" 세 글자. 민수는 한참을 그 문자를 바라보다가 답장을 보냈다. "네."',
        '그가 먹은 것은 편의점 삼각김밥 하나였다. 하지만 그것은 중요하지 않았다. 어머니에게도, 민수 자신에게도.',
        '자정이 넘어서야 민수는 침낭을 펴고 바닥에 누웠다. 침대를 조립할 힘이 없었다. 천장을 바라보며 그는 생각했다—여기서 잘 살 수 있을까, 라고. 서울은 그런 질문에 답해주지 않았다.',
        '다음 날 아침, 그는 처음으로 동네 카페에 들어갔다. 아메리카노 하나를 시키고 창가에 앉았다. 창밖으로 사람들이 분주히 지나쳤다. 모두 어딘가로 가고 있었다. 민수도 어딘가로 가야 했다. 단지 그곳이 어디인지를 아직 모를 뿐이었다.',
      ],
    },
    tags: ['소설', '현대', '도시'],
    view_count: 412,
    like_count: 91,
    comment_count: 7,
  },

  // ── 8. 숲의 끝에서 (novel) ───────────────────────────────────────────────
  {
    id: 8,
    work_type: 'novel',
    author_name: '오세현',
    author_color: '#6B3A7D',
    created_at: '6일 전',
    work_title: '숲의 끝에서',
    episode_title: 'Chapter 1 들어가기 전에',
    post_title: '판타지 소설 세계관 초안 공유',
    description: '마법이 사라진 세계의 마지막 마법사 이야기',
    content_preview: {
      chapter_title: 'Chapter 1 들어가기 전에',
      excerpt: '마법이 세상에서 사라진 것은 내가 태어나기 삼백 년 전의 일이라고 했다. 그러나 나는 마법을 쓸 수 있었다...',
    },
    full_content: {
      type: 'novel',
      chapter_title: 'Chapter 1 들어가기 전에',
      paragraphs: [
        '마법이 세상에서 사라진 것은 내가 태어나기 삼백 년 전의 일이라고 했다. 그러나 나는 마법을 쓸 수 있었다. 그것이 문제의 시작이었다.',
        '열두 살 때 처음 불꽃을 만들었다. 손바닥 위에서 작은 불씨가 피어올랐을 때, 나는 그것이 무엇인지 몰랐다. 마법이라는 단어를 알고 있었지만, 마법은 전설 속 이야기였다. 책에서나 읽는 것이었다.',
        '어머니는 그날 이후 나를 다르게 바라보기 시작했다. 두려움이었다. 사랑하는 사람의 눈에서 처음으로 두려움을 읽은 날을, 나는 잊을 수 없다.',
        '마을 사람들이 알게 되는 데는 오래 걸리지 않았다. 비밀이란 오래가지 못하는 법이다. 그들은 나를 "마지막 마법사"라고 불렀다. 경이로움 반, 경계심 반. 아이들은 몰래 나를 훔쳐보았고, 어른들은 드러내놓고 나를 피했다.',
        '나는 열여섯 살에 마을을 떠났다. 스스로 선택한 일이었다. 아니, 어쩌면 선택이 아니었을지도 모른다. 떠나지 않았다면 더 나쁜 일이 생겼을 것이다.',
        '숲의 끝에 다다랐을 때, 나는 처음으로 혼자라는 것을 실감했다. 나무들이 하늘을 가리고, 바람이 낙엽을 몰았다. 세상은 넓었고, 나는 작았다. 그러나 손바닥 위의 불꽃은 여전히 타오르고 있었다.',
      ],
    },
    tags: ['소설', '판타지', '세계관'],
    view_count: 538,
    like_count: 142,
    comment_count: 13,
  },
];

// ── Dummy comments ────────────────────────────────────────────────────────────

export const DUMMY_COMMENTS: Comment[] = [
  // Post 1
  { id: 1, post_id: 1, author_name: '이현우', author_color: '#1B4FAD', text: '브론스키의 갈등이 인상적이에요! 대사 한 줄로 심리를 잘 표현했네요.', created_at: '1일 전', like_count: 12 },
  { id: 2, post_id: 1, author_name: '박지현', author_color: '#2D6A4F', text: '안나의 마지막 대사가 특히 좋았어요. 사교계 장면 분위기가 살아있어요.', created_at: '1일 전', like_count: 3 },
  // Post 2
  { id: 3, post_id: 2, author_name: '김소연', author_color: '#AD1B02', text: '메피스토의 "제가 이루어 드리지요"가 섬뜩하면서도 매력적이에요.', created_at: '2일 전', like_count: 8 },
  { id: 4, post_id: 2, author_name: '정수아', author_color: '#B5451B', text: '파우스트의 욕망이 대사에 잘 드러나네요. 자정 배경도 분위기 있어요!', created_at: '3일 전', like_count: 15 },
  { id: 5, post_id: 2, author_name: '최민준', author_color: '#7B2D8B', text: '계약 장면 긴장감이 대단해요. 이후 전개가 기대됩니다.', created_at: '3일 전', like_count: 6 },
  { id: 6, post_id: 2, author_name: '한도현', author_color: '#1A5276', text: '철학적 주제를 대사로 녹여낸 게 탁월합니다!', created_at: '4일 전', like_count: 9 },
  { id: 7, post_id: 2, author_name: '이현우', author_color: '#1B4FAD', text: '기대 이상입니다. 판타지 장르에서 이런 무게감은 보기 드물어요.', created_at: '4일 전', like_count: 21 },
  // Post 3
  { id: 8, post_id: 3, author_name: '김소연', author_color: '#AD1B02', text: '침묵 "..."이 정말 많은 것을 말하네요. 감정선이 너무 좋아요.', created_at: '4일 전', like_count: 24 },
  { id: 9, post_id: 3, author_name: '최민준', author_color: '#7B2D8B', text: '"그래도 돼요?" 반복이 하은의 심리를 완벽하게 표현해요.', created_at: '5일 전', like_count: 17 },
  // Post 4
  { id: 10, post_id: 4, author_name: '박지현', author_color: '#2D6A4F', text: '담배 단서가 너무 설득력 있어요! 반전이 납득이 가요.', created_at: '6일 전', like_count: 34 },
  { id: 11, post_id: 4, author_name: '정수아', author_color: '#B5451B', text: '폭우 배경이 긴장감을 더해줘요. 탐정 장르의 정수!', created_at: '7일 전', like_count: 19 },
  // Post 5
  { id: 12, post_id: 5, author_name: '한도현', author_color: '#1A5276', text: '한국 설화 소재라 더 정감 있어요. 달래라는 이름도 너무 예쁘네요.', created_at: '1주일 전', like_count: 28 },
  // Post 6
  { id: 13, post_id: 6, author_name: '이현우', author_color: '#1B4FAD', text: '가족 갈등 대사가 현실적이에요. 공감이 많이 돼요.', created_at: '2주일 전', like_count: 11 },
  { id: 14, post_id: 6, author_name: '김소연', author_color: '#AD1B02', text: '어머니 대사가 가슴 아프네요. 중재자 역할이 잘 표현됐어요.', created_at: '2주일 전', like_count: 7 },
  // Post 7
  { id: 15, post_id: 7, author_name: '한도현', author_color: '#1A5276', text: '서울 이주민의 감정이 너무 생생하게 느껴져요. 삼각김밥 장면이 인상적이에요.', created_at: '3일 전', like_count: 18 },
  { id: 16, post_id: 7, author_name: '박지현', author_color: '#2D6A4F', text: '카페 장면 마무리가 여운이 남아요. 다음 챕터가 기대됩니다.', created_at: '4일 전', like_count: 9 },
  // Post 8
  { id: 17, post_id: 8, author_name: '정수아', author_color: '#B5451B', text: '마지막 마법사라는 설정이 너무 흥미로워요. 세계관이 탄탄하게 느껴져요.', created_at: '5일 전', like_count: 22 },
  { id: 18, post_id: 8, author_name: '이현우', author_color: '#1B4FAD', text: '"사랑하는 사람의 눈에서 처음으로 두려움을 읽은 날" — 이 문장이 너무 좋아요.', created_at: '6일 전', like_count: 31 },
];
