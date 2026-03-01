export interface PostDialogue {
  character_name: string;
  character_color: string;
  text: string;
}

export interface PostContentPreview {
  scene_heading: string;
  scene_location: string;
  scene_time: string;
  dialogues: PostDialogue[];
}

export interface Post {
  id: number;
  author_name: string;
  author_color: string;
  created_at: string;
  work_title: string;
  episode_title: string;
  post_title: string;
  description: string;
  content_preview: PostContentPreview;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
}

export interface Comment {
  id: number;
  post_id: number;
  author_name: string;
  author_color: string;
  text: string;
  created_at: string;
  like_count: number;
}

export const DUMMY_POSTS: Post[] = [
  {
    id: 1,
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
    tags: ['희곡', '로맨스', '플롯'],
    view_count: 364,
    like_count: 83,
    comment_count: 2,
  },
  {
    id: 2,
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
    tags: ['희곡', '판타지', '철학'],
    view_count: 218,
    like_count: 45,
    comment_count: 5,
  },
  {
    id: 3,
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
    tags: ['현대극', '멜로', '청춘'],
    view_count: 502,
    like_count: 127,
    comment_count: 11,
  },
  {
    id: 4,
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
    tags: ['추리', '스릴러', '반전'],
    view_count: 891,
    like_count: 203,
    comment_count: 18,
  },
  {
    id: 5,
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
    tags: ['판타지', '전통', '설화'],
    view_count: 673,
    like_count: 154,
    comment_count: 9,
  },
  {
    id: 6,
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
    tags: ['가족극', '드라마', '갈등'],
    view_count: 289,
    like_count: 67,
    comment_count: 4,
  },
];

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
];
